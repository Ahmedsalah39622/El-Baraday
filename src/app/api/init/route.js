import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [
      productsRes,
      customersRes,
      areasRes,
      driversRes,
      tablesRes,
      nextOrderRes,
      ordersRes,
      settingsRes,
      shiftsRes
    ] = await Promise.all([
      query('SELECT * FROM products ORDER BY sort_order ASC, created_at ASC'),
      query('SELECT * FROM customers ORDER BY created_at DESC LIMIT 100'),
      query('SELECT * FROM delivery_areas ORDER BY name'),
      query('SELECT * FROM drivers ORDER BY name'),
      query('SELECT * FROM restaurant_tables ORDER BY number'),
      query("SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders"),
      query(`
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
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 50
      `),
      query('SELECT * FROM app_settings'),
      query('SELECT * FROM shifts ORDER BY start_time DESC LIMIT 20')
    ]);

    const settingsObj = {};
    if (settingsRes.rows) {
      settingsRes.rows.forEach(r => { settingsObj[r.key] = r.value; });
    }

    return NextResponse.json({
      products: productsRes.rows || [],
      customers: customersRes.rows || [],
      areas: areasRes.rows || [],
      drivers: driversRes.rows || [],
      tables: tablesRes.rows || [],
      nextOrderNumber: (nextOrderRes.rows && nextOrderRes.rows[0] && nextOrderRes.rows[0].next) ? parseInt(nextOrderRes.rows[0].next) : 1,
      orders: ordersRes.rows || [],
      settings: settingsObj,
      shifts: shiftsRes.rows || []
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10'
      }
    });
  } catch (error) {
    console.error('❌ Error in /api/init:', error);
    return NextResponse.json({
      products: [],
      customers: [],
      areas: [],
      drivers: [],
      tables: [],
      nextOrderNumber: 1,
      orders: [],
      settings: {},
      shifts: []
    });
  }
}
