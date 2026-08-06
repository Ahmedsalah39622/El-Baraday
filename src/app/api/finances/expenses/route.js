import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');

    let sql = 'SELECT * FROM operational_expenses';
    const params = [];

    if (branchId && branchId !== 'all') {
      sql += ' WHERE branch_id = $1';
      params.push(branchId);
    }

    sql += ' ORDER BY expense_date DESC, created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      branch_id,
      branch_name,
      title,
      category,
      amount,
      payment_method,
      notes,
      expense_date,
    } = body;

    if (!title || !amount) {
      return NextResponse.json({ error: 'اسم أو قيمة المصروف مطلوب' }, { status: 400 });
    }

    const val = parseFloat(amount) || 0;

    const result = await query(
      `INSERT INTO operational_expenses
        (id, branch_id, branch_name, title, category, amount, payment_method, notes, expense_date, created_at)
       VALUES
        (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [
        branch_id || 'main',
        branch_name || 'الفرع الرئيسي',
        title,
        category || 'نثريات',
        val,
        payment_method || 'كاش الخزنة',
        notes || '',
        expense_date || new Date().toISOString().split('T')[0],
      ]
    );

    if (result.rows && result.rows.length > 0) {
      return NextResponse.json(result.rows[0], { status: 201 });
    }

    const fallbackItem = {
      id: 'exp-' + Date.now(),
      branch_id: branch_id || 'main',
      branch_name: branch_name || 'الفرع الرئيسي',
      title,
      category: category || 'نثريات',
      amount: val,
      payment_method: payment_method || 'كاش الخزنة',
      notes: notes || '',
      expense_date: expense_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(fallbackItem, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرف المصروف مطلوب' }, { status: 400 });
    }

    await query('DELETE FROM operational_expenses WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
