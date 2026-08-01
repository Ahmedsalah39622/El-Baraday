import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { username, name, pin, role, permissions, status, avatar, branch_id } = body;

    const permsStr = Array.isArray(permissions) ? JSON.stringify(permissions) : null;

    // Only update PIN if a non-empty value was provided
    const pinValue = pin && pin.trim().length >= 4 ? pin.trim() : null;

    const result = await query(
      `UPDATE users SET
         username    = COALESCE($1, username),
         name        = COALESCE($2, name),
         pin         = CASE WHEN $3 IS NOT NULL THEN $3 ELSE pin END,
         role        = COALESCE($4, role),
         permissions = COALESCE($5, permissions),
         status      = COALESCE($6, status),
         avatar      = COALESCE($7, avatar),
         branch_id   = COALESCE($8, branch_id)
       WHERE id = $9 RETURNING *`,
      [
        username ? username.trim().toLowerCase() : null,
        name     ? name.trim()                   : null,
        pinValue,
        role    || null,
        permsStr,
        status  || null,
        avatar  || null,
        branch_id || null,
        id
      ]
    );

    if (result.rows && result.rows.length > 0) {
      const u = result.rows[0];
      return NextResponse.json({
        ...u,
        permissions: u.permissions
          ? (typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions)
          : []
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
    if (!id) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 });
    }

    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    if ((result?.rowCount || 0) === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
