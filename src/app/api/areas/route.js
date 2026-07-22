import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT * FROM delivery_areas ORDER BY name');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, delivery_fee } = body;
    const result = await query(
      `INSERT INTO delivery_areas (id, name, delivery_fee)
       VALUES (gen_random_uuid()::TEXT, $1, $2) RETURNING *`,
      [name, delivery_fee || 15]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
