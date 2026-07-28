const mysql = require('mysql2/promise');

async function addUser() {
  const connection = await mysql.createConnection({
    host: 'srv1788.hstgr.io',
    user: 'u407531143_bara',
    password: 'Q+x;s3r=n9',
    database: 'u407531143_bara',
    port: 3306,
  });

  try {
    // Check if user exists
    const [existing] = await connection.query('SELECT id, username FROM users WHERE username = ?', ['ahmed']);
    
    if (existing.length > 0) {
      console.log('✅ اليوزر موجود بالفعل:', existing[0]);
    } else {
      // Insert user
      const permissions = JSON.stringify(['pos','tables','delivery','inventory','salaries','expenses','reports','settings']);
      const [result] = await connection.query(
        `INSERT INTO users (id, username, name, pin, role, permissions, status, avatar, branch_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        ['u1', 'ahmed', 'المدير العام', '0000', 'admin', permissions, 'active', null, 'b1']
      );
      console.log('✅ تم إضافة اليوزر بنجاح! Rows affected:', result.affectedRows);
    }

    // Show all users
    const [users] = await connection.query('SELECT id, username, name, role, status FROM users');
    console.log('\n📋 كل اليوزرز في الداتابيز:');
    console.table(users);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await connection.end();
  }
}

addUser();
