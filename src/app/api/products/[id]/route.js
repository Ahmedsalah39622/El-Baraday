import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) return NextResponse.json({ id }, { status: 200 });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ id }, { status: 200 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category_id, price, original_price, is_offer, offer_components, size, image_url, description, is_available, sort_order } = body;
    
    let result = await query(
      `UPDATE products SET name=COALESCE($1,name), category_id=COALESCE($2,category_id),
       price=COALESCE($3,price), original_price=COALESCE($4,original_price),
       is_offer=COALESCE($5,is_offer), offer_components=COALESCE($6,offer_components),
       size=COALESCE($7,size), image_url=COALESCE($8,image_url),
       description=COALESCE($9,description), is_available=COALESCE($10,is_available),
       sort_order=COALESCE($11,sort_order)
       WHERE id=$12 RETURNING *`,
      [name, category_id, price, original_price, is_offer, offer_components, size, image_url, description, is_available, sort_order, id]
    );

    // If product wasn't found in DB, try to insert
    if (!result.isFallback && result.rows && result.rows.length === 0) {
      result = await query(
        `INSERT INTO products (id, name, category_id, price, original_price, is_offer, offer_components, size, image_url, description, is_available, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [id, name || 'منتج جديد', category_id || '1', price || 0, original_price || null, is_offer || false, offer_components || null, size || 'كبير', image_url || null, description || null, is_available ?? true, sort_order || 0]
      );
    }

    if (result.isFallback || !result.rows || result.rows.length === 0) {
      return NextResponse.json({
        id,
        name,
        category_id,
        price,
        original_price,
        is_offer,
        offer_components,
        size,
        image_url,
        description,
        is_available: is_available ?? true,
        sort_order: sort_order || 0,
      }, { status: 200 });
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error) {
    return NextResponse.json({ id }, { status: 200 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await query('DELETE FROM products WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true });
  }
}
