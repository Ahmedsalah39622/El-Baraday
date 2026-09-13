import { query, isSchemaChecked, markSchemaChecked } from '@/lib/db';
import { NextResponse } from 'next/server';

async function ensureDriverPayoutsTable() {
  if (isSchemaChecked('driverPayouts')) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS driver_payouts (
        id VARCHAR(100) PRIMARY KEY,
        driver_id VARCHAR(100),
        driver_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        branch_id VARCHAR(100) DEFAULT 'b1',
        shift_id VARCHAR(100) DEFAULT NULL,
        paid_by VARCHAR(100) DEFAULT 'كاشير',
        payment_method VARCHAR(50) DEFAULT 'cash',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    markSchemaChecked('driverPayouts');
  } catch (e) {
    console.error('❌ Error creating driver_payouts table:', e);
  }
}

export async function GET(request) {
  try {
    await ensureDriverPayoutsTable();
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id');
    const driverName = searchParams.get('driver_name');

    let sql = 'SELECT * FROM driver_payouts';
    const params = [];
    const conditions = [];

    if (branchId && branchId !== 'all') {
      params.push(branchId);
      conditions.push(`branch_id = $${params.length}`);
    }
    if (driverName && driverName !== 'all') {
      params.push(driverName);
      conditions.push(`driver_name = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';

    const payoutsRes = await query(sql, params);
    const payouts = payoutsRes.rows || [];

    // Aggregations from all non-cancelled delivery orders
    const ordersFeeRes = await query(`
      SELECT 
        COALESCE(driver_name, '') as driver_name,
        COALESCE(SUM(delivery_fee), 0) as total_earned,
        COUNT(*) as total_orders
      FROM orders
      WHERE (order_type = 'delivery')
        AND status != 'cancelled'
        AND driver_name IS NOT NULL
        AND driver_name != ''
      GROUP BY driver_name
    `);

    // Aggregations of total paid per driver
    const paidSumRes = await query(`
      SELECT 
        COALESCE(driver_name, '') as driver_name,
        COALESCE(SUM(amount), 0) as total_paid
      FROM driver_payouts
      GROUP BY driver_name
    `);

    const summaries = {};
    (ordersFeeRes.rows || []).forEach(r => {
      const name = (r.driver_name || '').trim();
      if (!name) return;
      summaries[name] = {
        driver_name: name,
        total_earned: parseFloat(r.total_earned) || 0,
        total_orders: parseInt(r.total_orders, 10) || 0,
        total_paid: 0,
        remaining_balance: parseFloat(r.total_earned) || 0,
      };
    });

    (paidSumRes.rows || []).forEach(r => {
      const name = (r.driver_name || '').trim();
      if (!name) return;
      if (!summaries[name]) {
        summaries[name] = {
          driver_name: name,
          total_earned: 0,
          total_orders: 0,
          total_paid: 0,
          remaining_balance: 0,
        };
      }
      summaries[name].total_paid = parseFloat(r.total_paid) || 0;
      summaries[name].remaining_balance = summaries[name].total_earned - summaries[name].total_paid;
    });

    return NextResponse.json({
      payouts,
      summaries
    });
  } catch (error) {
    console.error('❌ Error fetching driver payouts:', error);
    return NextResponse.json({ payouts: [], summaries: {}, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureDriverPayoutsTable();
    const body = await request.json();
    const {
      driver_id,
      driver_name,
      amount,
      branch_id,
      shift_id,
      paid_by,
      payment_method,
      notes,
      record_as_expense = true
    } = body;

    if (!driver_name || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'اسم الطيار والمبلغ المراد صرفه مطلوبان ويجب أن يكون المبلغ أكبر من 0' }, { status: 400 });
    }

    const payAmount = parseFloat(amount);

    const result = await query(`
      INSERT INTO driver_payouts 
        (id, driver_id, driver_name, amount, branch_id, shift_id, paid_by, payment_method, notes, created_at)
      VALUES 
        (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `, [
      driver_id || null,
      driver_name,
      payAmount,
      branch_id || 'b1',
      shift_id || null,
      paid_by || 'كاشير',
      payment_method || 'cash',
      notes || `صرف خدمات توصيل للطيار ${driver_name}`
    ]);

    const createdPayout = (result.rows && result.rows[0]) || {
      id: 'payout_' + Date.now(),
      driver_id,
      driver_name,
      amount: payAmount,
      branch_id: branch_id || 'b1',
      shift_id: shift_id || null,
      paid_by: paid_by || 'كاشير',
      payment_method: payment_method || 'cash',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    // Optional: Record as an operational expense so it deducts from till cash / finances
    if (record_as_expense) {
      try {
        await query(`
          INSERT INTO operational_expenses 
            (id, branch_id, branch_name, title, category, amount, payment_method, notes, expense_date, created_at)
          VALUES 
            (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, CURDATE(), NOW())
        `, [
          branch_id || 'b1',
          branch_id === 'b2' ? 'فرع المسلة' : 'فرع عزت',
          `صرف خدمة دليفري - الطيار ${driver_name}`,
          'خدمات دليفري للطيارين',
          payAmount,
          payment_method === 'cash' ? 'كاش الخزنة' : (payment_method || 'كاش الخزنة'),
          `صرف مبلغ ${payAmount} ج.م من خدمات التوصيل للطيار ${driver_name} - كود السند #${createdPayout.id.slice(0, 8)}. ${notes || ''}`
        ]);
      } catch (expErr) {
        console.warn('⚠️ Could not record expense for driver payout:', expErr.message);
      }
    }

    return NextResponse.json(createdPayout, { status: 201 });
  } catch (error) {
    console.error('❌ Error recording driver payout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await ensureDriverPayoutsTable();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف السند مطلوب' }, { status: 400 });
    }

    await query('DELETE FROM driver_payouts WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting driver payout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
