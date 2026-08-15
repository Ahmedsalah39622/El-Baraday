import { query, isSchemaChecked, markSchemaChecked } from '@/lib/db';
import { NextResponse } from 'next/server';

async function ensureIngredientColumns() {
  if (isSchemaChecked('ingCols')) return;
  try { await query('ALTER TABLE product_ingredients ADD COLUMN auto_deduct TINYINT(1) DEFAULT 1'); } catch (e) { }
  try { await query('ALTER TABLE product_ingredients ADD COLUMN size VARCHAR(100) DEFAULT \'all\''); } catch (e) { }
  markSchemaChecked('ingCols');
}

const NON_DEDUCTIBLE_KEYWORDS = [
  'بطاطس', 'بطاطا',
  'روزبيف', 'روست',
  'سلامى', 'سلامي',
  'سوسيس', 'سويسويس', 'هوت دوج',
  'تركى', 'تركي',
  'بسطرمة', 'بسكرمه', 'بسترمة',
  'مشروم', 'فطر',
  'شيدر'
];

export async function GET(request) {
  try {
    await ensureIngredientColumns();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    let sql = `
      SELECT 
        pi.id,
        pi.product_id,
        pi.inventory_item_id,
        pi.quantity,
        pi.size,
        COALESCE(pi.auto_deduct, 1) AS auto_deduct,
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
    const rows = (result.rows || []).map(r => {
      const invName = (r.inventory_item_name || '').toLowerCase();
      const isKeywordNonDeductible = NON_DEDUCTIBLE_KEYWORDS.some(kw => invName.includes(kw));
      const autoDeduct = !isKeywordNonDeductible && r.auto_deduct !== 0 && r.auto_deduct !== '0' && r.auto_deduct !== false;
      return {
        ...r,
        auto_deduct: autoDeduct
      };
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching product ingredients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureIngredientColumns();
    const body = await request.json();
    const productId = (body.product_id || body.productId || '').trim();
    const inventoryItemId = (body.inventory_item_id || body.inventoryItemId || '').trim();
    const quantity = parseFloat(body.quantity || 1);
    const size = body.size || 'all';
    const autoDeduct = body.auto_deduct !== undefined ? (body.auto_deduct ? 1 : 0) : 1;

    if (!productId || !inventoryItemId) {
      return NextResponse.json({ error: 'المنتج والخامة مطلوبان' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO product_ingredients (product_id, inventory_item_id, quantity, size, auto_deduct)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [productId, inventoryItemId, quantity, size, autoDeduct]
    );

    const created = result.rows && result.rows.length > 0 ? result.rows[0] : {
      id: body.id || Date.now().toString(),
      product_id: productId,
      inventory_item_id: inventoryItemId,
      quantity,
      size,
      auto_deduct: autoDeduct === 1
    };

    return NextResponse.json({
      ...created,
      auto_deduct: autoDeduct === 1
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding product ingredient:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
