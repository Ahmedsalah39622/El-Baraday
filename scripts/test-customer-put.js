const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.lybljaaqompbfsgexpxq:NLYfNCuHGqK4SoWJ@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function testCustomerPutNull() {
  const client = await pool.connect();
  try {
    const id = 'cust_1784887049784';
    const name = 'عبدو';
    const phone = '01222444445';
    const address = 'fdsfffd';
    const floor = '6';
    const apartment = '2';
    const addressesJson = null;

    console.log('Testing PUT query with null addressesJson...');
    const result = await client.query(
      `UPDATE customers SET
       name = COALESCE($1, name),
       phone = COALESCE($2, phone),
       address = COALESCE($3, address),
       floor = COALESCE($4, floor),
       apartment = COALESCE($5, apartment),
       addresses = COALESCE($6::jsonb, addresses)
       WHERE id = $7 RETURNING *`,
      [name, phone, address, floor, apartment, addressesJson, id]
    );

    console.log('QueryResult:', result.rows);
  } catch (err) {
    console.error('❌ CATCHED ERROR WITH NULL:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

testCustomerPutNull();
