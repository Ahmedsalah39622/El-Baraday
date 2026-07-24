import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const branchId = searchParams.get('branch_id');

    let whereClause = 'WHERE created_at::date = $1';
    const params = [date];

    if (branchId && branchId !== 'all') {
      params.push(branchId);
      whereClause += ` AND branch_id = $${params.length}`;
    }

    // Aggregate daily stats isolated per branch
    const statsResult = await query(
      `SELECT
         COUNT(*)::INT as total_orders,
         COALESCE(SUM(total), 0)::NUMERIC as total_sales,
         COALESCE(SUM(paid_amount), 0)::NUMERIC as total_paid,
         COALESCE(SUM(remaining_amount), 0)::NUMERIC as total_remaining,
         COALESCE(SUM(delivery_fee), 0)::NUMERIC as total_delivery_fees,
         COALESCE(SUM(discount), 0)::NUMERIC as total_discounts,
         COUNT(*) FILTER (WHERE order_type = 'delivery')::INT as delivery_count,
         COUNT(*) FILTER (WHERE order_type = 'dine_in')::INT as dine_in_count,
         COUNT(*) FILTER (WHERE order_type = 'takeaway')::INT as takeaway_count,
         COUNT(*) FILTER (WHERE payment_method = 'cash')::INT as cash_count,
         COUNT(*) FILTER (WHERE payment_method = 'visa')::INT as visa_count,
         COALESCE(SUM(total) FILTER (WHERE payment_method = 'cash'), 0)::NUMERIC as cash_total,
         COALESCE(SUM(total) FILTER (WHERE payment_method = 'visa'), 0)::NUMERIC as visa_total
       FROM orders
       ${whereClause}`,
      params
    );

    let topProductsWhere = 'WHERE o.created_at::date = $1';
    const topParams = [date];
    if (branchId && branchId !== 'all') {
      topParams.push(branchId);
      topProductsWhere += ` AND o.branch_id = $${topParams.length}`;
    }

    // Top selling products for the day isolated per branch
    const topProducts = await query(
      `SELECT oi.product_name, SUM(oi.quantity)::INT as total_qty,
              SUM(oi.price * oi.quantity)::NUMERIC as total_revenue
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
      ...statsResult.rows[0],
      top_products: topProducts.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
