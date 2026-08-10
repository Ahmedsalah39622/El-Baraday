import { query, isSchemaChecked, markSchemaChecked } from '@/lib/db';
import { NextResponse } from 'next/server';

async function ensureSizeColumns() {
  if (isSchemaChecked('productCols')) return;
  try { await query('ALTER TABLE products ADD COLUMN has_sizes TINYINT(1) DEFAULT 0'); } catch(e){}
  try { await query('ALTER TABLE products ADD COLUMN price_small DECIMAL(10, 2) DEFAULT NULL'); } catch(e){}
  try { await query('ALTER TABLE products ADD COLUMN price_large DECIMAL(10, 2) DEFAULT NULL'); } catch(e){}
  try { await query('ALTER TABLE products ADD COLUMN sizes JSON DEFAULT NULL'); } catch(e){}
  try { await query('ALTER TABLE products MODIFY COLUMN image_url LONGTEXT'); } catch(e){}
  markSchemaChecked('productCols');
}


export async function GET() {
  try {
    ensureSizeColumns().catch(() => {});
    let result;
    try {
      result = await query('SELECT * FROM products ORDER BY sort_order ASC');
    } catch(e) {
      result = await query('SELECT * FROM products');
    }

    if (result && result.isFallback) {
      return NextResponse.json({ error: result.error || 'Database error' }, { status: 500 });
    }

    return NextResponse.json(result.rows || [], {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    await ensureSizeColumns();
    const body = await request.json();
    const {
      id,
      name,
      category_id,
      price,
      original_price,
      is_offer,
      offer_components,
      size,
      has_sizes,
      price_small,
      price_large,
      sizes,
      image_url,
      description,
      sort_order
    } = body;
    
    const productId = id || `p_${Date.now()}`;
    const sizesVal = sizes ? (typeof sizes === 'string' ? sizes : JSON.stringify(sizes)) : null;

    const result = await query(
      `INSERT INTO products (id, name, category_id, price, original_price, is_offer, offer_components, size, has_sizes, price_small, price_large, sizes, image_url, description, sort_order, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         category_id = EXCLUDED.category_id,
         price = EXCLUDED.price,
         original_price = EXCLUDED.original_price,
         is_offer = EXCLUDED.is_offer,
         offer_components = EXCLUDED.offer_components,
         size = EXCLUDED.size,
         has_sizes = EXCLUDED.has_sizes,
         price_small = EXCLUDED.price_small,
         price_large = EXCLUDED.price_large,
         sizes = EXCLUDED.sizes,
         image_url = EXCLUDED.image_url,
         description = EXCLUDED.description,
         sort_order = EXCLUDED.sort_order,
         is_available = EXCLUDED.is_available
       RETURNING *`,
      [
        productId,
        name,
        category_id || '1',
        parseFloat(price) || 0,
        original_price ? parseFloat(original_price) : null,
        is_offer || false,
        offer_components || null,
        size || 'كبير',
        has_sizes ? 1 : 0,
        price_small ? parseFloat(price_small) : null,
        price_large ? parseFloat(price_large) : null,
        sizesVal,
        image_url || null,
        description || null,
        parseInt(sort_order) || 0
      ]
    );

    if (result.isFallback || !result.rows || result.rows.length === 0) {
      return NextResponse.json({
        id: productId,
        name,
        category_id: category_id || '1',
        price: parseFloat(price) || 0,
        original_price: original_price ? parseFloat(original_price) : null,
        is_offer: is_offer || false,
        offer_components: offer_components || null,
        size: size || 'كبير',
        has_sizes: Boolean(has_sizes),
        price_small: price_small ? parseFloat(price_small) : null,
        price_large: price_large ? parseFloat(price_large) : null,
        sizes,
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

// Bulk update sort orders
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
