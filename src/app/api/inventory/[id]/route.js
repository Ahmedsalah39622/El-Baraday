import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const name = body.name !== undefined ? (body.name || '').trim() : null;
    const unit = body.unit !== undefined ? body.unit : null;
    const current_stock = (body.current_stock !== undefined ? body.current_stock : body.currentStock) !== undefined 
      ? parseFloat(body.current_stock ?? body.currentStock) : null;
    const min_stock = (body.min_stock !== undefined ? body.min_stock : body.minStock) !== undefined 
      ? parseFloat(body.min_stock ?? body.minStock) : null;
    const cost_per_unit = (body.cost_per_unit !== undefined ? body.cost_per_unit : body.costPerUnit) !== undefined 
      ? parseFloat(body.cost_per_unit ?? body.costPerUnit) : null;
    const branch_id = body.branch_id || body.branchId;

    // If a specific branch stock is targeted (e.g. b1 or b2)
    if (branch_id && branch_id !== 'b_main') {
      if (current_stock !== null) {
        await query(`
          INSERT INTO inventory_branch_stock (id, item_id, branch_id, current_stock)
          VALUES ($1, $2, $3, $4)
          ON DUPLICATE KEY UPDATE current_stock = $4
        `, [`obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, id, branch_id, current_stock]);
      }
      return NextResponse.json({ success: true, id, branch_id, current_stock });
    }

    const result = await query(
      `UPDATE inventory_items SET
       name = COALESCE($1, name),
       unit = COALESCE($2, unit),
       current_stock = COALESCE($3, current_stock),
       min_stock = COALESCE($4, min_stock),
       cost_per_unit = COALESCE($5, cost_per_unit),
       category = COALESCE($6, category)
       WHERE id = $7 RETURNING *`,
      [name, unit, current_stock, min_stock, cost_per_unit, category, id]
    );

    if (result.rows && result.rows.length > 0) {
      return NextResponse.json(result.rows[0]);
    }
    return NextResponse.json({ success: true, id, name, unit, current_stock, min_stock, cost_per_unit, category });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await query('DELETE FROM inventory_items WHERE id = $1', [id]);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

