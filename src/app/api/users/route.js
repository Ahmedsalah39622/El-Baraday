import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Sync any employees from employees table into users table so they appear in /admin
    const empResult = await query('SELECT * FROM employees');
    const existingUsersResult = await query('SELECT * FROM users');
    const existingUsers = existingUsersResult.rows || [];

    for (const emp of (empResult.rows || [])) {
      const match = existingUsers.find(u => u.id === emp.id || u.name === emp.name || (emp.phone && u.username === emp.phone));
      if (!match) {
        const cleanUsername = (emp.phone || emp.name).replace(/\s+/g, '').toLowerCase() || `emp_${emp.id.slice(0, 5)}`;
        const mappedRole = emp.role && (emp.role.includes('مدير') || emp.role.includes('أدمن')) ? 'admin' : (emp.role && (emp.role.includes('طيار') || emp.role.includes('دليفري')) ? 'driver' : 'cashier');
        const defaultPerms = mappedRole === 'admin' 
          ? ['pos', 'tables', 'delivery', 'inventory', 'salaries', 'reports', 'settings', 'admin', 'attendance', 'shift-summary']
          : (mappedRole === 'driver' ? ['delivery', 'attendance'] : ['pos', 'tables', 'delivery', 'attendance']);

        await query(
          `INSERT INTO users (id, username, name, pin, role, permissions, status, branch_id)
           VALUES ($1, $2, $3, '1234', $4, $5, 'active', $6)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, branch_id = EXCLUDED.branch_id`,
          [emp.id, cleanUsername, emp.name, mappedRole, JSON.stringify(defaultPerms), emp.branch_id || 'b1']
        );
      }
    }

    // 2. Query all system users joined with branch names
    const result = await query(`
      SELECT u.id, u.username, u.name, u.role, u.permissions, u.status, u.avatar, u.last_login, u.created_at, u.branch_id, COALESCE(b.name, 'الفرع الرئيسي') as branch_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      ORDER BY u.created_at ASC
    `);

    const rows = (result.rows || []).map((u) => {
      let parsedPerms = [];
      try {
        parsedPerms = u.permissions ? (typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions) : [];
      } catch (e) {
        parsedPerms = [];
      }
      return {
        ...u,
        permissions: parsedPerms
      };
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, name, pin, role, permissions, status, avatar, branch_id } = body;

    if (!username || !name || !pin) {
      return NextResponse.json({ error: 'اسم المستخدم والاسم والـ PIN مطلوبين' }, { status: 400 });
    }

    const permsStr = Array.isArray(permissions) ? JSON.stringify(permissions) : JSON.stringify(permissions || []);

    const result = await query(
      `INSERT INTO users (id, username, name, pin, role, permissions, status, avatar, branch_id)
       VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [username.trim().toLowerCase(), name.trim(), pin.trim(), role || 'cashier', permsStr, status || 'active', avatar || null, branch_id || 'b1']
    );

    if (result.rows && result.rows.length > 0) {
      const u = result.rows[0];
      return NextResponse.json({
        ...u,
        permissions: u.permissions ? (typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions) : []
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  } catch (error) {
    console.error('❌ Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
