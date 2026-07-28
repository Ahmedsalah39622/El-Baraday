import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const res = await query(`SELECT i.*, b.name as branch_name FROM invoices i LEFT JOIN branches b ON i.branch_id = b.id WHERE i.id = $1`, [id]);
    
    if (!res.rows || res.rows.length === 0) {
      return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
    }

    const row = res.rows[0];
    const formatted = {
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []),
      amount: parseFloat(row.amount || 0),
      paid_amount: parseFloat(row.paid_amount || 0),
      remaining_amount: parseFloat(row.remaining_amount || 0),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const amount = parseFloat(body.amount || 0);
    const paidAmount = parseFloat(body.paid_amount !== undefined ? body.paid_amount : body.paidAmount || 0);
    const remainingAmount = parseFloat(body.remaining_amount !== undefined ? body.remaining_amount : Math.max(0, amount - paidAmount));
    
    let paymentStatus = body.payment_status || 'paid';
    if (remainingAmount <= 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0 && remainingAmount > 0) {
      paymentStatus = 'partial';
    } else if (paidAmount === 0) {
      paymentStatus = 'unpaid';
    }

    const sql = `
      UPDATE invoices
      SET title = COALESCE($1, title),
          customer_name = COALESCE($2, customer_name),
          customer_phone = COALESCE($3, customer_phone),
          amount = $4,
          paid_amount = $5,
          remaining_amount = $6,
          payment_status = $7,
          payment_method = COALESCE($8, payment_method),
          invoice_date = COALESCE($9, invoice_date),
          notes = COALESCE($10, notes),
          items = COALESCE($11, items)
      WHERE id = $12
    `;

    const queryParams = [
      body.title || null,
      body.customer_name || body.customerName || null,
      body.customer_phone || body.customerPhone || null,
      amount,
      paidAmount,
      remainingAmount,
      paymentStatus,
      body.payment_method || null,
      body.invoice_date || body.invoiceDate || null,
      body.notes || null,
      body.items ? JSON.stringify(body.items) : null,
      id
    ];

    await query(sql, queryParams);

    return NextResponse.json({ message: 'تم تحديث الفاتورة بنجاح', id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await query(`DELETE FROM invoices WHERE id = $1`, [id]);
    return NextResponse.json({ message: 'تم حذف الفاتورة بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
