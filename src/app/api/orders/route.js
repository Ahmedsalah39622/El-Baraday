import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || 100;
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    // 1. Fetch orders with items using json_agg
    try {
      let sql = `
        SELECT o.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', oi.id,
                     'product_id', oi.product_id,
                     'product_name', oi.product_name,
                     'name', oi.product_name,
                     'price', oi.price,
                     'quantity', oi.quantity,
                     'size', oi.size,
                     'extras', oi.extras,
                     'notes', oi.notes
                   )
                 ) FILTER (WHERE oi.id IS NOT NULL), '[]'
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
      `;
      const params = [];
      const conditions = [];

      if (status) { conditions.push(`o.status = $${params.length + 1}`); params.push(status); }
      if (date) { conditions.push(`o.created_at::date = $${params.length + 1}`); params.push(date); }

      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await query(sql, params);
      if (result.rows && result.rows.length > 0) {
        return NextResponse.json(result.rows);
      }
    } catch (aggError) {
      console.warn('⚠️ SQL Join Error, falling back to simple SELECT * FROM orders:', aggError.message);
    }

    // 2. Fallback query: Simple SELECT * FROM orders to ensure orders NEVER disappear
    const fallbackRes = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT $1', [limit]);
    return NextResponse.json(fallbackRes.rows || []);
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

    // Get next sequential order number with explicit INTEGER type casting
    const nextRes = await query("SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders");
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

    // Insert order items into order_items table
    if (items && items.length > 0) {
      for (const item of items) {
        await query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity, size, extras, notes)
           VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8)`,
          [order.id, item.product_id || item.id || null, item.product_name || item.name || 'صنف',
           item.price || 0, item.quantity || 1, item.size || null, item.extras || null, item.notes || null]
        );
      }
    }

    return NextResponse.json({
      ...order,
      items: items || []
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
