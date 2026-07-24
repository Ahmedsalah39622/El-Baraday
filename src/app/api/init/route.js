import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branch_id');

    let ordersWhere = '';
    let tablesWhere = '';
    let driversWhere = '';
    let shiftsWhere = '';
    const params = [];

    if (branchId && branchId !== 'all') {
      params.push(branchId);
      ordersWhere = `WHERE o.branch_id = $1`;
      tablesWhere = `WHERE branch_id = $1`;
      driversWhere = `WHERE branch_id = $1`;
      shiftsWhere = `WHERE branch_id = $1`;
    }

    const [
      branchesRes,
      productsRes,
      customersRes,
      areasRes,
      driversRes,
      tablesRes,
      nextOrderRes,
      ordersRes,
      settingsRes,
      shiftsRes,
      attendanceRes
    ] = await Promise.all([
      query('SELECT * FROM branches ORDER BY name ASC'),
      query('SELECT * FROM products ORDER BY sort_order ASC, created_at ASC'),
      query('SELECT * FROM customers ORDER BY created_at DESC LIMIT 100'),
      query('SELECT * FROM delivery_areas ORDER BY name'),
      query(`SELECT * FROM drivers ${driversWhere} ORDER BY name`, params),
      query(`SELECT * FROM restaurant_tables ${tablesWhere} ORDER BY number`, params),
      query("SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders"),
      query(`
        SELECT o.*, b.name as branch_name,
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
        LEFT JOIN branches b ON o.branch_id = b.id
        ${ordersWhere}
        GROUP BY o.id, b.name
        ORDER BY o.created_at DESC
        LIMIT 50
      `, params),
      query('SELECT * FROM app_settings'),
      query(`SELECT * FROM shifts ${shiftsWhere} ORDER BY start_time DESC LIMIT 20`, params),
      query(`
        SELECT da.*, d.name as driver_name, d.phone as driver_phone, b.name as branch_name
        FROM driver_attendance da
        LEFT JOIN drivers d ON da.driver_id = d.id
        LEFT JOIN branches b ON da.branch_id = b.id
        WHERE da.check_out_time IS NULL
        ORDER BY da.check_in_time ASC
      `)
    ]);

    const settingsObj = {};
    if (settingsRes.rows) {
      settingsRes.rows.forEach(r => { settingsObj[r.key] = r.value; });
    }

    return NextResponse.json({
      branches: branchesRes.rows || [],
      products: productsRes.rows || [],
      customers: customersRes.rows || [],
      areas: areasRes.rows || [],
      drivers: driversRes.rows || [],
      tables: tablesRes.rows || [],
      nextOrderNumber: (nextOrderRes.rows && nextOrderRes.rows[0] && nextOrderRes.rows[0].next) ? parseInt(nextOrderRes.rows[0].next) : 1,
      orders: ordersRes.rows || [],
      settings: settingsObj,
      shifts: shiftsRes.rows || [],
      activeAttendanceQueue: attendanceRes.rows || []
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10'
      }
    });
  } catch (error) {
    console.error('❌ Error in /api/init:', error);
    return NextResponse.json({
      branches: [],
      products: [],
      customers: [],
      areas: [],
      drivers: [],
      tables: [],
      nextOrderNumber: 1,
      orders: [],
      settings: {},
      shifts: [],
      activeAttendanceQueue: []
    });
  }
}
