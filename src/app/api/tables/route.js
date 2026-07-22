import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT * FROM restaurant_tables ORDER BY number');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { number, seats } = body;
    const result = await query(
      `INSERT INTO restaurant_tables (id, number, seats) VALUES (gen_random_uuid()::TEXT, $1, $2) RETURNING *`,
      [number, seats || 4]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
