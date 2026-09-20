const { query } = require('./src/lib/db');

async function test() {
  const targetBranch = 'b1';
  let shiftSql = "SELECT id, start_time FROM shifts WHERE status = 'active'";
  const shiftParams = [];
  if (targetBranch && targetBranch !== 'all') {
    shiftSql += " AND (branch_id = $1 OR branch_id IS NULL OR branch_id = '' OR branch_id = 'all')";
    shiftParams.push(targetBranch);
  }
  shiftSql += " ORDER BY start_time DESC LIMIT 1";
  const shiftRes = await query(shiftSql, shiftParams);
  console.log('Active shift:', shiftRes.rows);
  const activeShiftRecord = shiftRes.rows && shiftRes.rows[0];
  let nextNum = 1;
  if (activeShiftRecord) {
    const sql = (targetBranch && targetBranch !== 'all')
      ? "SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders WHERE branch_id = $1 AND (shift_id = $2 OR (shift_id IS NULL AND created_at >= $3))"
      : "SELECT COALESCE(MAX(CAST(order_number AS INTEGER)), 0) + 1 as next FROM orders WHERE (shift_id = $1 OR (shift_id IS NULL AND created_at >= $2))";
    const params = (targetBranch && targetBranch !== 'all') ? [targetBranch, activeShiftRecord.id, activeShiftRecord.start_time] : [activeShiftRecord.id, activeShiftRecord.start_time];
    const nextRes = await query(sql, params);
    console.log('Next res:', nextRes);
    if (nextRes && nextRes.rows && nextRes.rows.length > 0 && nextRes.rows[0].next) {
      nextNum = parseInt(nextRes.rows[0].next) || 1;
    }
  } else {
    console.log('NO ACTIVE SHIFT FOR b1');
  }
  console.log('Calculated nextNum for b1:', nextNum);

  // Now test with b2
  const shiftRes2 = await query("SELECT id, start_time FROM shifts WHERE status = 'active' AND branch_id = $1", ['b2']);
  console.log('Active shift b2:', shiftRes2.rows);

  // Check all active shifts
  const allActive = await query("SELECT * FROM shifts WHERE status = 'active'");
  console.log('All active shifts:', allActive.rows);
}

test().catch(console.error).finally(() => process.exit(0));
