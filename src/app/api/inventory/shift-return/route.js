import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id') || searchParams.get('branchId') || 'b1';

    // 1. Fetch branch items with positive remaining stock
    const stockSql = `
      SELECT 
        inv.id AS item_id,
        inv.name AS item_name,
        inv.unit,
        inv.category,
        COALESCE(obs.current_stock, 0) AS current_branch_stock,
        inv.cost_per_unit
      FROM inventory_items inv
      LEFT JOIN inventory_branch_stock obs 
        ON inv.id = obs.item_id AND obs.branch_id = $1
      ORDER BY inv.category, inv.name
    `;
    const stockRes = await query(stockSql, [branchId]);
    const items = stockRes.rows || [];

    // 2. Fetch total received from warehouse for this branch
    const trfInRes = await query(`
      SELECT item_id, SUM(quantity) AS total_in
      FROM inventory_transfers
      WHERE to_branch_id = $1 AND status = 'completed'
      GROUP BY item_id
    `, [branchId]);
    const trfInMap = {};
    (trfInRes.rows || []).forEach(t => { trfInMap[t.item_id] = parseFloat(t.total_in || 0); });

    // 3. Format response
    const formatted = items.map(item => {
      const remaining = parseFloat(item.current_branch_stock || 0);
      const received = trfInMap[item.item_id] || 0;
      const consumed = Math.max(0, received - remaining);

      return {
        item_id: item.item_id,
        item_name: item.item_name,
        unit: item.unit,
        category: item.category,
        received_qty: received,
        consumed_qty: consumed,
        current_stock: remaining,
        cost_per_unit: parseFloat(item.cost_per_unit || 0),
        total_value: remaining * parseFloat(item.cost_per_unit || 0)
      };
    }).filter(i => i.current_stock > 0 || i.received_qty > 0);

    return NextResponse.json({
      branch_id: branchId,
      items: formatted
    });

  } catch (error) {
    console.error('Error fetching shift inventory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const branchId = body.branch_id || body.branchId;
    const cashierName = body.cashier_name || body.cashierName || 'مسؤول الشيفت';
    const notes = body.notes || 'إرجاع رصيد متبقي عند تقفيل الشيفت';

    if (!branchId || branchId === 'all' || branchId === 'b_main') {
      return NextResponse.json({ error: 'برجاء تحديد فرع صحيح لإرجاع الخامات منه' }, { status: 400 });
    }

    // Fetch branch name
    const branchRes = await query('SELECT name FROM branches WHERE id = $1', [branchId]);
    const branchName = branchRes.rows && branchRes.rows[0]?.name ? branchRes.rows[0].name : (branchId === 'b2' ? 'فرع المسلة' : 'فرع عزت');

    // 1. Fetch all items in this branch with positive remaining stock (> 0)
    const stockRes = await query(`
      SELECT obs.item_id, obs.current_stock, inv.name AS item_name, inv.unit
      FROM inventory_branch_stock obs
      JOIN inventory_items inv ON obs.item_id = inv.id
      WHERE obs.branch_id = $1 AND obs.current_stock > 0
    `, [branchId]);

    const itemsToReturn = stockRes.rows || [];

    if (itemsToReturn.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'لا توجد خامات متبقية برصيد موجب في الفرع لإرجاعها',
        returned_items: []
      });
    }

    const returnedResults = [];

    for (const item of itemsToReturn) {
      const returnQty = parseFloat(item.current_stock);
      if (returnQty <= 0) continue;

      // 1. Zero out / Deduct stock from Branch
      await query(`
        UPDATE inventory_branch_stock 
        SET current_stock = 0 
        WHERE branch_id = $1 AND item_id = $2
      `, [branchId, item.item_id]);

      // 2. Add stock back to Central Warehouse (b_main)
      await query(`
        UPDATE inventory_items 
        SET current_stock = current_stock + $1 
        WHERE id = $2
      `, [returnQty, item.item_id]);

      // 3. Log official transfer record
      const transferId = `trf_return_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await query(`
        INSERT INTO inventory_transfers (id, from_branch_id, to_branch_id, item_id, quantity, unit, sender_name, status, notes)
        VALUES ($1, $2, 'b_main', $3, $4, $5, $6, 'completed', $7)
      `, [transferId, branchId, item.item_id, returnQty, item.unit, cashierName, `${notes} - إرجاع من ${branchName}`]);

      // 4. Log audit transactions
      await query(`
        INSERT INTO inventory_transactions (id, item_id, type, quantity, notes, branch_id)
        VALUES ($1, $2, 'transfer_out', $3, $4, $5)
      `, [`trans_out_${Date.now()}_${Math.floor(Math.random() * 1000)}`, item.item_id, returnQty, `إرجاع للمخزن الرئيسي من ${branchName} عند إغلاق الشيفت`, branchId]);

      await query(`
        INSERT INTO inventory_transactions (id, item_id, type, quantity, notes, branch_id)
        VALUES ($1, $2, 'transfer_in', $3, $4, 'b_main')
      `, [`trans_in_${Date.now()}_${Math.floor(Math.random() * 1000)}`, item.item_id, returnQty, `استلام مرتجع في المخزن الرئيسي من ${branchName} عند إغلاق الشيفت`]);

      returnedResults.push({
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: returnQty,
        unit: item.unit
      });
    }

    return NextResponse.json({
      success: true,
      message: `تم إرجاع عدد (${returnedResults.length}) خامات بنجاح من ${branchName} إلى المخزن الرئيسي`,
      returned_items: returnedResults
    });

  } catch (error) {
    console.error('Error processing shift inventory return:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
