import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    return NextResponse.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, driver_name, driver_id, dispatched_at } = body;

    // 1. Get current order details
    const currentRes = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const currentOrder = currentRes.rows[0];

    const targetDriverName = driver_name || currentOrder.driver_name;
    const targetDriverId = driver_id || currentOrder.driver_id;
    const targetStatus = status || currentOrder.status;

    let dispatchedAtValue = currentOrder.dispatched_at;
    if (dispatched_at) {
      dispatchedAtValue = dispatched_at;
    } else if ((targetStatus === 'dispatched' || targetStatus === 'out_for_delivery') && !currentOrder.dispatched_at) {
      dispatchedAtValue = new Date().toISOString();
    }

    // 2. Update orders table
    const result = await query(
      `UPDATE orders SET
       status = COALESCE($1, status),
       driver_name = COALESCE($2, driver_name),
       driver_id = COALESCE($3, driver_id),
       dispatched_at = COALESCE($4, dispatched_at)
       WHERE id = $5 RETURNING *`,
      [targetStatus, targetDriverName, targetDriverId, dispatchedAtValue, id]
    );

    const updatedOrder = result.rows[0];

    // 3. Update driver attendance queue status
    if (targetDriverName || targetDriverId) {
      if (targetStatus === 'dispatched' || targetStatus === 'out_for_delivery') {
        // Driver leaves with order -> status = 'on_delivery'
        await query(
          `UPDATE driver_attendance SET status = 'on_delivery', current_order_id = $1
           WHERE (driver_name = $2 OR driver_id = $3) AND check_out_time IS NULL`,
          [id, targetDriverName, targetDriverId]
        );
      } else if (targetStatus === 'delivered' || targetStatus === 'completed') {
        // Driver returns & completes trip -> status = 'ready', update check_in_time to CURRENT_TIMESTAMP so driver moves to BACK of the queue!
        await query(
          `UPDATE driver_attendance SET status = 'ready', current_order_id = NULL, check_in_time = CURRENT_TIMESTAMP
           WHERE (driver_name = $1 OR driver_id = $2) AND check_out_time IS NULL`,
          [targetDriverName, targetDriverId]
        );
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('❌ Error in PUT /api/orders/[id]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
