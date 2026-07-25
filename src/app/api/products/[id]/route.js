import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) return NextResponse.json({ id }, { status: 200 });
    return NextResponse.json(result.rows[0], {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json({ id }, { status: 200 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      category_id,
      price,
      original_price,
      is_offer,
      offer_components,
      size,
      image_url,
      description,
      is_available,
      sort_order,
    } = body;

    const result = await query(
      `INSERT INTO products (id, name, category_id, price, original_price, is_offer, offer_components, size, image_url, description, is_available, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         category_id = EXCLUDED.category_id,
         price = EXCLUDED.price,
         original_price = EXCLUDED.original_price,
         is_offer = EXCLUDED.is_offer,
         offer_components = EXCLUDED.offer_components,
         size = EXCLUDED.size,
         image_url = EXCLUDED.image_url,
         description = EXCLUDED.description,
         is_available = EXCLUDED.is_available,
         sort_order = EXCLUDED.sort_order
       RETURNING *`,
      [
        id,
        name || 'منتج',
        category_id || '1',
        parseFloat(price) || 0,
        original_price ? parseFloat(original_price) : null,
        is_offer || false,
        offer_components || null,
        size || 'كبير',
        image_url || null,
        description || null,
        is_available !== false,
        parseInt(sort_order) || 0,
      ]
    );

    const updatedRow = result.rows && result.rows.length > 0 ? result.rows[0] : { id, ...body };

    return NextResponse.json(updatedRow, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('❌ Error updating product:', error);
    return NextResponse.json({ id }, { status: 200 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await query('DELETE FROM products WHERE id = $1', [id]);
    return NextResponse.json({ success: true, id }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: true, id });
  }
}
