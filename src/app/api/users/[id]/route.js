import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { username, name, pin, role, permissions, status, avatar } = body;

    const permsStr = Array.isArray(permissions) ? JSON.stringify(permissions) : undefined;

    const result = await query(
      `UPDATE users SET
         username = COALESCE($1, username),
         name = COALESCE($2, name),
         pin = COALESCE($3, pin),
         role = COALESCE($4, role),
         permissions = COALESCE($5, permissions),
         status = COALESCE($6, status),
         avatar = COALESCE($7, avatar)
       WHERE id = $8 RETURNING *`,
      [username ? username.trim().toLowerCase() : null, name ? name.trim() : null, pin ? pin.trim() : null, role || null, permsStr || null, status || null, avatar || null, id]
    );

    if (result.rows && result.rows.length > 0) {
      const u = result.rows[0];
      return NextResponse.json({
        ...u,
        permissions: u.permissions ? JSON.parse(u.permissions) : []
      });
    }

    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await query('DELETE FROM users WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
