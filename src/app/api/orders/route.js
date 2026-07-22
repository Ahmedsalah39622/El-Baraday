import { query } from '@/lib/db';
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
    return NextResponse.json(result.rows || []);
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    return NextResponse.json([]);
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

    // Get next sequential order number
    const nextRes = await query('SELECT COALESCE(MAX(order_number), 0) + 1 as next FROM orders');
    const nextNum = (nextRes.rows && nextRes.rows.length > 0 && nextRes.rows[0].next) ? parseInt(nextRes.rows[0].next) : 1;

    // Insert order into Supabase DB
    const orderResult = await query(
      `INSERT INTO orders (id, order_number, order_type, customer_name, customer_phone, customer_area,
        customer_address, driver_name, driver_id, subtotal, delivery_fee, discount, total,
        paid_amount, remaining_amount, cashier_name, status)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'completed')
       RETURNING *`,
      [nextNum, order_type || 'dine_in', customer_name || null, customer_phone || null, customer_area || null,
       customer_address || null, driver_name || null, driver_id || null, subtotal || 0, delivery_fee || 0,
       discount || 0, total || 0, paid_amount || 0, remaining_amount || 0,
       cashier_name || 'administrator']
    );

    const order = (orderResult.rows && orderResult.rows.length > 0) ? orderResult.rows[0] : {
      id: `ord_${Date.now()}`,
      order_number: nextNum,
      order_type: order_type || 'dine_in',
      customer_name,
      total,
      cashier_name: cashier_name || 'administrator',
      status: 'completed',
      created_at: new Date().toISOString()
    };

    // Insert order items
    if (items && items.length > 0) {
      for (const item of items) {
        await query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity, size, extras, notes)
           VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8)`,
          [order.id, item.product_id || item.id || null, item.product_name || item.name || 'طلب',
           item.price || 0, item.quantity || 1, item.size || null, item.extras || null, item.notes || null]
        );
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
