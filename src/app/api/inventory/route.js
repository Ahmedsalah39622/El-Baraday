import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const itemsRes = await query('SELECT * FROM inventory_items ORDER BY category, name');
    const items = itemsRes.rows || [];

    let branchStockRes = { rows: [] };
    try {
      branchStockRes = await query('SELECT item_id, branch_id, current_stock FROM inventory_branch_stock');
    } catch (e) {}

    const stockMap = {};
    (branchStockRes.rows || []).forEach(r => {
      if (!stockMap[r.item_id]) stockMap[r.item_id] = {};
      stockMap[r.item_id][r.branch_id] = parseFloat(r.current_stock || 0);
    });

    const result = items.map(item => {
      const bStocks = stockMap[item.id] || {};
      bStocks.b_main = parseFloat(item.current_stock || 0);
      return {
        ...item,
        current_stock: parseFloat(item.current_stock || 0),
        min_stock: parseFloat(item.min_stock || 0),
        cost_per_unit: parseFloat(item.cost_per_unit || 0),
        branch_stocks: bStocks
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    const unit = body.unit || 'كجم';
    const current_stock = parseFloat(body.current_stock ?? body.currentStock ?? 0);
    const min_stock = parseFloat(body.min_stock ?? body.minStock ?? 0);
    const cost_per_unit = parseFloat(body.cost_per_unit ?? body.costPerUnit ?? 0);
    const category = body.category || 'عام';

    if (!name) {
      return NextResponse.json({ error: 'اسم الخامة مطلوب' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO inventory_items (name, unit, current_stock, min_stock, cost_per_unit, category)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, unit, current_stock, min_stock, cost_per_unit, category]
    );

    const created = result.rows && result.rows.length > 0 ? result.rows[0] : {
      id: body.id || Date.now().toString(),
      name, unit, current_stock, min_stock, cost_per_unit, category
    };

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error adding inventory item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

