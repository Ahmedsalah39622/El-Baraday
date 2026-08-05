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
      discount,
      paid_amount,
      remaining_amount,
      customer_name,
      customer_phone,
      customer_address,
      customer_area,
      order_type,
      payment_method,
      items
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

    // Allow overriding financials
    const targetTotal = total !== undefined ? parseFloat(total) || 0 : parseFloat(currentOrder.total) || 0;
    const targetSubtotal = subtotal !== undefined ? parseFloat(subtotal) || 0 : parseFloat(currentOrder.subtotal) || 0;
    const targetDeliveryFee = delivery_fee !== undefined ? parseFloat(delivery_fee) || 0 : parseFloat(currentOrder.delivery_fee) || 0;
    const targetDiscount = discount !== undefined ? parseFloat(discount) || 0 : parseFloat(currentOrder.discount) || 0;
    const targetPaid = paid_amount !== undefined ? parseFloat(paid_amount) || 0 : parseFloat(currentOrder.paid_amount) || 0;
    const targetRemaining = remaining_amount !== undefined ? parseFloat(remaining_amount) || 0 : parseFloat(currentOrder.remaining_amount) || 0;

    // 2. Update orders table
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
       discount = $11,
       paid_amount = $12,
       remaining_amount = $13,
       customer_name = COALESCE($14, customer_name),
       customer_phone = COALESCE($15, customer_phone),
       customer_address = COALESCE($16, customer_address),
       customer_area = COALESCE($17, customer_area),
       order_type = COALESCE($18, order_type),
       payment_method = COALESCE($19, payment_method)
       WHERE id = $20 RETURNING *`,
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
        targetPaid,
        targetRemaining,
        customer_name !== undefined ? customer_name : null,
        customer_phone !== undefined ? customer_phone : null,
        customer_address !== undefined ? customer_address : null,
        customer_area !== undefined ? customer_area : null,
        order_type !== undefined ? order_type : null,
        payment_method !== undefined ? payment_method : null,
        id
      ]
    );

    let updatedOrder = result.rows[0] || { ...currentOrder, status: targetStatus, total: targetTotal };

    // 3. Update items if provided
    if (Array.isArray(items)) {
      await query('DELETE FROM order_items WHERE order_id = $1', [id]);
      for (const item of items) {
        const itemId = `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const prodId = item.product_id || item.id || null;
        const itemQty = parseInt(item.quantity) || 1;
        await query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity, size, extras, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [itemId, id, prodId, item.product_name || item.name || 'صنف',
           parseFloat(item.price) || 0, itemQty, item.size || null, item.extras || null, item.notes || null]
        );
      }
    }

    // Fetch latest items to return
    const itemsRes = await query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    updatedOrder.items = itemsRes.rows || [];

    // 4. Update driver attendance queue status
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
