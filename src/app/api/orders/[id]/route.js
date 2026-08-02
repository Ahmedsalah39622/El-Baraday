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
    const {
      status,
      driver_name,
      driver_id,
      dispatched_at,
      delivered_to_customer_at,
      is_cash_collected,
      total,
      subtotal,
      delivery_fee,
      discount
    } = body;

    // 1. Get current order details
    const currentRes = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const currentOrder = currentRes.rows[0];

    const targetDriverName = driver_name !== undefined ? driver_name : currentOrder.driver_name;
    const targetDriverId = driver_id !== undefined ? driver_id : currentOrder.driver_id;
    const targetStatus = status !== undefined ? status : currentOrder.status;

    let dispatchedAtValue = currentOrder.dispatched_at || null;
    if (dispatched_at) {
      dispatchedAtValue = dispatched_at;
    } else if ((targetStatus === 'dispatched' || targetStatus === 'out_for_delivery') && !currentOrder.dispatched_at) {
      dispatchedAtValue = new Date().toISOString();
    }

    let deliveredAtValue = currentOrder.delivered_to_customer_at || null;
    if (delivered_to_customer_at) {
      deliveredAtValue = delivered_to_customer_at;
    } else if (targetStatus === 'customer_delivered' && !currentOrder.delivered_to_customer_at) {
      deliveredAtValue = new Date().toISOString();
    }

    const cashCollectedVal = is_cash_collected !== undefined ? (is_cash_collected ? 1 : 0) : (currentOrder.is_cash_collected ? 1 : 0);
    let cashCollectedAtVal = currentOrder.cash_collected_at || null;
    if (is_cash_collected && !currentOrder.cash_collected_at) {
      cashCollectedAtVal = new Date().toISOString();
    }

    // Allow overriding financials (e.g. setting total=0 on cancellation)
    const targetTotal = total !== undefined ? parseFloat(total) || 0 : parseFloat(currentOrder.total) || 0;
    const targetSubtotal = subtotal !== undefined ? parseFloat(subtotal) || 0 : parseFloat(currentOrder.subtotal) || 0;
    const targetDeliveryFee = delivery_fee !== undefined ? parseFloat(delivery_fee) || 0 : parseFloat(currentOrder.delivery_fee) || 0;
    const targetDiscount = discount !== undefined ? parseFloat(discount) || 0 : parseFloat(currentOrder.discount) || 0;

    // 2. Update orders table with strict null checks
    const result = await query(
      `UPDATE orders SET
       status = COALESCE($1, status),
       driver_name = COALESCE($2, driver_name),
       driver_id = COALESCE($3, driver_id),
       dispatched_at = $4,
       delivered_to_customer_at = $5,
       is_cash_collected = $6,
       cash_collected_at = $7,
       total = $8,
       subtotal = $9,
       delivery_fee = $10,
       discount = $11
       WHERE id = $12 RETURNING *`,
      [
        targetStatus || null,
        targetDriverName || null,
        targetDriverId || null,
        dispatchedAtValue || null,
        deliveredAtValue || null,
        cashCollectedVal,
        cashCollectedAtVal || null,
        targetTotal,
        targetSubtotal,
        targetDeliveryFee,
        targetDiscount,
        id
      ]
    );

    const updatedOrder = result.rows[0] || { ...currentOrder, status: targetStatus, total: targetTotal, is_cash_collected: Boolean(cashCollectedVal) };

    // 3. Update driver attendance queue status
    if (targetDriverName || targetDriverId) {
      const cleanName = (targetDriverName || '').trim();
      const cleanId = (targetDriverId || '').trim();

      if (targetStatus === 'dispatched' || targetStatus === 'out_for_delivery' || targetStatus === 'preparing') {
        await query(
          `UPDATE driver_attendance SET status = 'on_delivery', current_order_id = $1
           WHERE (TRIM(driver_name) = $2 OR driver_name LIKE $2 OR (driver_id = $3 AND $3 != '')) AND check_out_time IS NULL`,
          [id, cleanName, cleanId]
        );
      } else if (targetStatus === 'delivered' || targetStatus === 'completed' || targetStatus === 'cancelled') {
        await query(
          `UPDATE driver_attendance SET status = 'ready', current_order_id = NULL, check_in_time = CURRENT_TIMESTAMP
           WHERE (TRIM(driver_name) = $1 OR driver_name LIKE $1 OR (driver_id = $2 AND $2 != '')) AND check_out_time IS NULL`,
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

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await query('DELETE FROM order_items WHERE order_id = $1', [id]);
    await query('DELETE FROM orders WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('❌ Error in DELETE /api/orders/[id]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
