const mysql = require('mysql2/promise');

async function fixDuplicateCustomers() {
  const pool = mysql.createPool({
    host: 'srv1788.hstgr.io',
    user: 'u407531143_bara',
    password: 'Q+x;s3r=n9',
    database: 'u407531143_bara',
    port: 3306,
  });

  const [customers] = await pool.query('SELECT * FROM customers');
  console.log('Current customer rows:', customers);

  const seen = new Set();
  for (const c of customers) {
    const rawPhone = c.phone || '';
    const cleanPhone = rawPhone.split(' - ')[0].trim();
    if (seen.has(cleanPhone) || !cleanPhone) {
      await pool.query('DELETE FROM customers WHERE id = ?', [c.id]);
      console.log(`Deleted duplicate/invalid customer row ${c.id} (phone: ${c.phone})`);
    } else {
      seen.add(cleanPhone);
      await pool.query('UPDATE customers SET phone = ? WHERE id = ?', [cleanPhone, c.id]);
      console.log(`Cleaned customer ${c.name}: phone updated to '${cleanPhone}'`);
    }
  }

  const [finalRows] = await pool.query('SELECT * FROM customers');
  console.log('\n--- Final Cleaned Customers Table ---');
  console.table(finalRows);

  await pool.end();
}

fixDuplicateCustomers().catch(console.error);
