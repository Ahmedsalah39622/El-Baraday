const { query } = require('../src/lib/db');

async function resetUndispatchedTimers() {
  try {
    console.log('🔄 Resetting dispatched_at for undispatched delivery orders...');
    await query(`
      UPDATE orders 
      SET dispatched_at = NULL, status = 'preparing' 
      WHERE order_type = 'delivery' AND (status = 'out_for_delivery' OR status = 'pending' OR status = 'preparing');
    `);
    console.log('✅ Undispatched order timers reset successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to reset timers:', err);
    process.exit(1);
  }
}

resetUndispatchedTimers();
