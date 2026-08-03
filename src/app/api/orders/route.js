import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let orderColumnsChecked = false;
async function ensureOrderColumns() {
  if (orderColumnsChecked) return;
  try { await query('ALTER TABLE orders ADD COLUMN dispatched_at DATETIME DEFAULT NULL'); } catch(e){}
  try { await query('ALTER TABLE orders ADD COLUMN delivered_to_customer_at DATETIME DEFAULT NULL'); } catch(e){}
  try { await query('ALTER TABLE orders ADD COLUMN is_cash_collected TINYINT(1) DEFAULT 0'); } catch(e){}
  try { await query('ALTER TABLE orders ADD COLUMN cash_collected_at DATETIME DEFAULT NULL'); } catch(e){}
  orderColumnsChecked = true;
}

export async function GET(request) {
  try {
    await ensureOrderColumns();
    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get('limit');
    const parsedLimit = parseInt(rawLimit, 10);
    const limit = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 500;
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const branchId = searchParams.get('branch_id');

    let sql = `
      SELECT o.*, b.name as branch_name
      FROM orders o
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
      conditions.push(`DATE(o.created_at) = $${params.length}`);
    }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    const orders = result.rows || [];

    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(',');
      const itemsRes = await query(
        `SELECT * FROM order_items WHERE order_id IN (${placeholders})`,
        orderIds
      );
      const itemsMap = {};
      (itemsRes.rows || []).forEach(item => {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          name: item.product_name,
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1,
          size: item.size,
          extras: item.extras,
          notes: item.notes
        });
      });
      orders.forEach(o => {
        o.items = itemsMap[o.id] || [];
        o.is_cash_collected = Boolean(o.is_cash_collected);
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    await ensureOrderColumns();
    const body = await request.json();
    const {
      order_type, payment_method, customer_name, customer_phone, customer_area,
      customer_address, driver_name, driver_id, subtotal, delivery_fee,
      discount, total, paid_amount, remaining_amount, cashier_name, items,
      branch_id, status, is_cash_collected
    } = body;

    const targetBranch = branch_id || 'b1';
    const isDelivery = order_type === 'delivery';

    // Default status: delivery orders start as 'preparing'
    const initialStatus = status || (isDelivery ? 'preparing' : 'completed');
    const isDispatched = initialStatus === 'dispatched' || initialStatus === 'out_for_delivery';

    // Cash is collected immediately for dine_in / takeaway, but pending for delivery until confirmed
    const cashCollectedBool = is_cash_collected !== undefined ? Boolean(is_cash_collected) : (!isDelivery);
    const cashCollectedVal = cashCollectedBool ? 1 : 0;
    const cashCollectedAtVal = cashCollectedBool ? new Date().toISOString() : null;

    // Get next sequential order number STIRCTLY SCOPED TO ACTIVE SHIFT & BRANCH
    let nextNum = 1;
    try {
      let shiftSql = "SELECT start_time FROM shifts WHERE status = 'active'";
      const shiftParams = [];
      if (targetBranch && targetBranch !== 'all') {
        shiftSql += " AND (branch_id = $1 OR branch_id IS NULL OR branch_id = '' OR branch_id = 'all')";
        shiftParams.push(targetBranch);
      }
      shiftSql += " ORDER BY start_time DESC LIMIT 1";

      const shiftRes = await query(shiftSql, shiftParams);
      const activeShiftRecord = shiftRes.rows && shiftRes.rows[0];

      if (activeShiftRecord && activeShiftRecord.start_time) {
        const sql = (targetBranch && targetBranch !== 'all')
          ? "SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders WHERE branch_id = $1 AND created_at >= $2"
          : "SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders WHERE created_at >= $1";
        const params = (targetBranch && targetBranch !== 'all') ? [targetBranch, activeShiftRecord.start_time] : [activeShiftRecord.start_time];
        const nextRes = await query(sql, params);
        if (nextRes && nextRes.rows && nextRes.rows.length > 0 && nextRes.rows[0].next) {
          nextNum = parseInt(nextRes.rows[0].next) || 1;
        }
      } else {
        // Shift is closed -> new shift starts fresh from 1
        nextNum = 1;
      }
    } catch (err) {
      console.warn('⚠️ Standard nextNum query failed:', err.message);
      nextNum = 1;
    }

    const orderId = `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Insert order into DB with branch_id and payment_method
    const orderResult = await query(
      `INSERT INTO orders (id, order_number, order_type, payment_method, customer_name, customer_phone, customer_area,
        customer_address, driver_name, driver_id, subtotal, delivery_fee, discount, total,
        paid_amount, remaining_amount, cashier_name, status, branch_id, dispatched_at, is_cash_collected, cash_collected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       RETURNING *`,
      [orderId, nextNum, order_type || 'dine_in', payment_method || 'cash', customer_name || null, customer_phone || null, customer_area || null,
        customer_address || null, driver_name || null, driver_id || null, parseFloat(subtotal) || 0, parseFloat(delivery_fee) || 0,
        parseFloat(discount) || 0, parseFloat(total) || 0, parseFloat(paid_amount) || 0, parseFloat(remaining_amount) || 0,
        cashier_name || 'administrator', initialStatus, targetBranch, isDispatched ? new Date().toISOString() : null,
        cashCollectedVal, cashCollectedAtVal]
    );

    const order = (orderResult.rows && orderResult.rows.length > 0) ? orderResult.rows[0] : {
      id: orderId,
      order_number: nextNum,
      order_type: order_type || 'dine_in',
      customer_name,
      total,
      cashier_name: cashier_name || 'administrator',
      status: initialStatus,
      branch_id: targetBranch,
      is_cash_collected: cashCollectedBool,
      dispatched_at: isDispatched ? new Date().toISOString() : null,
      created_at: new Date().toISOString()
    };

    // Insert items
    if (items && items.length > 0) {
      for (const item of items) {
        const itemId = `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const prodId = item.product_id || item.id || null;
        const itemQty = parseInt(item.quantity) || 1;

        await query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity, size, extras, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [itemId, order.id, prodId, item.product_name || item.name || 'صنف',
          parseFloat(item.price) || 0, itemQty, item.size || null, item.extras || null, item.notes || null]
        );

        // 🥩 Automatic Inventory Raw Material Deductions (خصم الخامات والمكونات المربوطة بالأحجام)
        let baseProdId = prodId;
        if (baseProdId && (baseProdId.endsWith('_صغير') || baseProdId.endsWith('_كبير'))) {
          baseProdId = baseProdId.replace(/_(صغير|كبير)$/, '');
        }

        if (baseProdId) {
          try {
            const ingRes = await query(
              'SELECT inventory_item_id, quantity, size FROM product_ingredients WHERE product_id = $1 OR product_id = $2',
              [baseProdId, prodId]
            );

            if (ingRes.rows && ingRes.rows.length > 0) {
              const itemSize = (item.size || '').toString().trim().toLowerCase();

              for (const ing of ingRes.rows) {
                const ingSize = (ing.size || 'all').toString().trim().toLowerCase();

                // Match size logic
                const matchesSize = ingSize === 'all' || ingSize === 'عادي' ||
                                    ingSize === itemSize ||
                                    (itemSize.includes('صغير') && (ingSize.includes('صغير') || ingSize === 'small')) ||
                                    (itemSize.includes('كبير') && (ingSize.includes('كبير') || ingSize === 'large')) ||
                                    (!itemSize && ingSize === 'all');

                if (!matchesSize) continue;

                const deductAmount = (parseFloat(ing.quantity) || 0) * itemQty;
                if (deductAmount > 0) {
                  // Deduct from inventory_items current_stock
                  await query(
                    'UPDATE inventory_items SET current_stock = GREATEST(0, current_stock - $1) WHERE id = $2',
                    [deductAmount, ing.inventory_item_id]
                  );

                  // Log transaction
                  const transId = `trans_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                  await query(
                    `INSERT INTO inventory_transactions (id, item_id, type, quantity, notes)
                     VALUES ($1, $2, 'out', $3, $4)`,
                    [transId, ing.inventory_item_id, deductAmount, `خصم أوتوماتيكي (${item.size || 'عادي'}) - طلب #${nextNum}`]
                  );
                }
              }
            }
          } catch (e) {
            console.warn('⚠️ Inventory deduction error for item:', prodId, e.message);
          }
        }
      }
    }

    // If order has a driver assigned, update driver status immediately (even if still preparing)
    if ((initialStatus === 'preparing' || isDispatched) && (driver_name || driver_id)) {
      const cleanName = (driver_name || '').trim();
      const cleanId = (driver_id || '').trim();
      await query(
        `UPDATE driver_attendance
         SET status = 'on_delivery', current_order_id = $1
         WHERE (TRIM(driver_name) = $2 OR driver_name LIKE $2 OR (driver_id = $3 AND $3 != ''))
         AND check_out_time IS NULL`,
        [order.id, cleanName, cleanId]
      );
    }

    // 📱 Server-side Automatic WhatsApp Notification via Green API
    if (customer_phone && String(customer_phone).trim()) {
      try {
        let targetDriverPhone = '';
        if (driver_name || driver_id) {
          const dRes = await query(
            'SELECT phone FROM drivers WHERE (id = $1 AND $1 != \'\') OR (name = $2 AND $2 != \'\') LIMIT 1',
            [driver_id || '', driver_name || '']
          );
          if (dRes.rows && dRes.rows.length > 0) targetDriverPhone = dRes.rows[0].phone || '';
        }

        const settingsRes = await query("SELECT `key`, value FROM app_settings WHERE `key` LIKE 'whatsapp_%'");
        const settingsMap = {};
        if (settingsRes.rows) {
          settingsRes.rows.forEach((r) => { settingsMap[r.key] = r.value; });
        }

        const instanceId = settingsMap.whatsapp_instance_id || '7103131720';
        const apiToken = settingsMap.whatsapp_api_token || 'ef5cc1024bd3415db99710f63901b0fbbd0a3dcf19c44dd3aa';
        const isAutoNotifyEnabled = settingsMap.whatsapp_auto_notify !== 'false';

        if (isAutoNotifyEnabled && instanceId && apiToken) {
          let cleanPhone = String(customer_phone).replace(/\D/g, '');
          if (cleanPhone.startsWith('01')) cleanPhone = '2' + cleanPhone;
          const chatId = `${cleanPhone}@c.us`;

          let msg = `✨ *مطعم البردعي - حواوشي ولحوم طازجة* ✨\n\n`;
          msg += `شكراً لطلبك! تم تسجيل طلبك بنجاح ❤️\n`;
          msg += `🧾 *رقم الطلب:* #${nextNum}\n`;
          msg += `💰 *الإجمالي:* ${total} ج.م\n`;

          if (order_type === 'delivery') {
            msg += `🛵 *نوع الطلب:* دليفري (توصيل للمنزل)\n`;
            if (driver_name) msg += `🚴 *الطيار المسؤول:* ${driver_name}\n`;
            if (targetDriverPhone) msg += `📞 *رقم الطيار:* ${targetDriverPhone}\n`;
            if (customer_address) msg += `📍 *عنوان التوصيل:* ${customer_address}\n`;
          }

          msg += `\nنتمنى لك وجبة شهية لديدة! 🍔🥩`;

          fetch(`https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message: msg }),
          }).catch((err) => console.warn('⚠️ WhatsApp API error:', err.message));
        }
      } catch (err) {
        console.warn('⚠️ WhatsApp notification error:', err.message);
      }
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
