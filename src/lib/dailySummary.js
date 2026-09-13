import { query, isSchemaChecked, markSchemaChecked } from './db.js';

/**
 * Ensure daily_summaries table exists in MySQL
 * جدول الملخصات اليومية — يحفظ إجمالي كل يوم قبل تصفير الطلبات
 */
export async function ensureDailySummariesTable() {
  if (isSchemaChecked('daily_summaries')) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS daily_summaries (
        id VARCHAR(100) PRIMARY KEY,
        summary_date DATE NOT NULL,
        branch_id VARCHAR(100) NOT NULL DEFAULT 'b1',
        total_orders INT DEFAULT 0,
        total_sales DECIMAL(12,2) DEFAULT 0,
        cash_total DECIMAL(12,2) DEFAULT 0,
        visa_total DECIMAL(12,2) DEFAULT 0,
        delivery_count INT DEFAULT 0,
        delivery_fees_total DECIMAL(12,2) DEFAULT 0,
        dine_in_count INT DEFAULT 0,
        takeaway_count INT DEFAULT 0,
        total_discounts DECIMAL(12,2) DEFAULT 0,
        top_products_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_date_branch (summary_date, branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) {
    console.error('Failed to create daily_summaries table:', err);
  }
  markSchemaChecked('daily_summaries');
}

/**
 * Save daily summary for a specific date and branch
 * حفظ ملخص يوم معين — يُستدعى قبل تصفير الطلبات
 */
export async function saveDailySummary(targetDate, branchId = 'all') {
  try {
    await ensureDailySummariesTable();
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    // If branchId is 'all', save summaries for each branch separately
    if (!branchId || branchId === 'all') {
      const branchesRes = await query('SELECT DISTINCT branch_id FROM orders WHERE DATE(created_at) = $1', [dateStr]);
      const branchIds = (branchesRes.rows || []).map(r => r.branch_id).filter(Boolean);
      
      if (branchIds.length === 0) return { saved: 0, message: 'لا توجد طلبات لحفظها' };
      
      let savedCount = 0;
      for (const bId of branchIds) {
        const result = await saveSingleBranchSummary(dateStr, bId);
        if (result) savedCount++;
      }
      return { saved: savedCount, message: `تم حفظ ملخص ${savedCount} فرع` };
    }

    const result = await saveSingleBranchSummary(dateStr, branchId);
    return result ? { saved: 1, message: 'تم حفظ الملخص بنجاح' } : { saved: 0, message: 'لا توجد طلبات لحفظها' };
  } catch (err) {
    console.error('saveDailySummary error:', err);
    return { saved: 0, error: err.message };
  }
}

async function saveSingleBranchSummary(dateStr, branchId) {
  const bId = branchId || 'b1';

  // Aggregate order stats for the date+branch
  const statsRes = await query(
    `SELECT
       COUNT(*) as total_orders,
       COALESCE(SUM(total), 0) as total_sales,
       COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_total,
       COALESCE(SUM(CASE WHEN payment_method = 'visa' THEN total ELSE 0 END), 0) as visa_total,
       SUM(CASE WHEN order_type = 'delivery' THEN 1 ELSE 0 END) as delivery_count,
       COALESCE(SUM(delivery_fee), 0) as delivery_fees_total,
       SUM(CASE WHEN order_type = 'dine_in' THEN 1 ELSE 0 END) as dine_in_count,
       SUM(CASE WHEN order_type = 'takeaway' THEN 1 ELSE 0 END) as takeaway_count,
       COALESCE(SUM(discount), 0) as total_discounts
     FROM orders
     WHERE DATE_FORMAT(created_at, '%Y-%m-%d') = $1 AND branch_id = $2`,
    [dateStr, bId]
  );

  const stats = statsRes.rows?.[0];
  if (!stats || parseInt(stats.total_orders) === 0) return false;

  // Get top products for the day
  const topRes = await query(
    `SELECT oi.product_name, SUM(oi.quantity) as total_qty,
            SUM(oi.price * oi.quantity) as total_revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE DATE_FORMAT(o.created_at, '%Y-%m-%d') = $1 AND o.branch_id = $2
     GROUP BY oi.product_name
     ORDER BY total_qty DESC
     LIMIT 50`,
    [dateStr, bId]
  );

  const topProducts = (topRes.rows || []).map(r => ({
    name: r.product_name,
    qty: parseFloat(r.total_qty) || 0,
    revenue: parseFloat(r.total_revenue) || 0
  }));

  const recordId = `ds_${dateStr}_${bId}`;

  await query(
    `INSERT INTO daily_summaries (id, summary_date, branch_id, total_orders, total_sales, cash_total, visa_total,
       delivery_count, delivery_fees_total, dine_in_count, takeaway_count, total_discounts, top_products_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON DUPLICATE KEY UPDATE
       total_orders = VALUES(total_orders),
       total_sales = VALUES(total_sales),
       cash_total = VALUES(cash_total),
       visa_total = VALUES(visa_total),
       delivery_count = VALUES(delivery_count),
       delivery_fees_total = VALUES(delivery_fees_total),
       dine_in_count = VALUES(dine_in_count),
       takeaway_count = VALUES(takeaway_count),
       total_discounts = VALUES(total_discounts),
       top_products_json = VALUES(top_products_json)`,
    [recordId, dateStr, bId, parseInt(stats.total_orders), parseFloat(stats.total_sales),
     parseFloat(stats.cash_total), parseFloat(stats.visa_total), parseInt(stats.delivery_count),
     parseFloat(stats.delivery_fees_total), parseInt(stats.dine_in_count), parseInt(stats.takeaway_count),
     parseFloat(stats.total_discounts), JSON.stringify(topProducts)]
  );

  return true;
}

/**
 * Delete old orders for a specific date (after summary is saved)
 * حذف طلبات يوم معين بعد حفظ الملخص
 */
export async function deleteOrdersForDate(targetDate, branchId = 'all') {
  try {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    
    let whereClause = "WHERE DATE_FORMAT(created_at, '%Y-%m-%d') = $1 AND (shift_id IS NULL OR shift_id NOT IN (SELECT id FROM shifts WHERE status = 'active')) AND created_at < COALESCE((SELECT MIN(start_time) FROM shifts WHERE status = 'active'), NOW())";
    const params = [dateStr];

    if (branchId && branchId !== 'all') {
      whereClause += ' AND branch_id = $2';
      params.push(branchId);
    }

    // Delete order_items first (foreign key)
    await query(
      `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders ${whereClause})`,
      params
    );

    // Delete orders
    const result = await query(`DELETE FROM orders ${whereClause}`, params);
    
    return { deleted: result.rowCount || 0 };
  } catch (err) {
    console.error('deleteOrdersForDate error:', err);
    return { deleted: 0, error: err.message };
  }
}

/**
 * Delete summaries older than N days
 * حذف الملخصات اللي عدى عليها عدد أيام معين
 */
export async function deleteSummariesOlderThan(days = 5) {
  try {
    await ensureDailySummariesTable();
    const result = await query(
      `DELETE FROM daily_summaries WHERE summary_date < DATE_SUB(CURDATE(), INTERVAL $1 DAY)`,
      [days]
    );
    return { deleted: result.rowCount || 0 };
  } catch (err) {
    console.error('deleteSummariesOlderThan error:', err);
    return { deleted: 0, error: err.message };
  }
}

/**
 * Get daily summaries list
 * جلب سجل الملخصات اليومية
 */
export async function getDailySummaries(branchId = 'all', limit = 30) {
  try {
    await ensureDailySummariesTable();

    let whereClause = '';
    const params = [];

    if (branchId && branchId !== 'all') {
      whereClause = 'WHERE branch_id = $1';
      params.push(branchId);
    }

    params.push(parseInt(limit) || 30);
    const limitIdx = params.length;

    const res = await query(
      `SELECT *, DATE_FORMAT(summary_date, '%Y-%m-%d') as summary_date_formatted FROM daily_summaries ${whereClause} ORDER BY summary_date DESC LIMIT $${limitIdx}`,
      params
    );

    return (res.rows || []).map(r => ({
      ...r,
      summary_date: r.summary_date_formatted || r.summary_date,
      total_sales: parseFloat(r.total_sales) || 0,
      cash_total: parseFloat(r.cash_total) || 0,
      visa_total: parseFloat(r.visa_total) || 0,
      delivery_fees_total: parseFloat(r.delivery_fees_total) || 0,
      total_discounts: parseFloat(r.total_discounts) || 0,
      top_products: (() => { try { return JSON.parse(r.top_products_json || '[]'); } catch { return []; } })()
    }));
  } catch (err) {
    console.error('getDailySummaries error:', err);
    return [];
  }
}

/**
 * Get distinct dates that have orders (excluding today)
 * جلب الأيام اللي فيها طلبات قديمة (غير اليوم)
 */
export async function getOldOrderDates() {
  try {
    const res = await query(
      `SELECT DISTINCT DATE_FORMAT(created_at, '%Y-%m-%d') as order_date, COUNT(*) as order_count
       FROM orders
       WHERE DATE(created_at) < CURDATE()
         AND (shift_id IS NULL OR shift_id NOT IN (SELECT id FROM shifts WHERE status = 'active'))
         AND created_at < COALESCE((SELECT MIN(start_time) FROM shifts WHERE status = 'active'), NOW())
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
       ORDER BY order_date DESC`
    );
    return (res.rows || []).map(r => ({
      order_date: String(r.order_date),
      order_count: parseInt(r.order_count) || 0
    }));
  } catch (err) {
    console.error('getOldOrderDates error:', err);
    return [];
  }
}
