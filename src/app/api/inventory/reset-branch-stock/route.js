import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const branchId = body.branch_id || body.branchId || 'all';
    const itemId = body.item_id || body.itemId || 'all';
    const notes = body.notes || 'تصفير رصيد خامات الفرع';
    const executorName = body.executor_name || body.executorName || 'المسؤول';

    // 1. Fetch branch names map
    const branchesRes = await query('SELECT id, name FROM branches');
    const branchMap = { 'all': 'كافة الفروع', 'b_main': 'المخزن الرئيسي', 'b1': 'فرع عزت', 'b2': 'فرع المسلة' };
    (branchesRes.rows || []).forEach(b => { branchMap[b.id] = b.name; });

    // 2. Fetch inventory items map
    const itemsRes = await query('SELECT id, name, unit FROM inventory_items');
    const allItems = itemsRes.rows || [];
    const itemMap = {};
    allItems.forEach(i => { itemMap[i.id] = i; });

    let targetBranchName = branchMap[branchId] || branchId;

    if (itemId === 'all') {
      // --- Case 1: Reset ALL items in target branch(es) ---

      if (branchId === 'b_main') {
        // Reset Main Warehouse stock
        await query(`UPDATE inventory_items SET current_stock = 0`);

        // Log transaction
        await query(`
          INSERT INTO inventory_transactions (id, item_id, type, quantity, notes, branch_id)
          VALUES ($1, 'all_items', 'adjustment', 0, $2, 'b_main')
        `, [`trans_reset_${Date.now()}`, `تصفير شامل لكافة خامات المخزن الرئيسي بواسطة ${executorName} - ${notes}`]);

        return NextResponse.json({
          success: true,
          message: 'تم تصفير كافة الخامات في المخزن الرئيسي بنجاح إلى 0.'
        });

      } else if (branchId === 'all') {
        // Reset all branch stock for all branches
        await query(`UPDATE inventory_branch_stock SET current_stock = 0`);

        // For all items and all branches, ensure they exist with 0
        const branchList = (branchesRes.rows || []).filter(b => b.id !== 'b_main');
        for (const b of branchList) {
          for (const item of allItems) {
            await query(`
              INSERT INTO inventory_branch_stock (id, item_id, branch_id, current_stock)
              VALUES ($1, $2, $3, 0)
              ON DUPLICATE KEY UPDATE current_stock = 0
            `, [`obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, item.id, b.id]);
          }
        }

        // Log transaction
        await query(`
          INSERT INTO inventory_transactions (id, item_id, type, quantity, notes, branch_id)
          VALUES ($1, 'all_items', 'adjustment', 0, $2, 'all')
        `, [`trans_reset_${Date.now()}`, `تصفير شامل لكافة خامات الفروع بواسطة ${executorName} - ${notes}`]);

        return NextResponse.json({
          success: true,
          message: 'تم تصفير كافة الخامات في جميع الفروع بنجاح إلى 0.'
        });

      } else {
        // Reset all items for a specific branch (e.g. b1 or b2)
        await query(`
          UPDATE inventory_branch_stock 
          SET current_stock = 0 
          WHERE branch_id = $1
        `, [branchId]);

        for (const item of allItems) {
          await query(`
            INSERT INTO inventory_branch_stock (id, item_id, branch_id, current_stock)
            VALUES ($1, $2, $3, 0)
            ON DUPLICATE KEY UPDATE current_stock = 0
          `, [`obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, item.id, branchId]);
        }

        // Log transaction
        await query(`
          INSERT INTO inventory_transactions (id, item_id, type, quantity, notes, branch_id)
          VALUES ($1, 'all_items', 'adjustment', 0, $2, $3)
        `, [`trans_reset_${Date.now()}`, `تصفير شامل لكافة خامات ${targetBranchName} بواسطة ${executorName} - ${notes}`, branchId]);

        return NextResponse.json({
          success: true,
          message: `تم تصفير كافة خامات (${targetBranchName}) بنجاح إلى 0.`
        });
      }

    } else {
      // --- Case 2: Reset a SPECIFIC item in target branch(es) ---
      const itemObj = itemMap[itemId];
      const itemName = itemObj?.name || 'الخامة';

      if (branchId === 'b_main') {
        // Set this item to 0 in main warehouse
        await query(`UPDATE inventory_items SET current_stock = 0 WHERE id = $1`, [itemId]);

        // Log transaction
        await query(`
          INSERT INTO inventory_transactions (id, item_id, type, quantity, notes, branch_id)
          VALUES ($1, $2, 'adjustment', 0, $3, 'b_main')
        `, [`trans_reset_${Date.now()}`, itemId, `تصفير رصيد خامة (${itemName}) في المخزن الرئيسي بواسطة ${executorName} - ${notes}`]);

        return NextResponse.json({
          success: true,
          message: `تم تصفير رصيد خامة (${itemName}) في المخزن الرئيسي بنجاح إلى 0.`
        });

      } else if (branchId === 'all') {
        // Set this item to 0 in all branches
        const branchList = (branchesRes.rows || []).filter(b => b.id !== 'b_main');
        for (const b of branchList) {
          await query(`
            INSERT INTO inventory_branch_stock (id, item_id, branch_id, current_stock)
            VALUES ($1, $2, $3, 0)
            ON DUPLICATE KEY UPDATE current_stock = 0
          `, [`obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, itemId, b.id]);
        }

        // Log transaction
        await query(`
          INSERT INTO inventory_transactions (id, item_id, type, quantity, notes, branch_id)
          VALUES ($1, $2, 'adjustment', 0, $3, 'all')
        `, [`trans_reset_${Date.now()}`, itemId, `تصفير رصيد خامة (${itemName}) في كافة الفروع بواسطة ${executorName} - ${notes}`]);

        return NextResponse.json({
          success: true,
          message: `تم تصفير رصيد خامة (${itemName}) في جميع الفروع بنجاح إلى 0.`
        });

      } else {
        // Set this item to 0 in specific branch
        await query(`
          INSERT INTO inventory_branch_stock (id, item_id, branch_id, current_stock)
          VALUES ($1, $2, $3, 0)
          ON DUPLICATE KEY UPDATE current_stock = 0
        `, [`obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, itemId, branchId]);

        // Log transaction
        await query(`
          INSERT INTO inventory_transactions (id, item_id, type, quantity, notes, branch_id)
          VALUES ($1, $2, 'adjustment', 0, $3, $4)
        `, [`trans_reset_${Date.now()}`, itemId, `تصفير رصيد خامة (${itemName}) في ${targetBranchName} بواسطة ${executorName} - ${notes}`, branchId]);

        return NextResponse.json({
          success: true,
          message: `تم تصفير رصيد خامة (${itemName}) في (${targetBranchName}) بنجاح إلى 0.`
        });
      }
    }

  } catch (error) {
    console.error('Error resetting branch stock:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
