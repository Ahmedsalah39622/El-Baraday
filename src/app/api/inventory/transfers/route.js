import { query, isSchemaChecked, markSchemaChecked } from '@/lib/db';
import { NextResponse } from 'next/server';

async function ensureTransferTables() {
  if (isSchemaChecked('trfTables')) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_transfers (
        id VARCHAR(100) PRIMARY KEY,
        from_branch_id VARCHAR(100) NOT NULL,
        to_branch_id VARCHAR(100) NOT NULL,
        item_id VARCHAR(100) NOT NULL,
        quantity DECIMAL(10,3) NOT NULL,
        unit VARCHAR(50),
        sender_name VARCHAR(100),
        receiver_name VARCHAR(100),
        status VARCHAR(50) DEFAULT 'completed',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_from_branch (from_branch_id),
        INDEX idx_to_branch (to_branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) { }

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS inventory_branch_stock (
        id VARCHAR(100) PRIMARY KEY,
        item_id VARCHAR(100) NOT NULL,
        branch_id VARCHAR(100) NOT NULL,
        current_stock DECIMAL(10,3) NOT NULL DEFAULT 0.000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_item_branch (item_id, branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) { }

  markSchemaChecked('trfTables');
}

export async function GET(request) {
  try {
    await ensureTransferTables();
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
    await ensureTransferTables();
    const body = await request.json();
    const itemId = body.item_id || body.itemId;
    const senderName = body.sender_name || body.senderName || 'المسؤول';
    const notes = body.notes || '';

    if (!itemId) {
      return NextResponse.json({ error: 'برجاء تحديد الخامة المراد تحويلها' }, { status: 400 });
    }

    // 1. Fetch Item details
    const itemRes = await query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);
    if (!itemRes.rows || itemRes.rows.length === 0) {
      return NextResponse.json({ error: 'الخامة غير موجودة' }, { status: 404 });
    }
    const item = itemRes.rows[0];
    const unit = item.unit || 'كجم';

    // 2. Support batch distribution (توزيع جماعي لفرعين في وقت واحد)
    const distributions = body.distributions || [];
    if (Array.isArray(distributions) && distributions.length > 0) {
      const fromBranchId = body.from_branch_id || body.fromBranchId || 'b_main';
      const results = [];

      for (const dist of distributions) {
        const toBranchId = dist.to_branch_id || dist.toBranchId;
        const quantity = parseFloat(dist.quantity || 0);
        if (!toBranchId || quantity <= 0) continue;
        if (fromBranchId === toBranchId) continue;

        const singleResult = await processSingleTransfer({
          fromBranchId,
          toBranchId,
          itemId,
          quantity,
          unit,
          senderName,
          notes: dist.notes || notes,
          item
        });
        results.push(singleResult);
      }

      return NextResponse.json({ success: true, transfers: results }, { status: 201 });
    }

    // 3. Single Transfer Logic
    const fromBranchId = body.from_branch_id || body.fromBranchId || 'b_main';
    const toBranchId = body.to_branch_id || body.toBranchId;
    const quantity = parseFloat(body.quantity || 0);

    if (!fromBranchId || !toBranchId) {
      return NextResponse.json({ error: 'برجاء تحديد الفرع المحول منه والفرع المحول إليه' }, { status: 400 });
    }

    if (fromBranchId === toBranchId) {
      return NextResponse.json({ error: 'لا يمكن التحويل لنفس الفرع' }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: 'برجاء تحديد كمية صحيحة أكبر من الصفر' }, { status: 400 });
    }

    const transferObj = await processSingleTransfer({
      fromBranchId,
      toBranchId,
      itemId,
      quantity,
      unit,
      senderName,
      notes,
      item
    });

    return NextResponse.json({ success: true, transfer: transferObj }, { status: 201 });

  } catch (error) {
    console.error('Error executing inventory transfer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function processSingleTransfer({ fromBranchId, toBranchId, itemId, quantity, unit, senderName, notes, item }) {
  // Fetch branch names
  const branchesRes = await query('SELECT id, name FROM branches WHERE id IN ($1, $2)', [fromBranchId, toBranchId]);
  const branchMap = { 'b_main': 'المخزن الرئيسي' };
  (branchesRes.rows || []).forEach(b => { branchMap[b.id] = b.name; });
  const fromBranchName = branchMap[fromBranchId] || fromBranchId;
  const toBranchName = branchMap[toBranchId] || toBranchId;

  // Deduct from Source
  if (fromBranchId === 'b_main') {
    await query(
      'UPDATE inventory_items SET current_stock = current_stock - $1 WHERE id = $2',
      [quantity, itemId]
    );
  } else {
    await query(
      `INSERT INTO inventory_branch_stock (id, item_id, branch_id, current_stock)
       VALUES ($1, $2, $3, -$4)
       ON DUPLICATE KEY UPDATE current_stock = current_stock - $4`,
      [`obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, itemId, fromBranchId, quantity]
    );
  }

  // Add to Destination
  if (toBranchId === 'b_main') {
    await query(
      'UPDATE inventory_items SET current_stock = current_stock + $1 WHERE id = $2',
      [quantity, itemId]
    );
  } else {
    await query(
      `INSERT INTO inventory_branch_stock (id, item_id, branch_id, current_stock)
       VALUES ($1, $2, $3, $4)
       ON DUPLICATE KEY UPDATE current_stock = current_stock + $4`,
      [`obs_${Date.now()}_${Math.floor(Math.random() * 1000)}`, itemId, toBranchId, quantity]
    );
  }

  // Log transfer record
  const transferId = `trf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const transferResult = await query(
    `INSERT INTO inventory_transfers (id, from_branch_id, to_branch_id, item_id, quantity, unit, sender_name, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8)
     RETURNING *`,
    [transferId, fromBranchId, toBranchId, itemId, quantity, unit, senderName, notes]
  );

  // Log audit transactions
  await query(
    `INSERT INTO inventory_transactions (id, item_id, type, quantity, notes) VALUES ($1, $2, 'transfer_out', $3, $4)`,
    [`trans_out_${Date.now()}_${Math.floor(Math.random() * 1000)}`, itemId, quantity, `توزيع/تحويل من ${fromBranchName} إلى ${toBranchName} - ${notes}`]
  );

  await query(
    `INSERT INTO inventory_transactions (id, item_id, type, quantity, notes) VALUES ($1, $2, 'transfer_in', $3, $4)`,
    [`trans_in_${Date.now()}_${Math.floor(Math.random() * 1000)}`, itemId, quantity, `استلام خامة في ${toBranchName} من ${fromBranchName} - ${notes}`]
  );

  const created = (transferResult.rows && transferResult.rows.length > 0) ? transferResult.rows[0] : {
    id: transferId, from_branch_id: fromBranchId, to_branch_id: toBranchId, item_id: itemId, quantity, unit, sender_name: senderName, status: 'completed', notes
  };

  return {
    ...created,
    from_branch_name: fromBranchName,
    to_branch_name: toBranchName,
    item_name: item.name
  };
}
