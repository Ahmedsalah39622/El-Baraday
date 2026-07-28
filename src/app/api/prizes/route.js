import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

let prizeTablesChecked = false;
async function ensurePrizeTables() {
  if (prizeTablesChecked) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS prize_draws (
        id VARCHAR(100) PRIMARY KEY,
        prize_title VARCHAR(255) NOT NULL,
        winner_name VARCHAR(255) NOT NULL,
        winner_phone VARCHAR(100),
        customer_id VARCHAR(100),
        invoice_number VARCHAR(100),
        draw_type VARCHAR(50) DEFAULT 'raffle',
        status VARCHAR(50) DEFAULT 'claimed',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {}
  prizeTablesChecked = true;
}

export async function GET(request) {
  try {
    await ensurePrizeTables();
    const result = await query('SELECT * FROM prize_draws ORDER BY created_at DESC LIMIT 100');
    return NextResponse.json(result.rows || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensurePrizeTables();
    const body = await request.json();
    const {
      prize_title, winner_name, winner_phone, customer_id, invoice_number, draw_type, notes
    } = body;

    const id = `draw_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const result = await query(
      `INSERT INTO prize_draws (id, prize_title, winner_name, winner_phone, customer_id, invoice_number, draw_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, prize_title || 'جائزة البرادعي الكبرى', winner_name, winner_phone || '', customer_id || null, invoice_number || null, draw_type || 'raffle', notes || 'سحب عشوائي']
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
