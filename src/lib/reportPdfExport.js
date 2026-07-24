// Executive A4 PDF Report Generator Utility with High-End Corporate Styling
export function generateReportPDF({
  title = 'تقرير مطعم البرادعي',
  subtitle = '',
  branchName = 'كافة الفروع',
  dateRangeStr = '',
  stats = [],
  columns = [],
  data = [],
  totals = null,
}) {
  if (!data) return;

  const reportRefId = `REP-${Math.floor(100000 + Math.random() * 900000)}`;

  // Table Headers
  const tableHeaderHtml = columns
    .map(c => `<th style="padding: 10px 12px; border: 1px solid #334155; background-color: #1E293B; color: #FFFFFF; font-weight: 800; font-size: 12px; text-align: center; letter-spacing: 0.3px;">${c.label}</th>`)
    .join('');

  // Table Rows
  const tableRowsHtml = data.map((row, idx) => {
    const cells = columns.map(c => {
      let val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      if (val === undefined || val === null) val = '';
      return `<td style="padding: 9px 12px; border: 1px solid #E2E8F0; font-size: 11.5px; font-weight: 700; color: #1E293B; text-align: center;">${val}</td>`;
    }).join('');
    return `<tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">${cells}</tr>`;
  }).join('');

  // Table Totals Footer Row (if available)
  let totalsRowHtml = '';
  if (totals && typeof totals === 'object') {
    const totalCells = columns.map((c, colIdx) => {
      if (colIdx === 0) return `<td style="padding: 10px 12px; border: 1.5px solid #1E293B; background: #F1F5F9; font-weight: 900; font-size: 12px; color: #0F172A; text-align: center;">المجموع الكلي</td>`;
      const val = totals[c.key || c.accessor];
      return `<td style="padding: 10px 12px; border: 1.5px solid #1E293B; background: #F1F5F9; font-weight: 900; font-size: 12px; color: #2563EB; text-align: center;">${val !== undefined ? val : '-'}</td>`;
    }).join('');
    totalsRowHtml = `<tfoot><tr style="border-top: 2px solid #1E293B;">${totalCells}</tr></tfoot>`;
  }

  // Summary KPI Cards Grid
  const statsHtml = stats.length > 0 ? `
    <div style="display: grid; grid-template-columns: repeat(${Math.min(stats.length, 4)}, 1fr); gap: 12px; margin-bottom: 22px;">
      ${stats.map(s => `
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #3B82F6; border-radius: 10px; padding: 12px 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
          <div style="font-size: 11.5px; font-weight: 800; color: #64748B; margin-bottom: 4px;">${s.title}</div>
          <div style="font-size: 18px; font-weight: 900; color: #0F172A;">${s.value}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 12mm 12mm;
        }
        @media print {
          @page {
            margin: 10mm 12mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
          color: #0F172A;
          direction: rtl;
          padding: 16px;
          background-color: #FFFFFF;
          font-size: 12px;
        }

        /* Header Banner */
        .banner {
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          border-top: 4px solid #F59E0B;
          border-radius: 14px;
          padding: 18px 22px;
          margin-bottom: 20px;
          color: #FFFFFF;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
        }
        .brand-name {
          font-size: 22px;
          font-weight: 900;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .brand-name span {
          color: #F59E0B;
        }
        .doc-title {
          font-size: 16px;
          font-weight: 800;
          color: #93C5FD;
          background: rgba(147, 197, 253, 0.1);
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid rgba(147, 197, 253, 0.2);
          display: inline-block;
        }
        .meta-box {
          text-align: left;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        .meta-pill {
          background: rgba(255, 255, 255, 0.12);
          color: #F8FAFC;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .meta-sub {
          font-size: 10.5px;
          color: #94A3B8;
          font-weight: 600;
        }

        /* Table */
        .table-container {
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }

        /* Footer Signatures */
        .footer-grid {
          margin-top: 30px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          padding-top: 16px;
          border-top: 1.5px solid #E2E8F0;
        }
        .signature-card {
          border: 1px solid #E2E8F0;
          background: #FAFCFF;
          border-radius: 10px;
          padding: 12px;
          text-align: center;
        }
        .sig-title {
          font-size: 11px;
          font-weight: 800;
          color: #475569;
          margin-bottom: 24px;
        }
        .sig-line {
          border-bottom: 1.5px dashed #CBD5E1;
          width: 80%;
          margin: 0 auto 6px auto;
        }

        .seal-box {
          border: 2px double #94A3B8;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 900;
          color: #64748B;
          text-align: center;
          transform: rotate(-12deg);
        }

        .system-footer {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #94A3B8;
          font-weight: 700;
        }
      </style>
    </head>
    <body>
      <!-- Header Banner -->
      <div class="banner">
        <div>
          <div class="brand-name">
            🍔 مطعم <span>البرادعي</span> للحواوشي
          </div>
          <div class="doc-title">${title}</div>
          ${subtitle ? `<div style="font-size: 11px; color: #CBD5E1; margin-top: 4px;">${subtitle}</div>` : ''}
        </div>

        <div class="meta-box">
          <div class="meta-pill">🏢 ${branchName}</div>
          <div class="meta-sub">📅 الفترة: ${dateRangeStr || 'اليوم'}</div>
          <div class="meta-sub">⏱️ اصدار: ${new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</div>
          <div class="meta-sub">رقم المرجع: ${reportRefId}</div>
        </div>
      </div>

      <!-- Summary KPI Cards -->
      ${statsHtml}

      <!-- Data Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
          ${totalsRowHtml}
        </table>
      </div>

      <!-- Signatures Footer -->
      <div class="footer-grid">
        <div class="signature-card">
          <div class="sig-title">إعداد المسـؤول / الكاشير</div>
          <div class="sig-line"></div>
          <div style="font-size: 10px; color: #64748B;">التوقيع والاسم</div>
        </div>

        <div class="signature-card">
          <div class="sig-title">المراجعـة والتدقيق المالي</div>
          <div class="sig-line"></div>
          <div style="font-size: 10px; color: #64748B;">التوقيع والاعتماد</div>
        </div>

        <div class="signature-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div class="seal-box">
            ختم الفرع<br/>المعتمد
          </div>
        </div>
      </div>

      <!-- System Footer Line -->
      <div class="system-footer">
        <div>نظام إدارة المبيعات ونقاط البيع (البرادعي POS)</div>
        <div>صفحة 1 من 1</div>
        <div>وثيقة إدارية رسمية</div>
      </div>
    </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch (e) {}
    }, 2000);
  }, 350);
}
