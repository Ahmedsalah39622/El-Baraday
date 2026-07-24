import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');

    let sql = 'SELECT * FROM drivers';
    const params = [];
    if (branchId && branchId !== 'all') {
      params.push(branchId);
      sql += ' WHERE branch_id = $1';
    }
    sql += ' ORDER BY name';

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, branch_id } = body;
    const result = await query(
      `INSERT INTO drivers (id, name, phone, branch_id) VALUES (gen_random_uuid()::TEXT, $1, $2, $3) RETURNING *`,
      [name, phone, branch_id || 'b1']
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
