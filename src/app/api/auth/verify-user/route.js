import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username, id } = await request.json();
    if (!username && !id) {
      return NextResponse.json({ exists: false, error: 'أدخل اسم المستخدم أو المعرف' }, { status: 400 });
    }

    let result;
    if (id) {
      result = await query(
        'SELECT id, username, name, role, permissions, status, avatar, branch_id FROM users WHERE id = $1 LIMIT 1',
        [id]
      );
    } else {
      const clean = username.trim().toLowerCase();
      result = await query(
        'SELECT id, username, name, role, permissions, status, avatar, branch_id FROM users WHERE LOWER(username) = $1 OR LOWER(name) = $2 LIMIT 1',
        [clean, clean]
      );
    }

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ exists: false, error: 'المستخدم غير مسجل في داتابيز النظام' }, { status: 404 });
    }

    const user = result.rows[0];
    let parsedPerms = [];
    try {
      parsedPerms = user.permissions
        ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions)
        : [];
    } catch (e) {
      parsedPerms = [];
    }

    return NextResponse.json({
      exists: true,
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: parsedPerms,
      status: user.status || 'active',
      avatar: user.avatar,
      branch_id: user.branch_id || 'b1'
    });
  } catch (error) {
    console.error('❌ Error verifying user:', error.message);
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}

