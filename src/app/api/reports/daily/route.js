import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const branchId = searchParams.get('branch_id');

    let whereClause = 'WHERE DATE(created_at) = $1';
    const params = [date];

    if (branchId && branchId !== 'all') {
      params.push(branchId);
      whereClause += ` AND branch_id = $${params.length}`;
    }

    // Aggregate daily stats isolated per branch
    const statsResult = await query(
      `SELECT
         COUNT(*) as total_orders,
         COALESCE(SUM(total), 0) as total_sales,
         COALESCE(SUM(paid_amount), 0) as total_paid,
         COALESCE(SUM(remaining_amount), 0) as total_remaining,
         COALESCE(SUM(delivery_fee), 0) as total_delivery_fees,
         COALESCE(SUM(discount), 0) as total_discounts,
         SUM(CASE WHEN order_type = 'delivery' THEN 1 ELSE 0 END) as delivery_count,
         SUM(CASE WHEN order_type = 'dine_in' THEN 1 ELSE 0 END) as dine_in_count,
         SUM(CASE WHEN order_type = 'takeaway' THEN 1 ELSE 0 END) as takeaway_count,
         SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END) as cash_count,
         SUM(CASE WHEN payment_method = 'visa' THEN 1 ELSE 0 END) as visa_count,
         COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_total,
         COALESCE(SUM(CASE WHEN payment_method = 'visa' THEN total ELSE 0 END), 0) as visa_total
       FROM orders
       ${whereClause}`,
      params
    );

    let topProductsWhere = 'WHERE DATE(o.created_at) = $1';
    const topParams = [date];
    if (branchId && branchId !== 'all') {
      topParams.push(branchId);
      topProductsWhere += ` AND o.branch_id = $${topParams.length}`;
    }

    // Top selling products for the day isolated per branch
    const topProducts = await query(
      `SELECT oi.product_name, SUM(oi.quantity) as total_qty,
              SUM(oi.price * oi.quantity) as total_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       ${topProductsWhere}
       GROUP BY oi.product_name
       ORDER BY total_qty DESC
       LIMIT 10`,
      topParams
    );

    return NextResponse.json({
      date,
      stats: statsResult.rows[0] || {},
      topProducts: topProducts.rows || []
    });
  } catch (error) {
    console.error('Error fetching daily report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
