import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const sql = `
      SELECT 
        t.*,
        b1.name AS from_branch_name,
        b2.name AS to_branch_name,
        inv.name AS item_name,
        inv.unit AS item_unit
      FROM inventory_transfers t
      LEFT JOIN branches b1 ON t.from_branch_id = b1.id
      LEFT JOIN branches b2 ON t.to_branch_id = b2.id
      LEFT JOIN inventory_items inv ON t.item_id = inv.id
      ORDER BY t.created_at DESC
      LIMIT $1
    `;

    const result = await query(sql, [limit]);
    return NextResponse.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching inventory transfers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const fromBranchId = body.from_branch_id || body.fromBranchId;
    const toBranchId = body.to_branch_id || body.toBranchId;
    const itemId = body.item_id || body.itemId;
    const quantity = parseFloat(body.quantity || 0);
    const senderName = body.sender_name || body.senderName || 'المسؤول';
    const notes = body.notes || '';

    if (!fromBranchId || !toBranchId || !itemId) {
      return NextResponse.json({ error: 'برجاء تحديد الفرع المحول منه، الفرع المحول إليه، والخامة' }, { status: 400 });
    }

    if (fromBranchId === toBranchId) {
      return NextResponse.json({ error: 'لا يمكن التحويل لنفس الفرع' }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: 'برجاء تحديد كمية صحيحة أكبر من الصفر' }, { status: 400 });
    }

    // 1. Fetch Item details
    const itemRes = await query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);
    if (!itemRes.rows || itemRes.rows.length === 0) {
      return NextResponse.json({ error: 'الخامة غير موجودة' }, { status: 404 });
    }
    const item = itemRes.rows[0];
    const unit = item.unit || 'كجم';

    // 2. Fetch From Branch & To Branch names
    const branchesRes = await query('SELECT id, name FROM branches WHERE id IN ($1, $2)', [fromBranchId, toBranchId]);
    const branchMap = {};
    (branchesRes.rows || []).forEach(b => { branchMap[b.id] = b.name; });
    const fromBranchName = branchMap[fromBranchId] || fromBranchId;
    const toBranchName = branchMap[toBranchId] || toBranchId;

    // 3. Check stock balance in main inventory or branch stock
    const currentMainStock = parseFloat(item.current_stock || 0);

    // Update main inventory stock (deduct from main/source)
    await query(
      'UPDATE inventory_items SET current_stock = GREATEST(0, current_stock - $1) WHERE id = $2',
      [quantity, itemId]
    );

    // 4. Update or Insert target branch stock in inventory_branch_stock
    await query(
      `INSERT INTO inventory_branch_stock (id, item_id, branch_id, current_stock)
       VALUES ($1, $2, $3, $4)
       ON DUPLICATE KEY UPDATE current_stock = current_stock + $4`,
      [`obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, itemId, toBranchId, quantity]
    );

    // 5. Insert transfer log into inventory_transfers
    const transferId = `trf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const transferResult = await query(
      `INSERT INTO inventory_transfers (id, from_branch_id, to_branch_id, item_id, quantity, unit, sender_name, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8)
       RETURNING *`,
      [transferId, fromBranchId, toBranchId, itemId, quantity, unit, senderName, notes]
    );

    // 6. Log transactions
    const tOutId = `trans_out_${Date.now()}`;
    const tInId = `trans_in_${Date.now()}`;

    await query(
      `INSERT INTO inventory_transactions (id, item_id, type, quantity, notes) VALUES ($1, $2, 'transfer_out', $3, $4)`,
      [tOutId, itemId, quantity, `تحويل خامة إلى ${toBranchName} - ${notes}`]
    );

    await query(
      `INSERT INTO inventory_transactions (id, item_id, type, quantity, notes) VALUES ($1, $2, 'transfer_in', $3, $4)`,
      [tInId, itemId, quantity, `استلام خامة محولة من ${fromBranchName} - ${notes}`]
    );

    const created = transferResult.rows && transferResult.rows.length > 0 ? transferResult.rows[0] : {
      id: transferId,
      from_branch_id: fromBranchId,
      to_branch_id: toBranchId,
      item_id: itemId,
      quantity,
      unit,
      sender_name: senderName,
      status: 'completed',
      notes
    };

    return NextResponse.json({
      success: true,
      transfer: {
        ...created,
        from_branch_name: fromBranchName,
        to_branch_name: toBranchName,
        item_name: item.name
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error executing inventory transfer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
