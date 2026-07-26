import { query } from '@/lib/db';
import { NextResponse } from 'next/server';



export async function GET() {
  try {
    const result = await query('SELECT * FROM products ORDER BY sort_order ASC, created_at ASC');

    return NextResponse.json(result.rows || [], {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function DELETE() {
  try {
    await query('DELETE FROM products');
    return NextResponse.json({ success: true, message: 'All products deleted' }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, name, category_id, price, original_price, is_offer, offer_components, size, image_url, description, sort_order } = body;
    
    const productId = id || `p_${Date.now()}`;

    const result = await query(
      `INSERT INTO products (id, name, category_id, price, original_price, is_offer, offer_components, size, image_url, description, sort_order, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
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
         sort_order = EXCLUDED.sort_order,
         is_available = EXCLUDED.is_available
       RETURNING *`,
      [productId, name, category_id || '5', parseFloat(price) || 0, original_price ? parseFloat(original_price) : null, is_offer || false, offer_components || null, size || 'كبير', image_url || null, description || null, parseInt(sort_order) || 0]
    );

    if (result.isFallback || !result.rows || result.rows.length === 0) {
      return NextResponse.json({
        id: productId,
        name,
        category_id: category_id || '5',
        price: parseFloat(price) || 0,
        original_price: original_price ? parseFloat(original_price) : null,
        is_offer: is_offer || false,
        offer_components: offer_components || null,
        size: size || 'كبير',
        image_url,
        description,
        is_available: true,
        sort_order: parseInt(sort_order) || 0,
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
    return NextResponse.json(updatedResult.rows || [], {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('❌ Error updating product sort orders:', error);
    return NextResponse.json({ success: true });
  }
}
