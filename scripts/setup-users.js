const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  await client.connect();
  console.log('🔌 Connected to Supabase DB...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      pin TEXT NOT NULL DEFAULT '1234',
      role TEXT DEFAULT 'cashier',
      avatar TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.query(`
    INSERT INTO users (username, name, pin, role)
    VALUES 
      ('administrator', 'المدير العام', '1234', 'admin'),
      ('cashier1', 'أحمد علي', '0000', 'cashier'),
      ('islam', 'إسلام', '1234', 'cashier')
    ON CONFLICT (username) DO UPDATE SET pin = EXCLUDED.pin, name = EXCLUDED.name;
  `);

  console.log('✅ Supabase users table successfully created and seeded!');
  await client.end();
}

main().catch(err => {
  console.error('❌ Error creating users table:', err);
  process.exit(1);
});
