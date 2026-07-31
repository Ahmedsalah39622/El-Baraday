import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT * FROM customers ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching customers:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, address, floor, apartment, deliveryFee, delivery_fee, addresses, id } = body;
    const customerId = id || `cust_${Date.now()}`;
    const fee = parseFloat(deliveryFee ?? delivery_fee) || 15;

    let addressesVal = null;
    if (addresses) {
      if (typeof addresses === 'string') {
        addressesVal = addresses;
      } else {
        addressesVal = JSON.stringify(addresses);
      }
    } else {
      addressesVal = JSON.stringify([{ address: address || '', floor: floor || '', apartment: apartment || '', deliveryFee: fee }]);
    }

    let cleanPhone = (phone || '').toString().trim();
    if (cleanPhone.includes(' - ')) {
      cleanPhone = cleanPhone.split(' - ')[0].trim();
    }

    try { await query('ALTER TABLE customers ADD COLUMN delivery_fee DECIMAL(10, 2) DEFAULT 15'); } catch(e) {}

    const result = await query(
      `INSERT INTO customers (id, name, phone, address, floor, apartment, delivery_fee, addresses, total_orders, total_spend)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::jsonb, '[]'::jsonb), 0, 0)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, phone = EXCLUDED.phone, address = EXCLUDED.address, floor = EXCLUDED.floor, apartment = EXCLUDED.apartment, delivery_fee = EXCLUDED.delivery_fee, addresses = EXCLUDED.addresses
       RETURNING *`,
      [customerId, name || 'عميل', cleanPhone, address || '', floor || '', apartment || '', fee, addressesVal]
    );

    const createdCustomer = (result.rows && result.rows[0]) ? result.rows[0] : {
      id: customerId,
      name: name || 'عميل',
      phone: cleanPhone,
      address: address || '',
      floor: floor || '',
      apartment: apartment || '',
      delivery_fee: fee,
      deliveryFee: fee,
      addresses: addressesVal
    };

    return NextResponse.json(createdCustomer, { status: 201 });
  } catch (error) {
    console.error('❌ Error inserting customer:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
