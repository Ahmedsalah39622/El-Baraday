const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log('🔌 Connected to Supabase DB...');

  // Ensure users table has all role and permissions columns
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      pin TEXT NOT NULL DEFAULT '1234',
      role TEXT DEFAULT 'cashier',
      permissions TEXT,
      status TEXT DEFAULT 'active',
      avatar TEXT,
      last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
  `);

  // Seed standard default users with granular permissions
  const defaultUsers = [
    {
      username: 'administrator',
      name: 'أحمد محمود (المدير)',
      pin: '1234',
      role: 'admin',
      permissions: JSON.stringify(['/', '/products', '/orders', '/tables', '/customers', '/shift-summary', '/delivery', '/inventory', '/salaries', '/reports', '/admin', '/settings']),
      status: 'active'
    },
    {
      username: 'cashier1',
      name: 'عمر حسن (كاشير)',
      pin: '0000',
      role: 'cashier',
      permissions: JSON.stringify(['/', '/orders', '/tables', '/customers', '/shift-summary', '/delivery']),
      status: 'active'
    },
    {
      username: 'driver1',
      name: 'محمد علي (طيار)',
      pin: '1111',
      role: 'driver',
      permissions: JSON.stringify(['/delivery', '/orders']),
      status: 'active'
    },
    {
      username: 'chef1',
      name: 'يوسف إبراهيم (شيف)',
      pin: '2222',
      role: 'kitchen',
      permissions: JSON.stringify(['/orders']),
      status: 'inactive'
    }
  ];

  for (const u of defaultUsers) {
    await client.query(`
      INSERT INTO users (username, name, pin, role, permissions, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO UPDATE SET
        name = EXCLUDED.name,
        pin = EXCLUDED.pin,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        status = EXCLUDED.status;
    `, [u.username, u.name, u.pin, u.role, u.permissions, u.status]);
  }

  const res = await client.query('SELECT id, username, name, role, permissions, status FROM users');
  console.log('✅ Supabase users table updated with custom screen permissions!');
  console.table(res.rows);

  await client.end();
}

main().catch(err => {
  console.error('❌ Error updating users schema:', err);
  process.exit(1);
});
