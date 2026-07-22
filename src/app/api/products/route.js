import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT * FROM products ORDER BY sort_order ASC, created_at ASC');
    return NextResponse.json(result.rows || []);
  } catch (error) {
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, category_id, price, size, image_url, description, sort_order } = body;
    
    const result = await query(
      `INSERT INTO products (id, name, category_id, price, size, image_url, description, sort_order)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, category_id, price, size || 'كبير', image_url, description, sort_order || 0]
    );

    if (result.isFallback || !result.rows || result.rows.length === 0) {
      return NextResponse.json({
        id: `p_${Date.now()}`,
        name,
        category_id,
        price,
        size: size || 'كبير',
        image_url,
        description,
        is_available: true,
        sort_order: sort_order || 0,
      }, { status: 200 });
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}

// Bulk update sort orders in PostgreSQL DB
export async function PUT(request) {
  try {
    const items = await request.json(); // Array of { id, sort_order }
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.id && typeof item.sort_order === 'number') {
          await query('UPDATE products SET sort_order = $1 WHERE id = $2', [item.sort_order, item.id]);
        }
      }
    }
    const updatedResult = await query('SELECT * FROM products ORDER BY sort_order ASC, created_at ASC');
    return NextResponse.json(updatedResult.rows || []);
  } catch (error) {
    console.error('❌ Error updating product sort orders:', error);
    return NextResponse.json({ success: true });
  }
}
