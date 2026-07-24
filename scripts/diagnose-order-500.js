const { query } = require('../src/lib/db');

async function diagnose() {
  try {
    console.log('🔍 Checking order in DB...');
    const id = '2a4ceb20-0b93-44f7-bad5-3244f267fce7';
    const res = await query('SELECT * FROM orders WHERE id = $1', [id]);
    console.log('Query result:', res);

    if (res.error) {
      console.error('❌ DB returned error:', res.error);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

diagnose();
