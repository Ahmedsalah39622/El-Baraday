// Utility to print beautifully styled A4 PDF Reports
export function generateReportPDF({
  title = 'تقرير مطعم البرادعي',
  subtitle = '',
  branchName = 'كافة الفروع',
  dateRangeStr = '',
  stats = [],
  columns = [],
  data = [],
}) {
  if (!data) return;

  const tableHeaderHtml = columns
    .map(c => `<th style="padding: 8px 10px; border: 1px solid #CBD5E1; background-color: #F1F5F9; color: #0F172A; font-weight: 800; font-size: 13px; text-align: center;">${c.label}</th>`)
    .join('');

  const tableRowsHtml = data.map((row, idx) => {
    const cells = columns.map(c => {
      let val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      if (val === undefined || val === null) val = '';
      return `<td style="padding: 8px 10px; border: 1px solid #E2E8F0; font-size: 12px; font-weight: 700; color: #1E293B; text-align: center;">${val}</td>`;
    }).join('');
    return `<tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">${cells}</tr>`;
  }).join('');

  const statsHtml = stats.length > 0 ? `
    <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
      ${stats.map(s => `
        <div style="flex: 1; min-width: 160px; background: #FFFDF5; border: 1.5px solid #FDE68A; border-radius: 10px; padding: 10px 14px;">
          <div style="font-size: 12px; font-weight: 700; color: #92400E; margin-bottom: 4px;">${s.title}</div>
          <div style="font-size: 18px; font-weight: 900; color: #78350F;">${s.value}</div>
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
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: #FFF;
          }
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', 'Cairo', Tahoma, Arial, sans-serif;
          color: #0F172A;
          direction: rtl;
          margin: 0;
          padding: 20px;
          background-color: #FFFFFF;
        }
        .header-card {
          border: 2px solid #1E293B;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #F8FAFC;
        }
        .restaurant-title {
          font-size: 24px;
          font-weight: 900;
          color: #1E293B;
          margin: 0 0 4px 0;
        }
        .report-title {
          font-size: 18px;
          font-weight: 800;
          color: #4285F4;
          margin: 0;
        }
        .meta-badge {
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          color: #1E40AF;
          font-size: 12px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 8px;
          display: inline-block;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .footer-signature {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          padding: 0 20px;
          font-size: 13px;
          font-weight: 800;
          color: #475569;
        }
      </style>
    </head>
    <body>
      <div class="header-card">
        <div>
          <h1 class="restaurant-title">🍔 مطعم البرادعي للحواوشي</h1>
          <h2 class="report-title">${title}</h2>
          ${subtitle ? `<div style="font-size: 13px; color: #64748B; margin-top: 4px;">${subtitle}</div>` : ''}
        </div>
        <div style="text-align: left;">
          <div class="meta-badge" style="margin-bottom: 6px;">🏢 الفرع: ${branchName}</div>
          <div style="font-size: 12px; color: #475569; font-weight: 700;">📅 الفترة: ${dateRangeStr || 'اليوم'}</div>
          <div style="font-size: 11px; color: #94A3B8; margin-top: 4px;">تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</div>
        </div>
      </div>

      ${statsHtml}

      <table>
        <thead>
          <tr>${tableHeaderHtml}</tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <div class="footer-signature">
        <div>توقيع المسؤول / الكاشير: ........................</div>
        <div>توقيع مدير الفرع: ........................</div>
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
  }, 300);
}
