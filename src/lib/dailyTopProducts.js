import { query, isSchemaChecked, markSchemaChecked } from '@/lib/db';

/**
 * Ensure daily_top_products table exists in MySQL
 */
export async function ensureDailyTopProductsTable() {
  if (isSchemaChecked('daily_top_products')) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS daily_top_products (
        id VARCHAR(100) PRIMARY KEY,
        sale_date DATE NOT NULL,
        branch_id VARCHAR(100) NOT NULL DEFAULT 'b1',
        product_name VARCHAR(255) NOT NULL,
        total_qty DECIMAL(10, 2) NOT NULL DEFAULT 0,
        total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_date_branch_product (sale_date, branch_id, product_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err) {
    console.error('Failed to create daily_top_products table:', err);
  }
  markSchemaChecked('daily_top_products');
}

/**
 * Snapshot/Sync daily product sales from orders into daily_top_products
 * This guarantees the data stays in the database and is never lost.
 */
export async function syncDailyTopProducts(targetDate = null, targetBranch = null) {
  try {
    await ensureDailyTopProductsTable();
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    let whereClause = 'WHERE DATE(o.created_at) = $1';
    const params = [dateStr];

    if (targetBranch && targetBranch !== 'all') {
      whereClause += ` AND o.branch_id = $2`;
      params.push(targetBranch);
    }

    // Aggregate product sales from current orders
    const salesRes = await query(
      `SELECT 
         COALESCE(o.branch_id, 'b1') as branch_id,
         oi.product_name,
         SUM(oi.quantity) as total_qty,
         SUM(oi.price * oi.quantity) as total_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       ${whereClause}
       GROUP BY o.branch_id, oi.product_name`,
      params
    );

    const rows = salesRes.rows || [];
    for (const row of rows) {
      const pName = row.product_name;
      const bId = row.branch_id || (targetBranch && targetBranch !== 'all' ? targetBranch : 'b1');
      const qty = parseFloat(row.total_qty) || 0;
      const rev = parseFloat(row.total_revenue) || 0;
      const recordId = `dtp_${dateStr}_${bId}_${encodeURIComponent(pName)}`.slice(0, 95);

      await query(
        `INSERT INTO daily_top_products (id, sale_date, branch_id, product_name, total_qty, total_revenue)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON DUPLICATE KEY UPDATE 
           total_qty = VALUES(total_qty),
           total_revenue = VALUES(total_revenue),
           updated_at = CURRENT_TIMESTAMP`,
        [recordId, dateStr, bId, pName, qty, rev]
      );
    }

    return true;
  } catch (err) {
    console.error('syncDailyTopProducts error:', err);
    return false;
  }
}

/**
 * Fetch top products for a specific date / branch from daily_top_products table
 */
export async function getStoredDailyTopProducts(targetDate = null, targetBranch = null, limit = 1000) {
  try {
    await ensureDailyTopProductsTable();
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    // First attempt to sync in case there were recent orders
    await syncDailyTopProducts(dateStr, targetBranch);

    let whereClause = 'WHERE sale_date = $1';
    const params = [dateStr];

    if (targetBranch && targetBranch !== 'all') {
      whereClause += ' AND branch_id = $2';
      params.push(targetBranch);
    }

    const sql = `
      SELECT 
        product_name,
        SUM(total_qty) as total_qty,
        SUM(total_revenue) as total_revenue
      FROM daily_top_products
      ${whereClause}
      GROUP BY product_name
      ORDER BY total_qty DESC
      LIMIT ${parseInt(limit) || 1000}
    `;

    const res = await query(sql, params);
    return (res.rows || []).map(r => ({
      product_name: r.product_name,
      name: r.product_name,
      total_qty: parseFloat(r.total_qty || 0),
      totalQty: parseFloat(r.total_qty || 0),
      total_revenue: parseFloat(r.total_revenue || 0),
      totalRevenue: parseFloat(r.total_revenue || 0),
    }));
  } catch (err) {
    console.error('getStoredDailyTopProducts error:', err);
    return [];
  }
}
