import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT * FROM customers ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching customers:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, address, floor, apartment, id } = body;
    const customerId = id || `cust_${Date.now()}`;
    const result = await query(
      `INSERT INTO customers (id, name, phone, address, floor, apartment, total_orders, total_spend)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, phone = EXCLUDED.phone, address = EXCLUDED.address, floor = EXCLUDED.floor, apartment = EXCLUDED.apartment
       RETURNING *`,
      [customerId, name || 'عميل', phone || '', address || '', floor || '', apartment || '']
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('❌ Error inserting customer:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
