const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'srv1788.hstgr.io',
      user: 'u407531143_bara',
      password: 'Q+x;s3r=n9',
      database: 'u407531143_bara',
      port: 3306
    });

    console.log('--- ALL EMPLOYEES ---');
    const [employees] = await conn.query("SELECT id, name, role, status, branch_id FROM employees");
    console.log(employees);

    console.log('\n--- ALL DRIVERS ---');
    const [drivers] = await conn.query("SELECT id, name, status, branch_id FROM drivers");
    console.log(drivers);

    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
