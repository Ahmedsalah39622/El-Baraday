// Executive Formal A4 PDF Report Generator Utility - Dignified Corporate Styling
export function generateReportPDF({
  title = 'تقرير إداري - مطعم البرادعي',
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
    .map(c => `<th style="padding: 10px 12px; border: 1px solid #1E293B; background-color: #1E293B; color: #FFFFFF; font-weight: 800; font-size: 12px; text-align: center;">${c.label}</th>`)
    .join('');

  // Table Rows (Remove any emojis from cell contents if present)
  const tableRowsHtml = data.map((row, idx) => {
    const cells = columns.map(c => {
      let val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      if (val === undefined || val === null) val = '';
      // Strip any emoji characters for maximum formal elegance
      const cleanVal = String(val).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
      return `<td style="padding: 9px 12px; border: 1px solid #CBD5E1; font-size: 11.5px; font-weight: 700; color: #0F172A; text-align: center;">${cleanVal}</td>`;
    }).join('');
    return `<tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">${cells}</tr>`;
  }).join('');

  // Table Totals Footer Row (if available)
  let totalsRowHtml = '';
  if (totals && typeof totals === 'object') {
    const totalCells = columns.map((c, colIdx) => {
      if (colIdx === 0) return `<td style="padding: 10px 12px; border: 1.5px solid #1E293B; background: #F1F5F9; font-weight: 900; font-size: 12px; color: #0F172A; text-align: center;">المجموع الكلي</td>`;
      const val = totals[c.key || c.accessor];
      return `<td style="padding: 10px 12px; border: 1.5px solid #1E293B; background: #F1F5F9; font-weight: 900; font-size: 12px; color: #1E40AF; text-align: center;">${val !== undefined ? val : '-'}</td>`;
    }).join('');
    totalsRowHtml = `<tfoot><tr style="border-top: 2px solid #1E293B;">${totalCells}</tr></tfoot>`;
  }

  // Summary KPI Cards Grid
  const statsHtml = stats.length > 0 ? `
    <div style="display: grid; grid-template-columns: repeat(${Math.min(stats.length, 4)}, 1fr); gap: 12px; margin-bottom: 22px;">
      ${stats.map(s => `
        <div style="background: #FFFFFF; border: 1.5px solid #CBD5E1; border-right: 4px solid #1E293B; border-radius: 6px; padding: 12px 14px;">
          <div style="font-size: 11.5px; font-weight: 800; color: #475569; margin-bottom: 4px;">${s.title}</div>
          <div style="font-size: 17px; font-weight: 900; color: #0F172A;">${String(s.value).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')}</div>
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
          margin: 0mm;
        }
        @media print {
          @page {
            margin: 0mm;
          }
          html, body {
            margin: 0 !important;
            padding: 12mm 15mm !important;
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
          padding: 12mm 15mm;
          background-color: #FFFFFF;
          font-size: 12px;
        }

        /* Dignified Header Banner */
        .banner {
          background: #1E293B;
          border-bottom: 3px solid #0F172A;
          border-radius: 8px;
          padding: 20px 24px;
          margin-bottom: 22px;
          color: #FFFFFF;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .brand-name {
          font-size: 22px;
          font-weight: 900;
          color: #FFFFFF;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .doc-title {
          font-size: 15px;
          font-weight: 800;
          color: #E2E8F0;
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 12px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.2);
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
          background: rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.25);
        }
        .meta-sub {
          font-size: 10.5px;
          color: #CBD5E1;
          font-weight: 700;
        }

        /* Table */
        .table-container {
          border: 1.5px solid #1E293B;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }

        /* Footer Signatures */
        .footer-grid {
          margin-top: 35px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          padding-top: 16px;
          border-top: 1.5px solid #94A3B8;
        }
        .signature-card {
          border: 1px solid #CBD5E1;
          background: #FAFCFF;
          border-radius: 6px;
          padding: 14px;
          text-align: center;
        }
        .sig-title {
          font-size: 11.5px;
          font-weight: 800;
          color: #1E293B;
          margin-bottom: 28px;
        }
        .sig-line {
          border-bottom: 1.5px solid #94A3B8;
          width: 85%;
          margin: 0 auto 6px auto;
        }

        .seal-box {
          border: 2px double #1E293B;
          border-radius: 50%;
          width: 68px;
          height: 68px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9.5px;
          font-weight: 900;
          color: #1E293B;
          text-align: center;
        }

        .system-footer {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #64748B;
          font-weight: 800;
          border-top: 1px solid #E2E8F0;
          padding-top: 8px;
        }
      </style>
    </head>
    <body>
      <!-- Header Banner -->
      <div class="banner">
        <div>
          <div class="brand-name">
            مطعم البرادعي للحواوشي
          </div>
          <div class="doc-title">${title}</div>
          ${subtitle ? `<div style="font-size: 11px; color: #E2E8F0; margin-top: 4px;">${subtitle}</div>` : ''}
        </div>

        <div class="meta-box">
          <div class="meta-pill">الفرع: ${branchName}</div>
          <div class="meta-sub">الفترة الزمنية: ${dateRangeStr || 'اليوم'}</div>
          <div class="meta-sub">تاريخ الإصدار: ${new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</div>
          <div class="meta-sub">الرقم المرجعي: ${reportRefId}</div>
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
          <div class="sig-title">إعداد المسؤول / الكاشير</div>
          <div class="sig-line"></div>
          <div style="font-size: 10px; color: #475569; font-weight: 700;">التوقيع والاسم</div>
        </div>

        <div class="signature-card">
          <div class="sig-title">المراجعة والتدقيق المالي</div>
          <div class="sig-line"></div>
          <div style="font-size: 10px; color: #475569; font-weight: 700;">التوقيع والاعتماد</div>
        </div>

        <div class="signature-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div class="seal-box">
            ختم الفرع<br/>المعتمد
          </div>
        </div>
      </div>

      <!-- System Footer Line -->
      <div class="system-footer">
        <div>نظام إدارة المبيعات ونقاط البيع - مطعم البرادعي</div>
        <div>تقرير إداري رسمـي</div>
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
