import { query, transaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || 100;
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    let sql = 'SELECT * FROM orders';
    const params = [];
    const conditions = [];

    if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
    if (date) { conditions.push(`created_at::date = $${params.length + 1}`); params.push(date); }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      order_type, customer_name, customer_phone, customer_area,
      customer_address, driver_name, driver_id, subtotal, delivery_fee,
      discount, total, paid_amount, remaining_amount, cashier_name, items
    } = body;

    // Insert order - order_number is SERIAL, auto-increments
    const orderResult = await query(
      `INSERT INTO orders (id, order_type, customer_name, customer_phone, customer_area,
        customer_address, driver_name, driver_id, subtotal, delivery_fee, discount, total,
        paid_amount, remaining_amount, cashier_name, status)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'completed')
       RETURNING *`,
      [order_type, customer_name, customer_phone, customer_area,
       customer_address, driver_name, driver_id, subtotal || 0, delivery_fee || 0,
       discount || 0, total || 0, paid_amount || 0, remaining_amount || 0,
       cashier_name || 'administrator']
    );

    const order = orderResult.rows[0];

    // Insert order items
    if (items && items.length > 0) {
      for (const item of items) {
        await query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity, size, extras, notes)
           VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8)`,
          [order.id, item.product_id || item.id, item.product_name || item.name,
           item.price, item.quantity || 1, item.size, item.extras, item.notes]
        );
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
