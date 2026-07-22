import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT * FROM categories ORDER BY sort_order');
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, name, icon, sort_order } = body;
    const result = await query(
      `INSERT INTO categories (id, name, icon, sort_order) VALUES ($1, $2, $3, $4) RETURNING *`,
      [id || `cat_${Date.now()}`, name, icon, sort_order || 0]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
