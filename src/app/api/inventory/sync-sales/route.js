import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    let body = {};
    try { body = await request.json(); } catch (e) { }
    const targetBranchId = body.branch_id || body.branchId || null;

    // 1. Fetch all ingredients
    const ingRes = await query(`
      SELECT pi.product_id, pi.inventory_item_id, pi.quantity, pi.size, COALESCE(pi.auto_deduct, 1) AS auto_deduct,
             inv.name AS inv_name
      FROM product_ingredients pi
      LEFT JOIN inventory_items inv ON pi.inventory_item_id = inv.id
    `);
    const allIngredients = ingRes.rows || [];

    const NON_DEDUCTIBLE_KEYWORDS = [
      'بطاطس', 'بطاطا',
      'روزبيف', 'روست',
      'سلامى', 'سلامي',
      'سوسيس', 'سويسويس', 'هوت دوج',
      'تركى', 'تركي',
      'بسطرمة', 'بسكرمه', 'بسترمة',
      'مشروم', 'فطر',
      'شيدر'
    ];

    // 2. Fetch all products to know has_sizes
    const prodRes = await query('SELECT id, has_sizes FROM products');
    const prodHasSizesMap = {};
    (prodRes.rows || []).forEach(p => {
      prodHasSizesMap[p.id] = p.has_sizes === 1 || p.has_sizes === true;
    });

    // 3. Fetch all completed order items with branch_id
    let orderItemsSql = `
      SELECT oi.product_id, oi.product_name, oi.size, oi.quantity, o.branch_id
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
    `;
    const params = [];
    if (targetBranchId && targetBranchId !== 'all') {
      orderItemsSql += ` AND o.branch_id = $1`;
      params.push(targetBranchId);
    }
    const orderItemsRes = await query(orderItemsSql, params);
    const orderItems = orderItemsRes.rows || [];

    // 4. Calculate total consumption per branch and per raw item
    // consumptionMap[branch_id][inventory_item_id] = total_consumed
    const consumptionMap = {};

    orderItems.forEach(item => {
      const bId = item.branch_id || 'b1';
      if (!consumptionMap[bId]) consumptionMap[bId] = {};

      const itemQty = parseInt(item.quantity || 1, 10) || 1;
      let prodId = item.product_id;
      let baseProdId = prodId;

      if (baseProdId && (baseProdId.endsWith('_صغير') || baseProdId.endsWith('_كبير'))) {
        baseProdId = baseProdId.replace(/_(صغير|كبير)$/, '');
      }
      if (baseProdId && /^.+_\d{13,}$/.test(baseProdId)) {
        baseProdId = baseProdId.replace(/_\d{13,}$/, '');
      }

      let detectedSize = (item.size || '').toString().trim();
      if (!detectedSize) {
        const itemText = `${item.product_name || ''} ${prodId || ''}`;
        if (itemText.includes('صغير')) detectedSize = 'صغير';
        else if (itemText.includes('كبير')) detectedSize = 'كبير';
      }
      const itemSize = detectedSize.toLowerCase();

      // Find matching ingredients for this product
      const matchingIngs = allIngredients.filter(ing => 
        ing.product_id === baseProdId || ing.product_id === prodId
      );

      const hasMultipleSizes = prodHasSizesMap[baseProdId] || false;

      matchingIngs.forEach(ing => {
        const invName = (ing.inv_name || '').toLowerCase();
        const isExplicitlyNonDeductible = NON_DEDUCTIBLE_KEYWORDS.some(kw => invName.includes(kw));
        const isAutoDeduct = !isExplicitlyNonDeductible && ing.auto_deduct !== 0 && ing.auto_deduct !== '0' && ing.auto_deduct !== false;

        if (!isAutoDeduct) return; // Skip non-deductible

        const ingSize = (ing.size || 'all').toString().trim().toLowerCase();
        const matchesSize = !hasMultipleSizes || ingSize === 'all' || ingSize === 'عادي' ||
          ingSize === itemSize ||
          (itemSize.includes('صغير') && (ingSize.includes('صغير') || ingSize === 'small')) ||
          (itemSize.includes('كبير') && (ingSize.includes('كبير') || ingSize === 'large')) ||
          (!itemSize && ingSize === 'all');

        if (!matchesSize) return;

        const deductQty = (parseFloat(ing.quantity) || 0) * itemQty;
        if (!consumptionMap[bId][ing.inventory_item_id]) {
          consumptionMap[bId][ing.inventory_item_id] = 0;
        }
        consumptionMap[bId][ing.inventory_item_id] += deductQty;
      });
    });

    // 5. Fetch total transferred in per branch and per item from inventory_transfers
    const transferInRes = await query(`
      SELECT to_branch_id, item_id, SUM(quantity) AS total_transferred_in
      FROM inventory_transfers
      WHERE status = 'completed'
      GROUP BY to_branch_id, item_id
    `);
    const transfersInMap = {};
    (transferInRes.rows || []).forEach(t => {
      if (!transfersInMap[t.to_branch_id]) transfersInMap[t.to_branch_id] = {};
      transfersInMap[t.to_branch_id][t.item_id] = parseFloat(t.total_transferred_in || 0);
    });

    // Also check transfers out of a branch
    const transferOutRes = await query(`
      SELECT from_branch_id, item_id, SUM(quantity) AS total_transferred_out
      FROM inventory_transfers
      WHERE status = 'completed'
      GROUP BY from_branch_id, item_id
    `);
    const transfersOutMap = {};
    (transferOutRes.rows || []).forEach(t => {
      if (!transfersOutMap[t.from_branch_id]) transfersOutMap[t.from_branch_id] = {};
      transfersOutMap[t.from_branch_id][t.item_id] = parseFloat(t.total_transferred_out || 0);
    });

    // 6. For each branch and item, calculate Net Balance = Total Received - Total Transferred Out - Total Consumed in Sales
    const branchesToUpdate = targetBranchId && targetBranchId !== 'all' ? [targetBranchId] : ['b1', 'b2'];
    const syncResults = [];

    // Fetch all inventory items
    const invItemsRes = await query('SELECT id, name, unit FROM inventory_items');
    const invItemsList = invItemsRes.rows || [];

    for (const bId of branchesToUpdate) {
      if (bId === 'b_main') continue;

      for (const item of invItemsList) {
        const transferredIn = (transfersInMap[bId] && transfersInMap[bId][item.id]) || 0;
        const transferredOut = (transfersOutMap[bId] && transfersOutMap[bId][item.id]) || 0;
        const consumedInSales = (consumptionMap[bId] && consumptionMap[bId][item.id]) || 0;

        // If there has been any transfer or sales consumption for this item in this branch:
        if (transferredIn > 0 || consumedInSales > 0 || transferredOut > 0) {
          const finalStock = transferredIn - transferredOut - consumedInSales;

          await query(`
            INSERT INTO inventory_branch_stock (id, item_id, branch_id, current_stock)
            VALUES ($1, $2, $3, $4)
            ON DUPLICATE KEY UPDATE current_stock = $4
          `, [`obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, item.id, bId, finalStock]);

          syncResults.push({
            branch_id: bId,
            item_name: item.name,
            transferred_in: transferredIn,
            consumed_in_sales: consumedInSales,
            final_stock: finalStock,
            unit: item.unit
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تمت مزامنة أرصدة الخامات بدقة مع إجمالي المبيعات المنفذة والتحويلات',
      synced_items: syncResults
    });

  } catch (error) {
    console.error('Error syncing inventory with sales:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
