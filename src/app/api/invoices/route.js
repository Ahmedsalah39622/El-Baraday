import { query, isSchemaChecked, markSchemaChecked } from '@/lib/db';
import { NextResponse } from 'next/server';

async function ensureInvoicesTable() {
  if (isSchemaChecked('invoices')) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(100) PRIMARY KEY,
        invoice_number VARCHAR(100) NOT NULL UNIQUE,
        title VARCHAR(255) DEFAULT 'فاتورة تحصيل',
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        remaining_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        payment_status VARCHAR(50) DEFAULT 'paid',
        payment_method VARCHAR(50) DEFAULT 'cash',
        invoice_date DATE NOT NULL,
        notes TEXT,
        items JSON DEFAULT NULL,
        branch_id VARCHAR(100) DEFAULT 'b1',
        created_by VARCHAR(100) DEFAULT 'administrator',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch(e) {
    console.error('Failed to create invoices table:', e);
  }
  markSchemaChecked('invoices');
}


export async function GET(req) {
  try {
    await ensureInvoicesTable();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';
    const status = searchParams.get('status') || '';
    const branchId = searchParams.get('branch_id');
    const limit = parseInt(searchParams.get('limit') || '200');

    let sql = `
      SELECT i.*, b.name as branch_name 
      FROM invoices i
      LEFT JOIN branches b ON i.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (branchId && branchId !== 'all') {
      sql += ` AND i.branch_id = $${paramIndex++}`;
      params.push(branchId);
    }

    if (search) {
      sql += ` AND (i.customer_name LIKE $${paramIndex} OR i.invoice_number LIKE $${paramIndex} OR i.title LIKE $${paramIndex} OR i.customer_phone LIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (date) {
      sql += ` AND DATE(i.invoice_date) = $${paramIndex++}`;
      params.push(date);
    }

    if (status && status !== 'all') {
      sql += ` AND i.payment_status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ` ORDER BY i.invoice_date DESC, i.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const res = await query(sql, params);
    
    // Parse items JSON safely
    const formatted = (res.rows || []).map(row => ({
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []),
      amount: parseFloat(row.amount || 0),
      paid_amount: parseFloat(row.paid_amount || 0),
      remaining_amount: parseFloat(row.remaining_amount || 0),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('GET /api/invoices error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureInvoicesTable();
    const body = await req.json();
    
    const customerName = body.customer_name || body.customerName;
    const amount = parseFloat(body.amount || 0);
    const invoiceDate = body.invoice_date || body.invoiceDate || new Date().toISOString().split('T')[0];

    if (!customerName || customerName.trim() === '') {
      return NextResponse.json({ error: 'اسم العميل أو الجهة (باسم كذا) مطلوب' }, { status: 400 });
    }

    // Generate unique invoice number: e.g. INV-1001 or INV-YYYYMMDD-XXX
    const nextNumRes = await query(`SELECT COUNT(*) as cnt FROM invoices`);
    const count = (nextNumRes.rows && nextNumRes.rows[0] ? parseInt(nextNumRes.rows[0].cnt) : 0) + 1001;
    const invoiceNumber = body.invoice_number || `INV-${count}`;

    const id = body.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const title = body.title || 'فاتورة تحصيل';
    const customerPhone = body.customer_phone || body.customerPhone || null;
    const paidAmount = body.paid_amount !== undefined ? parseFloat(body.paid_amount) : amount;
    const remainingAmount = body.remaining_amount !== undefined ? parseFloat(body.remaining_amount) : Math.max(0, amount - paidAmount);
    
    let paymentStatus = body.payment_status || 'paid';
    if (remainingAmount <= 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0 && remainingAmount > 0) {
      paymentStatus = 'partial';
    } else if (paidAmount === 0) {
      paymentStatus = 'unpaid';
    }

    const paymentMethod = body.payment_method || 'cash';
    const notes = body.notes || null;
    const itemsJson = body.items ? JSON.stringify(body.items) : null;
    const branchId = body.branch_id || body.branchId || 'b1';
    const createdBy = body.created_by || body.createdBy || 'administrator';

    const insertSql = `
      INSERT INTO invoices (
        id, invoice_number, title, customer_name, customer_phone,
        amount, paid_amount, remaining_amount, payment_status,
        payment_method, invoice_date, notes, items, branch_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;

    const params = [
      id, invoiceNumber, title, customerName, customerPhone,
      amount, paidAmount, remainingAmount, paymentStatus,
      paymentMethod, invoiceDate, notes, itemsJson, branchId, createdBy
    ];

    await query(insertSql, params);

    const createdInvoice = {
      id,
      invoice_number: invoiceNumber,
      title,
      customer_name: customerName,
      customer_phone: customerPhone,
      amount,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      invoice_date: invoiceDate,
      notes,
      items: body.items || [],
      branch_id: branchId,
      created_by: createdBy,
      created_at: new Date().toISOString()
    };

    return NextResponse.json(createdInvoice, { status: 201 });
  } catch (error) {
    console.error('POST /api/invoices error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
