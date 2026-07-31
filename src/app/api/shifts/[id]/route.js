import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let shiftColsChecked = false;
export async function ensureShiftCols() {
  if (shiftColsChecked) return;
  try { await query('ALTER TABLE shifts ADD COLUMN expected_amount DECIMAL(10, 2) DEFAULT 0'); } catch (e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN cash_difference DECIMAL(10, 2) DEFAULT 0'); } catch (e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN difference_type VARCHAR(50) DEFAULT \'balanced\''); } catch (e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN notes TEXT'); } catch (e) {}
  shiftColsChecked = true;
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
