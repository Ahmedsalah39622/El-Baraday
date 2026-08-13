const mysql = require('mysql2/promise');

async function inspectDrivers() {
  try {
    const conn = await mysql.createConnection({
      host: 'srv1788.hstgr.io',
      user: 'u407531143_bara',
      password: 'Q+x;s3r=n9',
      database: 'u407531143_bara',
      port: 3306
    });

    console.log('--- ALL BRANCHES ---');
    const [branches] = await conn.query('SELECT * FROM branches');
    console.log(branches);

    console.log('\n--- ALL DRIVERS ---');
    const [drivers] = await conn.query('SELECT * FROM drivers');
    console.log(drivers);

    console.log('\n--- DRIVERS WITH THEIR ASSIGNED BRANCHES ---');
    const [driversWithBranch] = await conn.query(`
      SELECT d.id, d.name, d.phone, d.branch_id, b.name as branch_name 
      FROM drivers d 
      LEFT JOIN branches b ON d.branch_id = b.id
    `);
    console.log(driversWithBranch);

    console.log('\n--- DELIVERY/DRIVER EMPLOYEES ---');
    const [deliveryEmployees] = await conn.query(`
      SELECT id, name, phone, role, status, branch_id 
      FROM employees 
      WHERE role LIKE '%طيار%' OR role LIKE '%دليفري%' OR LOWER(role) LIKE '%driver%'
    `);
    console.log(deliveryEmployees);

    console.log('\n--- ACTIVE ATTENDANCE QUEUE ---');
    const [attendance] = await conn.query(`
      SELECT da.*, b.name as branch_name 
      FROM driver_attendance da 
      LEFT JOIN branches b ON da.branch_id = b.id 
      WHERE da.check_out_time IS NULL
    `);
    console.log(attendance);

    await conn.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

inspectDrivers();
