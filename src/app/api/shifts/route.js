import { query, isSchemaChecked, markSchemaChecked } from '@/lib/db';
import { NextResponse } from 'next/server';

async function ensureShiftCols() {
  if (isSchemaChecked('shiftCols')) return;
  try { await query('ALTER TABLE shifts ADD COLUMN expected_amount DECIMAL(10, 2) DEFAULT 0'); } catch (e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN cash_difference DECIMAL(10, 2) DEFAULT 0'); } catch (e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN difference_type VARCHAR(50) DEFAULT \'balanced\''); } catch (e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN notes TEXT'); } catch (e) {}
  try { await query('ALTER TABLE shifts ADD COLUMN branch_id VARCHAR(100) DEFAULT \'b1\''); } catch (e) {}
  markSchemaChecked('shiftCols');
}


export async function GET(request) {
  try {
    await ensureShiftCols();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');

    let sql = 'SELECT * FROM shifts';
    const params = [];
    if (branchId && branchId !== 'all') {
      sql += ' WHERE branch_id = $1';
      params.push(branchId);
    }
    sql += ' ORDER BY start_time DESC LIMIT 50';

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureShiftCols();
    const body = await request.json();
    const { cashier_name, start_amount, start_time, branch_id } = body;
    const targetBranch = branch_id || 'b1';

    // Mark existing active shift FOR THIS BRANCH ONLY as closed
    await query(
      "UPDATE shifts SET status='closed', end_time=CURRENT_TIMESTAMP WHERE status='active' AND (branch_id = $1 OR (branch_id IS NULL AND $1 = 'b1'))",
      [targetBranch]
    );

    let formattedStartTime = null;
    if (start_time) {
      const d = new Date(start_time);
      if (!isNaN(d.getTime())) {
        formattedStartTime = d.toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    const newId = `shift_${Date.now()}`;

    const result = await query(
      `INSERT INTO shifts (id, cashier_name, start_amount, start_time, status, branch_id)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_TIMESTAMP), 'active', $5) RETURNING *`,
      [newId, cashier_name || 'administrator', start_amount || 0, formattedStartTime, targetBranch]
    );

    const createdShift = (result.rows && result.rows[0]) ? result.rows[0] : {
      id: newId,
      cashier_name: cashier_name || 'administrator',
      start_amount: start_amount || 0,
      start_time: formattedStartTime || new Date().toISOString(),
      status: 'active',
      branch_id: targetBranch
    };

    return NextResponse.json(createdShift, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating shift:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
