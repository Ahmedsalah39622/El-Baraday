import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username, pin } = await request.json();
    if (!username || !pin) {
      return NextResponse.json({ success: false, error: 'برجاء إدخال اسم المستخدم ورمز PIN' }, { status: 400 });
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPin = pin.trim();

    // Query database for exact username/name and PIN match
    const result = await query(
      'SELECT id, username, name, role, permissions, status, avatar FROM users WHERE (LOWER(username) = $1 OR LOWER(name) = $2) AND pin = $3 LIMIT 1',
      [cleanUser, cleanUser, cleanPin]
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'رمز PIN غير صحيح أو المستخدم غير مسجل بالداتابيز!' }, { status: 401 });
    }

    const user = result.rows[0];

    if (user.status === 'inactive') {
      return NextResponse.json({ success: false, error: 'هذا الحساب غير نشط حالياً، برجاء مراجعة الأدمن' }, { status: 403 });
    }

    // Update last_login timestamp
    try {
      await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    } catch (e) {}

    let parsedPerms = [];
    try {
      parsedPerms = user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : [];
    } catch (e) {
      parsedPerms = [];
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: parsedPerms,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('❌ Error logging in:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
