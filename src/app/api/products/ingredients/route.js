import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    let sql = `
      SELECT 
        pi.id,
        pi.product_id,
        pi.inventory_item_id,
        pi.quantity,
        pi.created_at,
        inv.name AS inventory_item_name,
        inv.unit AS inventory_item_unit,
        inv.category AS inventory_item_category,
        inv.current_stock AS inventory_current_stock,
        inv.cost_per_unit AS inventory_cost_per_unit
      FROM product_ingredients pi
      LEFT JOIN inventory_items inv ON pi.inventory_item_id = inv.id
    `;
    const params = [];

    if (productId) {
      sql += ` WHERE pi.product_id = $1`;
      params.push(productId);
    }

    sql += ` ORDER BY pi.created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching product ingredients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const productId = (body.product_id || body.productId || '').trim();
    const inventoryItemId = (body.inventory_item_id || body.inventoryItemId || '').trim();
    const quantity = parseFloat(body.quantity || 1);

    if (!productId || !inventoryItemId) {
      return NextResponse.json({ error: 'المنتج والخامة مطلوبان' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO product_ingredients (product_id, inventory_item_id, quantity)
       VALUES ($1, $2, $3) RETURNING *`,
      [productId, inventoryItemId, quantity]
    );

    const created = result.rows && result.rows.length > 0 ? result.rows[0] : {
      id: body.id || Date.now().toString(),
      product_id: productId,
      inventory_item_id: inventoryItemId,
      quantity
    };

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error adding product ingredient:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
