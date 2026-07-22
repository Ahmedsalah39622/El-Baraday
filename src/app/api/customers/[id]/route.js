import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, address, floor, apartment } = body;
    const result = await query(
      `UPDATE customers SET
       name = COALESCE($1, name),
       phone = COALESCE($2, phone),
       address = COALESCE($3, address),
       floor = COALESCE($4, floor),
       apartment = COALESCE($5, apartment)
       WHERE id = $6 RETURNING *`,
      [name, phone, address, floor, apartment, id]
    );
    if (result.rows.length === 0) {
      const insertResult = await query(
        `INSERT INTO customers (id, name, phone, address, floor, apartment, total_orders, total_spend)
         VALUES ($1, $2, $3, $4, $5, $6, 0, 0) RETURNING *`,
        [id, name || 'عميل', phone || '', address || '', floor || '', apartment || '']
      );
      return NextResponse.json(insertResult.rows[0]);
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error updating customer:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await query('DELETE FROM customers WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
