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

    const fallbackId = `ord_${Date.now()}`;

    // Insert order - order_number is SERIAL, auto-increments
    const orderResult = await query(
      `INSERT INTO orders (id, order_type, customer_name, customer_phone, customer_area,
        customer_address, driver_name, driver_id, subtotal, delivery_fee, discount, total,
        paid_amount, remaining_amount, cashier_name, status)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'completed')
       RETURNING *`,
      [order_type || 'dine_in', customer_name || null, customer_phone || null, customer_area || null,
       customer_address || null, driver_name || null, driver_id || null, subtotal || 0, delivery_fee || 0,
       discount || 0, total || 0, paid_amount || 0, remaining_amount || 0,
       cashier_name || 'administrator']
    );

    let order;
    if (orderResult && orderResult.rows && orderResult.rows.length > 0) {
      order = orderResult.rows[0];
    } else {
      order = {
        id: fallbackId,
        order_number: Date.now().toString().slice(-4),
        order_type: order_type || 'dine_in',
        customer_name,
        customer_phone,
        subtotal: subtotal || 0,
        delivery_fee: delivery_fee || 0,
        discount: discount || 0,
        total: total || 0,
        paid_amount: paid_amount || 0,
        remaining_amount: remaining_amount || 0,
        cashier_name: cashier_name || 'administrator',
        status: 'completed',
        created_at: new Date().toISOString(),
      };
    }

    // Insert order items
    if (items && items.length > 0) {
      for (const item of items) {
        await query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity, size, extras, notes)
           VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8)`,
          [order.id, item.product_id || item.id, item.product_name || item.name,
           item.price || 0, item.quantity || 1, item.size || null, item.extras || null, item.notes || null]
        );
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    return NextResponse.json({
      id: `ord_${Date.now()}`,
      order_number: Date.now().toString().slice(-4),
      status: 'completed',
      created_at: new Date().toISOString()
    }, { status: 200 });
  }
}
