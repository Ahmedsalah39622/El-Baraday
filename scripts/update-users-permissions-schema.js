const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.lybljaaqompbfsgexpxq:NLYfNCuHGqK4SoWJ@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function updateUsersSchema() {
  const client = await pool.connect();
  try {
    console.log('🔄 Checking and updating users table schema...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        pin VARCHAR(20) NOT NULL DEFAULT '1234',
        role VARCHAR(50) NOT NULL DEFAULT 'cashier',
        permissions JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(20) DEFAULT 'active',
        avatar TEXT,
        last_login TIMESTAMP,
        branch_id VARCHAR(50) DEFAULT 'b1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id VARCHAR(50) DEFAULT 'b1';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pin VARCHAR(20) DEFAULT '1234';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
    `);

    // Sync all existing employees into users table if missing!
    const empResult = await client.query('SELECT * FROM employees');
    for (const emp of (empResult.rows || [])) {
      const cleanUsername = (emp.phone || emp.name).replace(/\s+/g, '').toLowerCase() || `emp_${emp.id.slice(0, 5)}`;
      const mappedRole = emp.role && (emp.role.includes('مدير') || emp.role.includes('أدمن')) ? 'admin' : (emp.role && (emp.role.includes('طيار') || emp.role.includes('دليفري')) ? 'driver' : 'cashier');
      const defaultPerms = mappedRole === 'admin' 
        ? ['pos', 'tables', 'delivery', 'inventory', 'salaries', 'reports', 'settings', 'admin', 'attendance', 'shift-summary']
        : (mappedRole === 'driver' ? ['delivery', 'attendance'] : ['pos', 'tables', 'delivery', 'attendance']);

      await client.query(
        `INSERT INTO users (id, username, name, pin, role, permissions, status, branch_id)
         VALUES ($1, $2, $3, '1234', $4, $5, 'active', $6)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, branch_id = EXCLUDED.branch_id`,
        [emp.id, cleanUsername, emp.name, mappedRole, JSON.stringify(defaultPerms), emp.branch_id || 'b1']
      );
    }

    console.log('✅ Users table schema and employee sync completed successfully!');
  } catch (err) {
    console.error('❌ Error updating users schema:', err);
  } finally {
    client.release();
    pool.end();
  }
}

updateUsersSchema();
