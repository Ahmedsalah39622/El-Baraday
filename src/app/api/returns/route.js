import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let returnTablesChecked = false;
async function ensureReturnTables() {
  if (returnTablesChecked) return;
  try {
    // Create order_returns table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS order_returns (
        id VARCHAR(100) PRIMARY KEY,
        order_id VARCHAR(100) NOT NULL,
        order_number VARCHAR(100),
        return_type VARCHAR(50) DEFAULT 'partial',
        returned_items JSON,
        subtotal_returned DECIMAL(10, 2) DEFAULT 0,
        total_returned DECIMAL(10, 2) NOT NULL DEFAULT 0,
        reason TEXT,
        cashier_name VARCHAR(255) DEFAULT 'administrator',
        branch_id VARCHAR(100) DEFAULT 'b1',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    console.error('Error creating order_returns table:', e);
  }
  returnTablesChecked = true;
}

export async function GET(request) {
  try {
    await ensureReturnTables();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let sql = 'SELECT * FROM order_returns';
    const params = [];

    if (branchId && branchId !== 'all') {
      sql += ' WHERE branch_id = $1';
      params.push(branchId);
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await query(sql, params);
    const returns = (result.rows || []).map((ret) => {
      let itemsArr = [];
      try {
        itemsArr = typeof ret.returned_items === 'string' 
          ? JSON.parse(ret.returned_items) 
          : (ret.returned_items || []);
      } catch (e) {
        itemsArr = [];
      }
      return {
        ...ret,
        returned_items: itemsArr,
      };
    });

    return NextResponse.json(returns);
  } catch (error) {
    console.error('❌ Error fetching returns:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    await ensureReturnTables();
    const body = await request.json();
    const {
      order_id,
      return_type = 'partial', // 'partial' | 'full'
      returned_items = [],
      total_returned = 0,
      reason = '',
      cashier_name = 'administrator',
      branch_id = 'b1',
    } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'مطلوب معرف الطلب' }, { status: 400 });
    }

    // 1. Fetch original order
    const orderRes = await query('SELECT * FROM orders WHERE id = $1', [order_id]);
    if (!orderRes.rows || orderRes.rows.length === 0) {
      return NextResponse.json({ error: 'الطلب غير موجود في قاعدة البيانات' }, { status: 404 });
    }
    const order = orderRes.rows[0];

    // Fetch existing order items
    const itemsRes = await query('SELECT * FROM order_items WHERE order_id = $1', [order_id]);
    const existingItems = itemsRes.rows || [];

    let calculatedTotalReturned = parseFloat(total_returned) || 0;
    let subtotalReturned = 0;

    // 2. Perform database updates based on return_type
    if (return_type === 'full') {
      // FULL RETURN
      subtotalReturned = parseFloat(order.subtotal) || 0;
      if (!calculatedTotalReturned) calculatedTotalReturned = parseFloat(order.total) || 0;

      // Update Order Status to 'refunded' and reset total
      await query(
        `UPDATE orders
         SET status = 'refunded', subtotal = 0, total = 0, paid_amount = 0, remaining_amount = 0
         WHERE id = $1`,
        [order_id]
      );

      // Update item quantities to 0 or delete
      await query('DELETE FROM order_items WHERE order_id = $1', [order_id]);

    } else {
      // PARTIAL RETURN
      for (const retItem of returned_items) {
        const retQty = parseInt(retItem.quantity) || 1;
        const itemPrice = parseFloat(retItem.price) || 0;
        subtotalReturned += itemPrice * retQty;

        // Find match in existing items
        const match = existingItems.find(
          (e) => e.id === retItem.id || (e.product_name === retItem.name || e.product_name === retItem.product_name)
        );

        if (match) {
          const currentQty = parseInt(match.quantity) || 1;
          const newQty = currentQty - retQty;

          if (newQty <= 0) {
            await query('DELETE FROM order_items WHERE id = $1', [match.id]);
          } else {
            await query('UPDATE order_items SET quantity = $1 WHERE id = $2', [newQty, match.id]);
          }
        }
      }

      if (!calculatedTotalReturned) calculatedTotalReturned = subtotalReturned;

      // Recalculate remaining total
      const remItemsRes = await query('SELECT * FROM order_items WHERE order_id = $1', [order_id]);
      const remainingItems = remItemsRes.rows || [];

      const newSubtotal = remainingItems.reduce(
        (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
        0
      );

      const deliveryFee = parseFloat(order.delivery_fee) || 0;
      const discount = parseFloat(order.discount) || 0;
      const newTotal = Math.max(0, newSubtotal + deliveryFee - discount);
      const newStatus = remainingItems.length === 0 ? 'refunded' : 'partially_refunded';

      await query(
        `UPDATE orders
         SET subtotal = $1, total = $2, paid_amount = $2, remaining_amount = 0, status = $3
         WHERE id = $4`,
        [newSubtotal, newTotal, newStatus, order_id]
      );
    }

    // 3. Create Return Record in order_returns
    const returnId = `ret_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const itemsJson = JSON.stringify(returned_items);

    await query(
      `INSERT INTO order_returns
        (id, order_id, order_number, return_type, returned_items, subtotal_returned, total_returned, reason, cashier_name, branch_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        returnId,
        order_id,
        String(order.order_number),
        return_type,
        itemsJson,
        subtotalReturned,
        calculatedTotalReturned,
        reason || 'مرتجع عميل',
        cashier_name,
        branch_id || order.branch_id || 'b1',
      ]
    );

    // 4. Create Cash Out Deduction in Operational Expenses (خصم من النقدية والخزنة)
    try {
      await query(
        `INSERT INTO operational_expenses
          (id, branch_id, branch_name, title, category, amount, payment_method, notes, expense_date, created_at)
         VALUES
          (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          branch_id || order.branch_id || 'b1',
          'الفرع الرئيسي',
          `مرتجع طلب #${order.order_number} (${return_type === 'full' ? 'إرجاع كامل' : 'ارتجاع جزئي'})`,
          'مرتجعات',
          calculatedTotalReturned,
          'كاش الخزنة',
          `سبب الإرجاع: ${reason || 'غير محدد'} | الكاشير: ${cashier_name}`,
        ]
      );
    } catch (expErr) {
      console.warn('⚠️ Expense record creation warning:', expErr.message);
    }

    // Fetch updated order
    const updatedOrderRes = await query('SELECT * FROM orders WHERE id = $1', [order_id]);
    const updatedOrder = (updatedOrderRes.rows && updatedOrderRes.rows[0]) ? updatedOrderRes.rows[0] : null;

    const returnRecord = {
      id: returnId,
      order_id,
      order_number: String(order.order_number),
      return_type,
      returned_items: returned_items,
      subtotal_returned: subtotalReturned,
      total_returned: calculatedTotalReturned,
      reason,
      cashier_name,
      branch_id: branch_id || order.branch_id || 'b1',
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      returnRecord,
      updatedOrder,
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error executing return:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء معالجة المرتجع' }, { status: 500 });
  }
}
