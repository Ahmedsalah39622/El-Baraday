import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let wheelTableChecked = false;
async function ensureWheelTable() {
  if (wheelTableChecked) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS wheel_spins (
        id VARCHAR(100) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(100),
        prize_won VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {}
  wheelTableChecked = true;
}

export async function GET() {
  try {
    await ensureWheelTable();
    const result = await query('SELECT * FROM wheel_spins ORDER BY created_at DESC LIMIT 100');
    return NextResponse.json(result.rows || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureWheelTable();
    const body = await request.json();
    const { customer_name, customer_phone, prize_won } = body;

    const id = `spin_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const result = await query(
      `INSERT INTO wheel_spins (id, customer_name, customer_phone, prize_won)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, customer_name || 'عميل المحل', customer_phone || '', prize_won]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
