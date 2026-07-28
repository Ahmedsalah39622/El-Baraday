import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await query('SELECT * FROM branches ORDER BY name ASC');
    return NextResponse.json(res.rows || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('Error fetching branches:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, phone, address } = body;
    if (!name) {
      return NextResponse.json({ error: 'اسم الفرع مطلوب' }, { status: 400 });
    }

    // Generate a unique id since the column is VARCHAR PRIMARY KEY (no auto-increment)
    const newId = `b_${Date.now()}`;

    const res = await query(
      `INSERT INTO branches (id, name, phone, address) VALUES ($1, $2, $3, $4) RETURNING *`,
      [newId, name, phone || '', address || '']
    );

    return NextResponse.json(res.rows[0] || { id: newId, name, phone, address });
  } catch (err) {
    console.error('Error creating branch:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, name, phone, address, is_active } = body;
    if (!id || !name) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const res = await query(
      `UPDATE branches SET name = $1, phone = $2, address = $3, is_active = $4 WHERE id = $5 RETURNING *`,
      [name, phone || '', address || '', is_active !== false, id]
    );

    return NextResponse.json(res.rows[0]);
  } catch (err) {
    console.error('Error updating branch:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
