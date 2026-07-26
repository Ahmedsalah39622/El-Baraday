import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get('limit');
    const parsedLimit = parseInt(rawLimit, 10);
    const limit = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100;
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const branchId = searchParams.get('branch_id');

    let sql = `
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
    `;
    const params = [];
    const conditions = [];

    if (branchId && branchId !== 'all') {
      params.push(branchId);
      conditions.push(`o.branch_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }
    if (date) {
      params.push(date);
      conditions.push(`o.created_at::date = $${params.length}`);
    }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` GROUP BY o.id, b.name ORDER BY o.created_at DESC LIMIT $${params.length + 1}`;
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
      discount, total, paid_amount, remaining_amount, cashier_name, items,
      branch_id, status
    } = body;

    const targetBranch = branch_id || 'b1';

    // Default status: delivery orders start as 'preparing' (dispatched_at stays NULL until "الطيار استلم" is clicked)
    const initialStatus = status || (order_type === 'delivery' ? 'preparing' : 'completed');
    const isDispatched = initialStatus === 'dispatched' || initialStatus === 'out_for_delivery';

    // Get next sequential order number ISOLATED FOR THIS SPECIFIC BRANCH
    const nextRes = await query(
      "SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders WHERE branch_id = $1",
      [targetBranch]
    );
    const nextNum = (nextRes.rows && nextRes.rows.length > 0 && nextRes.rows[0].next) ? parseInt(nextRes.rows[0].next) : 1;

    // Insert order into DB with branch_id and dispatched_at (dispatched_at is NULL for new delivery orders)
    const orderResult = await query(
      `INSERT INTO orders (id, order_number, order_type, customer_name, customer_phone, customer_area,
        customer_address, driver_name, driver_id, subtotal, delivery_fee, discount, total,
        paid_amount, remaining_amount, cashier_name, status, branch_id, dispatched_at)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [nextNum, order_type || 'dine_in', customer_name || null, customer_phone || null, customer_area || null,
        customer_address || null, driver_name || null, driver_id || null, subtotal || 0, delivery_fee || 0,
        discount || 0, total || 0, paid_amount || 0, remaining_amount || 0,
        cashier_name || 'administrator', initialStatus, targetBranch, isDispatched ? new Date().toISOString() : null]
    );

    const order = (orderResult.rows && orderResult.rows.length > 0) ? orderResult.rows[0] : {
      id: `ord_${Date.now()}`,
      order_number: nextNum,
      order_type: order_type || 'dine_in',
      customer_name,
      total,
      cashier_name: cashier_name || 'administrator',
      status: initialStatus,
      branch_id: targetBranch,
      dispatched_at: isDispatched ? new Date().toISOString() : null,
      created_at: new Date().toISOString()
    };

    // Insert items
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

    // If order was explicitly created as dispatched, update driver status
    if (isDispatched && (driver_name || driver_id)) {
      const cleanName = (driver_name || '').trim();
      const cleanId = (driver_id || '').trim();
      await query(
        `UPDATE driver_attendance
         SET status = 'on_delivery', current_order_id = $1
         WHERE (TRIM(driver_name) = $2 OR driver_name ILIKE $2 OR (driver_id = $3 AND $3 != ''))
         AND check_out_time IS NULL`,
        [order.id, cleanName, cleanId]
      );
    }

    // 📱 Server-side Automatic WhatsApp Notification via Green API
    if (customer_phone && String(customer_phone).trim()) {
      try {
        // Lookup driver phone
        let targetDriverPhone = '';
        if (driver_name || driver_id) {
          const dRes = await query(
            'SELECT phone FROM drivers WHERE (id = $1 AND $1 != \'\') OR (name = $2 AND $2 != \'\') LIMIT 1',
            [driver_id || '', driver_name || '']
          );
          if (dRes.rows && dRes.rows.length > 0) targetDriverPhone = dRes.rows[0].phone || '';
        }

        const settingsRes = await query("SELECT key, value FROM app_settings WHERE key LIKE 'whatsapp_%'");
        const settings = {};
        (settingsRes.rows || []).forEach(row => { settings[row.key] = row.value; });

        const isEnabled = settings.whatsapp_enabled !== 'false';
        const instanceId = (settings.whatsapp_instance_id || '').trim();
        const token = (settings.whatsapp_token || '').trim();

        if (isEnabled && instanceId && token) {
          const hostPrefix = instanceId.length >= 4 && !isNaN(instanceId.slice(0, 4)) ? instanceId.slice(0, 4) : '';
          const hostUrl = hostPrefix ? `https://${hostPrefix}.api.greenapi.com` : 'https://api.green-api.com';
          const url = `${hostUrl}/waInstance${instanceId}/sendMessage/${token}`;

          let rawDigits = String(customer_phone).replace(/\D/g, '');
          if (rawDigits.startsWith('01') && rawDigits.length === 11) rawDigits = '2' + rawDigits;
          const chatId = rawDigits.endsWith('@c.us') ? rawDigits : `${rawDigits}@c.us`;

          let itemsText = (items || []).map((it, idx) => `${idx + 1}. ${it.product_name || it.name || 'صنف'}${it.size ? ` (${it.size})` : ''} × ${it.quantity || 1} = ${(it.price || 0) * (it.quantity || 1)} ج.م`).join('\n');

          let msg = `🍟 *مطعم البرادعي للحواوشي* 🍔\n`;
          msg += `أهلاً بك يا *${customer_name || 'عميلنا العزيز'}* 👋\n\n`;
          msg += `تم تنفيذ طلب الدليفري الخاص بك بنجاح! 🎉\n`;
          msg += `📌 *رقم الطلب:* #${nextNum}\n\n`;
          msg += `📋 *تفاصيل الطلب:*\n${itemsText || 'تفاصيل الطلب مسجلة بالسيستم'}\n`;
          msg += `─────────────────\n`;
          if (delivery_fee > 0) msg += `🚚 *رسوم التوصيل:* ${delivery_fee} ج.م\n`;
          msg += `💵 *الإجمالي المطلوب:* *${total} ج.م*\n\n`;
          msg += `🛵 *بيانات طيار التوصيل:*\n`;
          msg += `👤 *الطيار:* ${driver_name || 'طاقم التوصيل'}\n`;
          if (targetDriverPhone) msg += `📞 *رقم تليفون الطيار:* ${targetDriverPhone}\n`;
          if (customer_address) msg += `\n📍 *عنوان التوصيل:* ${customer_address}\n`;
          msg += `\nنتمنى لك وجبة شهية! 😋❤️`;

          console.log(`📡 [SERVER] Sending automatic WhatsApp to ${chatId} via Green-API`);

          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message: msg })
          })
            .then(r => r.json())
            .then(res => console.log('✅ [SERVER] Green API result:', res))
            .catch(err => console.error('❌ [SERVER] Green API error:', err));
        }
      } catch (waErr) {
        console.error('❌ Error in server-side WhatsApp trigger:', waErr);
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

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, status, driver_id, driver_name } = body;
    if (!id) return NextResponse.json({ error: 'Order ID required' }, { status: 400 });

    let sql = 'UPDATE orders SET status = $1';
    const params = [status, id];

    if (status === 'out_for_delivery' || status === 'dispatched') {
      sql += ', dispatched_at = CURRENT_TIMESTAMP';
    }
    if (driver_id) {
      params.push(driver_id);
      sql += `, driver_id = $${params.length}`;
    }
    if (driver_name) {
      params.push(driver_name);
      sql += `, driver_name = $${params.length}`;
    }

    sql += ' WHERE id = $2 RETURNING *';

    const res = await query(sql, params);

    // If driver status changed
    if (driver_name || driver_id) {
      const cleanName = (driver_name || '').trim();
      const cleanId = (driver_id || '').trim();

      if (status === 'out_for_delivery' || status === 'dispatched') {
        await query(
          `UPDATE driver_attendance
           SET status = 'on_delivery', current_order_id = $1
           WHERE (TRIM(driver_name) = $2 OR driver_name ILIKE $2 OR (driver_id = $3 AND $3 != ''))
           AND check_out_time IS NULL`,
          [id, cleanName, cleanId]
        );
      } else if (status === 'completed' || status === 'delivered') {
        await query(
          `UPDATE driver_attendance
           SET status = 'ready', current_order_id = NULL, check_in_time = CURRENT_TIMESTAMP
           WHERE (TRIM(driver_name) = $1 OR driver_name ILIKE $1 OR (driver_id = $2 AND $2 != ''))
           AND check_out_time IS NULL`,
          [cleanName, cleanId]
        );
      }
    }

    return NextResponse.json(res.rows[0] || { message: 'Updated' });
  } catch (error) {
    console.error('❌ Error updating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
