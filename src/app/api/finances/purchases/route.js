import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');

    let sql = 'SELECT * FROM raw_material_purchases';
    const params = [];

    if (branchId && branchId !== 'all') {
      sql += ' WHERE branch_id = $1';
      params.push(branchId);
    }

    sql += ' ORDER BY purchase_date DESC, created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json([], { status: 200 }); // Return array fallback for resilience
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      branch_id,
      branch_name,
      supplier_name,
      item_name,
      quantity,
      unit,
      cost_per_unit,
      total_amount,
      paid_amount,
      payment_status, // 'paid', 'credit', 'partial'
      notes,
      purchase_date,
    } = body;

    if (!supplier_name || !item_name || !total_amount) {
      return NextResponse.json({ error: 'بيانات الفاتورة ناقصة' }, { status: 400 });
    }

    const total = parseFloat(total_amount) || 0;
    const paid = parseFloat(paid_amount) || 0;
    const remaining = Math.max(0, total - paid);

    let calculatedStatus = payment_status;
    if (!calculatedStatus) {
      if (paid >= total) calculatedStatus = 'paid';
      else if (paid === 0) calculatedStatus = 'credit';
      else calculatedStatus = 'partial';
    }

    const result = await query(
      `INSERT INTO raw_material_purchases 
        (id, branch_id, branch_name, supplier_name, item_name, quantity, unit, cost_per_unit, total_amount, paid_amount, remaining_amount, payment_status, notes, purchase_date, created_at)
       VALUES 
        (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       RETURNING *`,
      [
        branch_id || 'main',
        branch_name || 'الفرع الرئيسي',
        supplier_name,
        item_name,
        parseFloat(quantity) || 1,
        unit || 'كيلو',
        parseFloat(cost_per_unit) || 0,
        total,
        paid,
        remaining,
        calculatedStatus,
        notes || '',
        purchase_date || new Date().toISOString().split('T')[0],
      ]
    );

    if (result.rows && result.rows.length > 0) {
      return NextResponse.json(result.rows[0], { status: 201 });
    }

    // Fallback response object if DB is in memory mode
    const fallbackItem = {
      id: 'purch-' + Date.now(),
      branch_id: branch_id || 'main',
      branch_name: branch_name || 'الفرع الرئيسي',
      supplier_name,
      item_name,
      quantity: parseFloat(quantity) || 1,
      unit: unit || 'كيلو',
      cost_per_unit: parseFloat(cost_per_unit) || 0,
      total_amount: total,
      paid_amount: paid,
      remaining_amount: remaining,
      payment_status: calculatedStatus,
      notes: notes || '',
      purchase_date: purchase_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(fallbackItem, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, additional_payment } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الفاتورة مطلوب' }, { status: 400 });
    }

    const payVal = parseFloat(additional_payment) || 0;

    const existingRes = await query('SELECT * FROM raw_material_purchases WHERE id = $1', [id]);
    if (existingRes.rows && existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      const newPaid = parseFloat(existing.paid_amount || 0) + payVal;
      const total = parseFloat(existing.total_amount || 0);
      const newRemaining = Math.max(0, total - newPaid);

      let newStatus = 'partial';
      if (newRemaining <= 0) newStatus = 'paid';
      else if (newPaid === 0) newStatus = 'credit';

      const updateRes = await query(
        `UPDATE raw_material_purchases
         SET paid_amount = $1, remaining_amount = $2, payment_status = $3
         WHERE id = $4
         RETURNING *`,
        [newPaid, newRemaining, newStatus, id]
      );

      return NextResponse.json(updateRes.rows[0] || {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating purchase payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرف الفاتورة مطلوب' }, { status: 400 });
    }

    await query('DELETE FROM raw_material_purchases WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
