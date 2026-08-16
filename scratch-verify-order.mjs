import { query } from './src/lib/db.js';

async function testCurrentLiveOrder() {
  const smallItemId = '6ce034b2-0bad-4b54-b9e8-c823ccaf76a9'; // ساده صغير
  const largeItemId = '30476a9c-3afe-4e4d-a1ed-aa279ef45a5b'; // ساده كبير
  const branchId = 'b1'; // فرع عزت

  const [smallBefore] = (await query('SELECT current_stock FROM inventory_branch_stock WHERE item_id = $1 AND branch_id = $2', [smallItemId, branchId])).rows;
  const [largeBefore] = (await query('SELECT current_stock FROM inventory_branch_stock WHERE item_id = $1 AND branch_id = $2', [largeItemId, branchId])).rows;
  
  console.log('--- BEFORE TEST ORDER ---');
  console.log('ساده صغير stock:', smallBefore?.current_stock);
  console.log('ساده كبير stock:', largeBefore?.current_stock);

  // Send order for 1 حواوشي ساده (صغير)
  const res = await fetch('https://el-baraday-pos.vercel.app/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_type: 'dine_in',
      payment_method: 'cash',
      cashier_name: 'test_verify',
      branch_id: branchId,
      subtotal: 25,
      total: 25,
      paid_amount: 25,
      items: [
        {
          product_id: 'p_1785320264284',
          product_name: 'حواوشي ساده (صغير)',
          price: 25,
          quantity: 1,
          size: 'صغير'
        }
      ]
    })
  });

  const orderData = await res.json();
  console.log('Created Order #:', orderData?.order_number);

  const [smallAfter] = (await query('SELECT current_stock FROM inventory_branch_stock WHERE item_id = $1 AND branch_id = $2', [smallItemId, branchId])).rows;
  const [largeAfter] = (await query('SELECT current_stock FROM inventory_branch_stock WHERE item_id = $1 AND branch_id = $2', [largeItemId, branchId])).rows;

  console.log('--- AFTER TEST ORDER ---');
  console.log('ساده صغير stock:', smallAfter?.current_stock, '(Diff:', parseFloat(smallBefore?.current_stock) - parseFloat(smallAfter?.current_stock), ')');
  console.log('ساده كبير stock:', largeAfter?.current_stock, '(Diff:', parseFloat(largeBefore?.current_stock) - parseFloat(largeAfter?.current_stock), ')');

  // Check the latest transaction
  const [latestTrans] = (await query('SELECT * FROM inventory_transactions ORDER BY created_at DESC LIMIT 2')).rows;
  console.log('Latest transaction log:', latestTrans);
}

testCurrentLiveOrder();
