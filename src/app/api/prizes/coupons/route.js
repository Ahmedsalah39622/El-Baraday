import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let couponsTableChecked = false;
async function ensureCouponsTable() {
  if (couponsTableChecked) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS raffle_coupons (
        id VARCHAR(100) PRIMARY KEY,
        coupon_number VARCHAR(100) NOT NULL UNIQUE,
        customer_id VARCHAR(100),
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(100),
        invoice_number VARCHAR(100),
        raffle_title VARCHAR(255) DEFAULT 'سحب الجائزة الكبرى',
        printed_by VARCHAR(100) DEFAULT 'administrator',
        status VARCHAR(50) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {}
  couponsTableChecked = true;
}

export async function GET() {
  try {
    await ensureCouponsTable();
    const result = await query('SELECT * FROM raffle_coupons ORDER BY created_at DESC LIMIT 200');
    return NextResponse.json(result.rows || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureCouponsTable();
    const body = await request.json();
    const {
      coupon_number, customer_name, customer_phone, invoice_number, raffle_title, printed_by
    } = body;

    const couponNum = coupon_number || Math.floor(100000 + Math.random() * 900000).toString();
    const id = `coup_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    let customerId = null;

    // Check if customer exists in `customers` table or create them automatically
    if (customer_phone && customer_phone.trim()) {
      const existing = await query('SELECT id FROM customers WHERE phone = $1 LIMIT 1', [customer_phone.trim()]);
      if (existing.rows && existing.rows.length > 0) {
        customerId = existing.rows[0].id;
      } else if (customer_name && customer_name.trim()) {
        const newCustId = `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        await query(
          'INSERT INTO customers (id, name, phone) VALUES ($1, $2, $3)',
          [newCustId, customer_name.trim(), customer_phone.trim()]
        );
        customerId = newCustId;
      }
    }

    const result = await query(
      `INSERT INTO raffle_coupons (id, coupon_number, customer_id, customer_name, customer_phone, invoice_number, raffle_title, printed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, couponNum, customerId, customer_name || 'عميل المحل', customer_phone || '', invoice_number || null, raffle_title || 'سحب الجائزة الكبرى', printed_by || 'administrator']
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
