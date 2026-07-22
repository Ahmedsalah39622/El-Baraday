import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username } = await request.json();
    if (!username || !username.trim()) {
      return NextResponse.json({ exists: false, error: 'أدخل اسم المستخدم' }, { status: 400 });
    }

    const clean = username.trim().toLowerCase();
    const result = await query(
      'SELECT id, username, name, role, avatar FROM users WHERE LOWER(username) = $1 OR LOWER(name) = $1 LIMIT 1',
      [clean]
    );

    if (result.rows.length === 0) {
      // Also allow default login for administrator/cashier if DB is fresh
      if (clean === 'administrator' || clean === 'المدير' || clean === 'كاشير') {
        return NextResponse.json({
          exists: true,
          username: clean,
          name: clean === 'administrator' ? 'المدير العام' : clean,
          role: 'admin'
        });
      }
      return NextResponse.json({ exists: false, error: 'اسم المستخدم غير مسجل بالنظام' }, { status: 404 });
    }

    const user = result.rows[0];
    return NextResponse.json({
      exists: true,
      username: user.username,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    });
  } catch (error) {
    console.error('❌ Error verifying user:', error.message);
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }
}
