// Corporate ERP Style A4 PDF Report Generator - ITTSOFT Inspired Layout
export function generateReportPDF({
  title = 'تقرير إداري',
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
  const currentDateStr = new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

  // Table Headers
  const tableHeaderHtml = columns
    .map(c => `<th style="padding: 9px 10px; border: 1px solid #0F172A; background-color: #0F172A; color: #FFFFFF; font-weight: 800; font-size: 12px; text-align: center;">${c.label}</th>`)
    .join('');

  // Table Rows (Passing both row and idx so (r, idx) => idx + 1 never returns NaN!)
  const tableRowsHtml = data.map((row, idx) => {
    const cells = columns.map(c => {
      let val = typeof c.accessor === 'function' ? c.accessor(row, idx) : row[c.accessor];
      if (val === undefined || val === null) val = '';
      const cleanVal = String(val).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
      return `<td style="padding: 8px 10px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 700; color: #0F172A; text-align: center;">${cleanVal}</td>`;
    }).join('');
    return `<tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">${cells}</tr>`;
  }).join('');

  // Table Totals Footer Row (Solid Black Row - Matching ITTSOFT Reference Image Exactly)
  let totalsRowHtml = '';
  if (totals && typeof totals === 'object') {
    const totalCells = columns.map((c, colIdx) => {
      const key = c.key || (typeof c.accessor === 'string' ? c.accessor : null);
      let val = key ? totals[key] : (totals[colIdx] !== undefined ? totals[colIdx] : undefined);
      
      // Auto-assign "الإجمالي" label to second column (or column 1 in RTL)
      if (val === undefined && (colIdx === 1 || colIdx === columns.length - 2)) {
        val = 'الإجمالي';
      }
      
      const cleanVal = val !== undefined ? String(val).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim() : '';

      return `<td style="padding: 10px 8px; border: 1px solid #1E293B; background-color: #000000; font-weight: 900; font-size: 13px; color: #FFFFFF; text-align: center;">${cleanVal}</td>`;
    }).join('');
    totalsRowHtml = `<tfoot><tr style="background-color: #000000; color: #FFFFFF;">${totalCells}</tr></tfoot>`;
  }

  // Summary KPI Cards Grid
  const statsHtml = stats.length > 0 ? `
    <div style="display: grid; grid-template-columns: repeat(${Math.min(stats.length, 4)}, 1fr); gap: 12px; margin-bottom: 18px;">
      ${stats.map(s => `
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-top: 3px solid #0F172A; border-radius: 4px; padding: 10px 12px; text-align: center;">
          <div style="font-size: 11px; font-weight: 800; color: #475569; margin-bottom: 3px;">${s.title}</div>
          <div style="font-size: 16px; font-weight: 900; color: #0F172A;">${String(s.value).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')}</div>
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
            padding: 10mm 12mm !important;
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
          font-family: 'Cairo', Arial, sans-serif;
          color: #0F172A;
          direction: rtl;
          padding: 10mm 12mm;
          background-color: #FFFFFF;
          font-size: 12px;
        }

        /* Top Header Layout (ITTSOFT Style) */
        .top-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .header-title-box {
          text-align: right;
        }
        .doc-main-title {
          font-size: 24px;
          font-weight: 900;
          color: #0F172A;
          margin: 0 0 2px 0;
          line-height: 1.1;
        }
        .doc-print-date {
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
        }
        .brand-logo-box {
          text-align: left;
        }
        .brand-company {
          font-size: 26px;
          font-weight: 900;
          color: #0F172A;
          letter-spacing: 1px;
          line-height: 1;
        }
        .brand-tagline {
          font-size: 10px;
          font-weight: 800;
          color: #64748B;
          letter-spacing: 0.5px;
          margin-top: 3px;
        }
        .brand-meta {
          font-size: 10px;
          font-weight: 700;
          color: #475569;
          margin-top: 3px;
        }

        /* Divider Line */
        .header-divider {
          border-bottom: 2.5px solid #0F172A;
          margin: 10px 0 14px 0;
        }

        /* Black Date Range Bar */
        .date-range-bar {
          background: #0F172A;
          color: #FFFFFF;
          text-align: center;
          padding: 7px 12px;
          border-radius: 4px;
          font-weight: 800;
          font-size: 13px;
          margin-bottom: 16px;
          letter-spacing: 0.3px;
        }

        /* Table */
        .table-container {
          border: 1.5px solid #0F172A;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }

        .system-footer {
          margin-top: 30px;
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
      <!-- Top Header -->
      <div class="top-header">
        <div class="header-title-box">
          <h1 class="doc-main-title">${title}</h1>
          <div class="doc-print-date">تاريخ الطباعة: ${currentDateStr}</div>
        </div>

        <div class="brand-logo-box">
          <div class="brand-company">EL-BARADAY</div>
          <div class="brand-tagline">SALES & RESTAURANT POS SYSTEM</div>
          <div class="brand-meta">الفرع: ${branchName} | مرجع: ${reportRefId}</div>
        </div>
      </div>

      <!-- Divider -->
      <div class="header-divider"></div>

      <!-- Black Date Range Bar -->
      <div class="date-range-bar">
        الفترة من ${dateRangeStr || 'اليوم'}
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

      <!-- Footer Line -->
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
