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
    const { status, driver_name, driver_id, dispatched_at, delivered_to_customer_at } = body;

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

    let deliveredAtValue = currentOrder.delivered_to_customer_at;
    if (delivered_to_customer_at) {
      deliveredAtValue = delivered_to_customer_at;
    } else if (targetStatus === 'customer_delivered' && !currentOrder.delivered_to_customer_at) {
      deliveredAtValue = new Date().toISOString();
    }

    // 2. Update orders table
    const result = await query(
      `UPDATE orders SET
       status = COALESCE($1, status),
       driver_name = COALESCE($2, driver_name),
       driver_id = COALESCE($3, driver_id),
       dispatched_at = COALESCE($4, dispatched_at),
       delivered_to_customer_at = COALESCE($5, delivered_to_customer_at)
       WHERE id = $6 RETURNING *`,
      [targetStatus, targetDriverName, targetDriverId, dispatchedAtValue, deliveredAtValue, id]
    );

    const updatedOrder = result.rows[0];

    // 3. Update driver attendance queue status
    if (targetDriverName || targetDriverId) {
      const cleanName = (targetDriverName || '').trim();
      const cleanId = (targetDriverId || '').trim();

      if (targetStatus === 'dispatched' || targetStatus === 'out_for_delivery') {
        // Driver leaves with order -> status = 'on_delivery'
        await query(
          `UPDATE driver_attendance SET status = 'on_delivery', current_order_id = $1
           WHERE (TRIM(driver_name) = $2 OR driver_name ILIKE $2 OR (driver_id = $3 AND $3 != '')) AND check_out_time IS NULL`,
          [id, cleanName, cleanId]
        );
      } else if (targetStatus === 'delivered' || targetStatus === 'completed') {
        // Driver returns & completes trip -> status = 'ready', update check_in_time to CURRENT_TIMESTAMP so driver moves to BACK of the queue!
        await query(
          `UPDATE driver_attendance SET status = 'ready', current_order_id = NULL, check_in_time = CURRENT_TIMESTAMP
           WHERE (TRIM(driver_name) = $1 OR driver_name ILIKE $1 OR (driver_id = $2 AND $2 != '')) AND check_out_time IS NULL`,
          [cleanName, cleanId]
        );
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('❌ Error in PUT /api/orders/[id]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
