import { NextResponse } from 'next/server';
import { saveDailySummary, deleteOrdersForDate, deleteSummariesOlderThan, getOldOrderDates } from '@/lib/dailySummary';

/**
 * POST /api/orders/daily-close
 * تصفير الطلبات اليومي — يحفظ ملخص كل يوم قديم ويمسح طلباته
 * 
 * Body (optional):
 *   { date: '2026-09-11', branch_id: 'b1' }
 * 
 * If no date provided, processes ALL old days (before today)
 */
export async function POST(request) {
  try {
    let body = {};
    try { body = await request.json(); } catch { }

    const specificDate = body.date;
    const branchId = body.branch_id || 'all';

    // حذف الملخصات اللي عدى عليها 5 أيام
    const cleanupResult = await deleteSummariesOlderThan(5);

    if (specificDate) {
      // معالجة يوم محدد فقط
      const saveResult = await saveDailySummary(specificDate, branchId);
      const deleteResult = await deleteOrdersForDate(specificDate, branchId);

      return NextResponse.json({
        success: true,
        date: specificDate,
        summary_saved: saveResult,
        orders_deleted: deleteResult,
        old_summaries_cleaned: cleanupResult,
        message: `✅ تم حفظ ملخص يوم ${specificDate} وتصفير طلباته`
      });
    }

    // معالجة كل الأيام القديمة (قبل اليوم)
    const oldDates = await getOldOrderDates();

    if (oldDates.length === 0) {
      return NextResponse.json({
        success: true,
        message: '✅ لا توجد طلبات قديمة تحتاج تصفير',
        old_summaries_cleaned: cleanupResult,
        processed_dates: []
      });
    }

    const processedDates = [];
    for (const dateRow of oldDates) {
      const dateStr = dateRow.order_date instanceof Date
        ? dateRow.order_date.toISOString().split('T')[0]
        : String(dateRow.order_date).split('T')[0];

      const saveResult = await saveDailySummary(dateStr, branchId);
      const deleteResult = await deleteOrdersForDate(dateStr, branchId);
      
      processedDates.push({
        date: dateStr,
        orders_count: parseInt(dateRow.order_count) || 0,
        summary_saved: saveResult,
        orders_deleted: deleteResult
      });
    }

    return NextResponse.json({
      success: true,
      message: `✅ تم حفظ وتصفير ${processedDates.length} يوم/أيام قديمة`,
      old_summaries_cleaned: cleanupResult,
      processed_dates: processedDates
    });
  } catch (error) {
    console.error('❌ Daily close error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
