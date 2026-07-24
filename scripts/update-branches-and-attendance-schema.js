const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.lybljaaqompbfsgexpxq:NLYfNCuHGqK4SoWJ@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🔄 Starting Multi-Branch and Attendance Database Migration...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Create branches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created branches table');

    // Seed default branches
    await client.query(`
      INSERT INTO branches (id, name, address, phone) VALUES 
        ('b1', 'الفرع الأول - الرئيسي', 'المركز الرئيسي', '01000000001'),
        ('b2', 'الفرع الثاني', 'الفرع الثاني', '01000000002')
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone;
    `);
    console.log('✅ Seeded default branches (b1, b2)');

    // Helper to safely add column if not exists
    const addColumn = async (table, column, definition) => {
      await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = '${table}' AND column_name = '${column}'
          ) THEN 
            ALTER TABLE ${table} ADD COLUMN ${column} ${definition}; 
          END IF; 
        END $$;
      `);
    };

    // 2. Add branch_id to core tables
    await addColumn('users', 'branch_id', "TEXT REFERENCES branches(id) ON DELETE SET NULL DEFAULT 'b1'");
    await addColumn('employees', 'branch_id', "TEXT REFERENCES branches(id) ON DELETE SET NULL DEFAULT 'b1'");
    await addColumn('drivers', 'branch_id', "TEXT REFERENCES branches(id) ON DELETE SET NULL DEFAULT 'b1'");
    await addColumn('orders', 'branch_id', "TEXT REFERENCES branches(id) ON DELETE SET NULL DEFAULT 'b1'");
    await addColumn('shifts', 'branch_id', "TEXT REFERENCES branches(id) ON DELETE SET NULL DEFAULT 'b1'");
    await addColumn('restaurant_tables', 'branch_id', "TEXT REFERENCES branches(id) ON DELETE SET NULL DEFAULT 'b1'");
    await addColumn('inventory_items', 'branch_id', "TEXT REFERENCES branches(id) ON DELETE SET NULL DEFAULT 'b1'");
    console.log('✅ Added branch_id columns to users, employees, drivers, orders, shifts, restaurant_tables, inventory_items');

    // Set existing records without branch_id to 'b1'
    await client.query("UPDATE users SET branch_id = 'b1' WHERE branch_id IS NULL");
    await client.query("UPDATE employees SET branch_id = 'b1' WHERE branch_id IS NULL");
    await client.query("UPDATE drivers SET branch_id = 'b1' WHERE branch_id IS NULL");
    await client.query("UPDATE orders SET branch_id = 'b1' WHERE branch_id IS NULL");
    await client.query("UPDATE shifts SET branch_id = 'b1' WHERE branch_id IS NULL");
    await client.query("UPDATE restaurant_tables SET branch_id = 'b1' WHERE branch_id IS NULL");
    await client.query("UPDATE inventory_items SET branch_id = 'b1' WHERE branch_id IS NULL");

    // 3. Add dispatched_at to orders for delivery timing
    await addColumn('orders', 'dispatched_at', 'TIMESTAMP WITH TIME ZONE');
    console.log('✅ Added dispatched_at column to orders');

    // 4. Create driver_attendance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS driver_attendance (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        driver_id TEXT REFERENCES drivers(id) ON DELETE CASCADE,
        employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
        driver_name TEXT NOT NULL,
        branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE DEFAULT 'b1',
        check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        check_out_time TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'ready',
        current_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
        queue_position INT DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created driver_attendance table');

    // 5. Add default settings for delivery timer
    await client.query(`
      INSERT INTO app_settings (key, value) VALUES
        ('delivery_timer_minutes', '30')
      ON CONFLICT (key) DO NOTHING;
    `);
    console.log('✅ Added default delivery_timer_minutes setting');

    await client.query('COMMIT');
    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
