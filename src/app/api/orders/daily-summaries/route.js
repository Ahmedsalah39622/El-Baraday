import { NextResponse } from 'next/server';
import { getDailySummaries } from '@/lib/dailySummary';

/**
 * GET /api/orders/daily-summaries?branch_id=b1&limit=30
 * جلب سجل الملخصات اليومية المحفوظة
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branch_id') || 'all';
    const limit = parseInt(searchParams.get('limit') || '30');

    const summaries = await getDailySummaries(branchId, limit);

    return NextResponse.json(summaries);
  } catch (error) {
    console.error('❌ Error fetching daily summaries:', error);
    return NextResponse.json([], { status: 500 });
  }
}
