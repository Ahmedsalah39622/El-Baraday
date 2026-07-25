import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

const defaultHawawshiProducts = [
  { id: 'p1', category_id: '1', name: 'حواوشي ساده صغير', price: 45, size: 'صغير', image_url: '/images/hawawshi_sade.png', sort_order: 1, is_available: true },
  { id: 'p2', category_id: '1', name: 'حواوشي ساده كبير', price: 75, size: 'كبير', image_url: '/images/hawawshi_sade.png', sort_order: 2, is_available: true },
  { id: 'p3', category_id: '1', name: 'حواوشي فراخ صغير', price: 55, size: 'صغير', image_url: '/images/hawawshi_chicken.png', sort_order: 3, is_available: true },
  { id: 'p4', category_id: '1', name: 'حواوشي فراخ كبير', price: 90, size: 'كبير', image_url: '/images/hawawshi_chicken.png', sort_order: 4, is_available: true },
  { id: 'p5', category_id: '1', name: 'حواوشي سلامي صغير', price: 65, size: 'صغير', image_url: '/images/hawawshi_salami.png', sort_order: 5, is_available: true },
  { id: 'p6', category_id: '1', name: 'حواوشي سلامي كبير', price: 110, size: 'كبير', image_url: '/images/hawawshi_salami.png', sort_order: 6, is_available: true },
  { id: 'p7', category_id: '1', name: 'حواوشي سجق صغير', price: 60, size: 'صغير', image_url: '/images/hawawshi_sausage.png', sort_order: 7, is_available: true },
  { id: 'p8', category_id: '1', name: 'حواوشي سجق كبير', price: 100, size: 'كبير', image_url: '/images/hawawshi_sausage.png', sort_order: 8, is_available: true },
  { id: 'p9', category_id: '2', name: 'حواوشي ميكس أجبان صغير', price: 70, size: 'صغير', image_url: '/images/hawawshi_mixes.png', sort_order: 9, is_available: true },
  { id: 'p10', category_id: '2', name: 'حواوشي ميكس أجبان كبير', price: 120, size: 'كبير', image_url: '/images/hawawshi_mixes.png', sort_order: 10, is_available: true },
  { id: 'p11', category_id: '4', name: 'إضافة جبنة موتزاريلا', price: 25, size: 'عادي', image_url: '/images/cheese_addition.png', sort_order: 11, is_available: true },
  { id: 'p12', category_id: '4', name: 'إضافة جبنة رومي', price: 20, size: 'عادي', image_url: '/images/cheese_addition.png', sort_order: 12, is_available: true },
  { id: 'p13', category_id: '4', name: 'إضافة جبنة شيدر', price: 20, size: 'عادي', image_url: '/images/cheese_addition.png', sort_order: 13, is_available: true },
  { id: 'p14', category_id: '3', name: 'بيبسي كولا 1 لتر', price: 30, size: '1L', image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&q=80', sort_order: 14, is_available: true },
  { id: 'p15', category_id: '3', name: 'مياه معدنية', price: 10, size: 'صغير', image_url: '/images/mineral_water.png', sort_order: 15, is_available: true },
  { id: 'p16', category_id: '5', name: 'عرض ميكس البردعي الفاخر', price: 140, original_price: 185, is_offer: true, offer_components: '2 حواوشي ميكس أجبان + بيبسي 1 لتر', size: 'وجبة عائلية', image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80', sort_order: 16, is_available: true },
  { id: 'p17', category_id: '5', name: 'عرض الصحاب (4 حواوشي)', price: 220, original_price: 270, is_offer: true, offer_components: '4 حواوشي فراخ/سجق + 2 بطاطس + بيبسي', size: 'وجبة 4 أفراد', image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80', sort_order: 17, is_available: true },
];

export async function GET() {
  try {
    let result = await query('SELECT * FROM products ORDER BY sort_order ASC, created_at ASC');

    // Auto-seed default products into PostgreSQL DB if table is empty
    if (!result.isFallback && result.rows && result.rows.length === 0) {
      for (const p of defaultHawawshiProducts) {
        await query(
          `INSERT INTO products (id, name, category_id, price, original_price, is_offer, offer_components, size, image_url, sort_order, is_available)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [p.id, p.name, p.category_id, p.price, p.original_price || null, p.is_offer || false, p.offer_components || null, p.size, p.image_url, p.sort_order, true]
        );
      }
      result = await query('SELECT * FROM products ORDER BY sort_order ASC, created_at ASC');
    }

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
