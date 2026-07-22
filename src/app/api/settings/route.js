import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await query('SELECT * FROM app_settings');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    for (const [key, value] of Object.entries(body)) {
      await query(
        `INSERT INTO app_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [key, String(value)]
      );
    }
    // Return updated settings
    const result = await query('SELECT * FROM app_settings');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
