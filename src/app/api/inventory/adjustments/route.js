import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { item_id, type, quantity, cost_per_unit, branch_id, supplier_name, notes } = body;

    const numQty = parseFloat(quantity || 0);
    const targetBranch = branch_id || 'b_main';

    if (!item_id) {
      return NextResponse.json({ error: 'برجاء تحديد الخامة' }, { status: 400 });
    }

    if (numQty <= 0) {
      return NextResponse.json({ error: 'برجاء تحديد كمية صحيحة أكبر من الصفر' }, { status: 400 });
    }

    // Fetch Item
    const itemRes = await query('SELECT * FROM inventory_items WHERE id = $1', [item_id]);
    if (!itemRes.rows || itemRes.rows.length === 0) {
      return NextResponse.json({ error: 'الخامة غير موجودة' }, { status: 404 });
    }
    const item = itemRes.rows[0];

    const adjustmentType = type || 'supply'; // 'supply' (توريد وارد), 'waste' (هالك/تالف), 'adjustment' (تسوية)
    const costNum = parseFloat(cost_per_unit ?? item.cost_per_unit ?? 0);

    if (adjustmentType === 'supply') {
      // Incoming supply to Central Warehouse (b_main) or specific branch
      if (targetBranch === 'b_main') {
        await query(
          'UPDATE inventory_items SET current_stock = current_stock + $1, cost_per_unit = $2 WHERE id = $3',
          [numQty, costNum, item_id]
        );
      } else {
        await query(
          `INSERT INTO inventory_branch_stock (id, item_id, branch_id, current_stock)
           VALUES ($1, $2, $3, $4)
           ON DUPLICATE KEY UPDATE current_stock = current_stock + $4`,
          [`obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, item_id, targetBranch, numQty]
        );
      }

      // Record purchase if supplier info is present
      if (supplier_name) {
        await query(
          `INSERT INTO purchases (id, supplier_name, item_id, item_name, quantity, unit_price, total_cost, branch_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            `pur_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            supplier_name,
            item_id,
            item.name,
            numQty,
            costNum,
            numQty * costNum,
            targetBranch,
            notes || 'توريد خامات للمخزن'
          ]
        );
      }

      // Log transaction
      await query(
        `INSERT INTO inventory_transactions (id, item_id, type, quantity, notes) VALUES ($1, $2, 'in', $3, $4)`,
        [`trans_${Date.now()}_${Math.floor(Math.random() * 1000)}`, item_id, numQty, `إذن توريد وارد من ${supplier_name || 'المورد'} - ${notes || ''}`]
      );

    } else if (adjustmentType === 'waste' || adjustmentType === 'loss') {
      // Stock Waste / Loss deduction
      if (targetBranch === 'b_main') {
        await query(
          'UPDATE inventory_items SET current_stock = GREATEST(0, current_stock - $1) WHERE id = $2',
          [numQty, item_id]
        );
      } else {
        await query(
          `INSERT INTO inventory_branch_stock (id, item_id, branch_id, current_stock)
           VALUES ($1, $2, $3, 0)
           ON DUPLICATE KEY UPDATE current_stock = GREATEST(0, current_stock - $4)`,
          [`obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, item_id, targetBranch, numQty]
        );
      }

      // Log transaction
      await query(
        `INSERT INTO inventory_transactions (id, item_id, type, quantity, notes) VALUES ($1, $2, 'waste', $3, $4)`,
        [`trans_${Date.now()}_${Math.floor(Math.random() * 1000)}`, item_id, numQty, `خصم هالك / تالف - ${notes || ''}`]
      );
    }

    return NextResponse.json({ success: true, message: 'تم تسوية وتحديث مخزون الخامة بنجاح' });
  } catch (error) {
    console.error('Error processing stock adjustment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
