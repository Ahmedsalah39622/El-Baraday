import { query, isSchemaChecked, markSchemaChecked } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function ensureShiftCols() {
  if (isSchemaChecked('shiftCols')) return;
  try { await query('ALTER TABLE shifts ADD COLUMN expected_amount DECIMAL(10, 2) DEFAULT 0'); } catch (e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN cash_difference DECIMAL(10, 2) DEFAULT 0'); } catch (e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN difference_type VARCHAR(50) DEFAULT \'balanced\''); } catch (e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN notes TEXT'); } catch (e) {}
  markSchemaChecked('shiftCols');
}


export async function PUT(request, { params }) {
  try {
    await ensureShiftCols();
    const { id } = await params;
    const body = await request.json();
    const { end_amount, expected_amount, cash_sales, total_orders, notes } = body;

    const actual = parseFloat(end_amount || 0);
    const expected = parseFloat(expected_amount || 0);
    const cashDifference = actual - expected;
    let differenceType = 'balanced';
    if (cashDifference < -0.01) differenceType = 'deficit';
    else if (cashDifference > 0.01) differenceType = 'surplus';

    // 1. Get current shift branch
    const shiftRes = await query('SELECT branch_id FROM shifts WHERE id = $1', [id]);
    const shiftBranch = (shiftRes.rows && shiftRes.rows[0]) ? shiftRes.rows[0].branch_id : 'b1';

    // 2. Update shift status to closed & save financial metrics
    const result = await query(
      `UPDATE shifts SET 
        end_time=CURRENT_TIMESTAMP, 
        end_amount=$1,
        expected_amount=$2,
        cash_difference=$3,
        difference_type=$4,
        cash_sales=$5, 
        total_orders=$6, 
        notes=$7,
        status='closed'
       WHERE id=$8 RETURNING *`,
      [actual, expected, cashDifference, differenceType, cash_sales || 0, total_orders || 0, notes || '', id]
    );

    // 3. Clean/delete orders and order_items for this branch from DB tables
    try {
      if (shiftBranch && shiftBranch !== 'all') {
        await query(
          `DELETE FROM order_items WHERE order_id IN (
            SELECT id FROM orders WHERE branch_id = $1
          )`,
          [shiftBranch]
        );
        await query(
          `DELETE FROM orders WHERE branch_id = $1`,
          [shiftBranch]
        );
      } else {
        await query(`DELETE FROM order_items`);
        await query(`DELETE FROM orders`);
      }
    } catch (err) {
      console.warn('⚠️ Order purge on shift close failed:', err.message);
    }

    const updatedShift = (result.rows && result.rows[0]) ? result.rows[0] : {
      id,
      end_amount: actual,
      expected_amount: expected,
      cash_difference: cashDifference,
      difference_type: differenceType,
      cash_sales: cash_sales || 0,
      total_orders: total_orders || 0,
      notes: notes || '',
      status: 'closed',
    };

    return NextResponse.json(updatedShift);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
