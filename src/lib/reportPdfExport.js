// Thermal 80mm & A4 Report Generator for POSPRINTER 80MM
export function generateReportPDF({
  title = 'تقرير إداري',
  subtitle = '',
  branchName = 'كافة الفروع',
  dateRangeStr = '',
  stats = [],
  columns = [],
  data = [],
  totals = null,
  pageSize = '80mm', // Default to 80mm POS Thermal Printer Format
  layoutMode = 'auto', // 'auto', 'vertical', or 'table'
}) {
  if (!data) return;

  const reportRefId = `REP-${Math.floor(100000 + Math.random() * 900000)}`;
  const currentDateStr = new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

  let html = '';

  if (pageSize === '80mm') {
    // Determine whether to use a vertical card layout or a standard horizontal table
    const actualLayoutMode = layoutMode === 'vertical' || (layoutMode === 'auto' && columns.length > 4) ? 'vertical' : 'table';

    // 🧾 80mm POS Thermal Printer Bulletproof Format
    const tableHeaderHtml = columns
      .map(c => `<th style="padding: 4px 2px; border: 1px solid #000; background-color: #E2E8F0; color: #000; font-weight: 900; font-size: 9.5px; text-align: center; word-break: break-word;">${c.label}</th>`)
      .join('');

    const tableRowsHtml = data.map((row, idx) => {
      const cells = columns.map(c => {
        let val = typeof c.accessor === 'function' ? c.accessor(row, idx) : row[c.accessor];
        if (val === undefined || val === null) val = '';
        const cleanVal = String(val).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
        return `<td style="padding: 4px 2px; border: 1px solid #000; font-size: 9.5px; font-weight: 700; color: #000; text-align: center; word-break: break-word;">${cleanVal}</td>`;
      }).join('');
      return `<tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">${cells}</tr>`;
    }).join('');

    let totalsRowHtml = '';
    if (totals && typeof totals === 'object') {
      const totalCells = columns.map((c, colIdx) => {
        const key = c.key || (typeof c.accessor === 'string' ? c.accessor : null);
        let val = key ? totals[key] : (totals[colIdx] !== undefined ? totals[colIdx] : undefined);
        if (val === undefined && (colIdx === 1 || colIdx === columns.length - 2)) {
          val = 'الإجمالي';
        }
        const cleanVal = val !== undefined ? String(val).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim() : '';
        return `<td style="padding: 5px 2px; border: 1px solid #000; background-color: #000; font-weight: 900; font-size: 10px; color: #FFF; text-align: center;">${cleanVal}</td>`;
      }).join('');
      totalsRowHtml = `<tfoot><tr style="background-color: #000; color: #FFF;">${totalCells}</tr></tfoot>`;
    }

    let mainContentHtml = '';
    if (actualLayoutMode === 'vertical') {
      const cardsHtml = data.map((row, idx) => {
        const rowFields = columns.map(c => {
          let val = typeof c.accessor === 'function' ? c.accessor(row, idx) : row[c.accessor];
          if (val === undefined || val === null) val = '';
          const cleanVal = String(val).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
          return { label: c.label, val: cleanVal };
        });

        const indexVal = rowFields[0] ? rowFields[0].val : `${idx + 1}`;
        const mainTitleLabel = rowFields[1] ? rowFields[1].label : '';
        const mainTitleVal = rowFields[1] ? rowFields[1].val : '';
        const detailFields = rowFields.slice(2);

        return `
          <div style="border: 1px solid #000; border-radius: 4px; padding: 6px; margin-bottom: 6px; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 5px;">
              <span style="font-size: 11px; font-weight: 900; color: #000;">
                ${mainTitleLabel ? `${mainTitleLabel}: ${mainTitleVal}` : mainTitleVal}
              </span>
              <span style="background-color: #000; color: #FFF; font-size: 9px; font-weight: 900; padding: 1px 5px; border-radius: 2px;">
                # ${indexVal}
              </span>
            </div>
            <table style="width: 100%; border-collapse: collapse; border: none; margin: 0;">
              <tbody>
                ${detailFields.map(field => `
                  <tr style="border-bottom: 1px dashed #E2E8F0;">
                    <td style="padding: 3px 2px; font-size: 9.5px; font-weight: 800; color: #4A5568; text-align: right; width: 45%; vertical-align: top;">${field.label}:</td>
                    <td style="padding: 3px 2px; font-size: 9.5px; font-weight: 800; color: #000; text-align: left; width: 55%; vertical-align: top; word-break: break-word;">${field.val}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('');

      let totalsBlockHtml = '';
      if (totals && typeof totals === 'object') {
        const totalsList = columns.map((c, colIdx) => {
          const key = c.key || (typeof c.accessor === 'string' ? c.accessor : null);
          let val = key ? totals[key] : (totals[colIdx] !== undefined ? totals[colIdx] : undefined);
          const cleanVal = val !== undefined ? String(val).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim() : '';
          
          if (cleanVal && colIdx !== 0 && cleanVal !== 'إجمالي الكشف' && cleanVal !== 'الإجمالي') {
            return { label: c.label, val: cleanVal };
          }
          return null;
        }).filter(Boolean);

        totalsBlockHtml = `
          <div style="background-color: #000; color: #FFF; border-radius: 4px; padding: 6px 8px; margin-top: 8px; margin-bottom: 4px; page-break-inside: avoid;">
            <div style="font-weight: 900; font-size: 11px; border-bottom: 1px dashed #FFF; padding-bottom: 4px; margin-bottom: 4px; text-align: center; color: #FFF;">إجمالي الكشف</div>
            <table style="width: 100%; border-collapse: collapse; border: none; margin: 0;">
              <tbody>
                ${totalsList.map(t => `
                  <tr>
                    <td style="padding: 3px 2px; font-size: 10px; color: #CCC; text-align: right; width: 45%; font-weight: 800;">${t.label}:</td>
                    <td style="padding: 3px 2px; font-size: 10px; color: #FFF; text-align: left; width: 55%; font-weight: 900;">${t.val}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      mainContentHtml = `
        <div class="vertical-cards-container" style="margin-top: 4px;">
          ${cardsHtml}
          ${totalsBlockHtml}
        </div>
      `;
    } else {
      mainContentHtml = `
        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
          ${totalsRowHtml}
        </table>
      `;
    }

    const statsHtml = stats.length > 0 ? `
      <div style="display: grid; grid-template-columns: repeat(${Math.min(stats.length, 2)}, 1fr); gap: 4px; margin-bottom: 8px;">
        ${stats.map(s => `
          <div style="background: #FFFFFF; border: 1px solid #000; border-radius: 3px; padding: 4px 5px; text-align: center;">
            <div style="font-size: 9.5px; font-weight: 800; color: #333;">${s.title}</div>
            <div style="font-size: 11.5px; font-weight: 900; color: #000;">${String(s.value).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')}</div>
          </div>
        `).join('')}
      </div>
    ` : '';

    html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&display=swap');
          @page {
            size: 80mm auto;
            margin: 0mm !important;
          }
          @media print {
            @page {
              size: 80mm auto;
              margin: 0mm !important;
            }
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 1.5mm !important;
              background: #FFF !important;
              color: #000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          * {
            box-sizing: border-box !important;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
            color: #000000;
            direction: rtl;
            padding: 1.5mm;
            width: 100%;
            background-color: #FFFFFF;
            font-size: 10px;
          }
          .thermal-header {
            text-align: center;
            margin-bottom: 6px;
          }
          .brand-name {
            font-size: 16px;
            font-weight: 900;
            color: #000;
          }
          .brand-sub {
            font-size: 9.5px;
            font-weight: 800;
            color: #333;
          }
          .report-title {
            font-size: 13.5px;
            font-weight: 900;
            color: #000;
            margin: 4px 0 2px 0;
          }
          .meta-info {
            font-size: 9.5px;
            font-weight: 700;
            color: #222;
          }
          .double-sep {
            border-bottom: 2px double #000;
            margin: 4px 0;
          }
          .dashed-sep {
            border-bottom: 1px dashed #000;
            margin: 4px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
            margin-bottom: 6px;
          }
          .thermal-footer {
            margin-top: 8px;
            text-align: center;
            font-size: 9px;
            font-weight: 800;
            color: #000;
            border-top: 1px dashed #000;
            padding-top: 4px;
            padding-bottom: 15mm;
          }
        </style>
      </head>
      <body>
        <div class="thermal-header">
          <div class="brand-name">مطعم البرادعي</div>
          <div class="brand-sub">EL-BARADAY POS SYSTEM</div>
          <div class="double-sep"></div>
          <div class="report-title">${title}</div>
          ${subtitle ? `<div class="meta-info" style="font-weight: 800;">${subtitle}</div>` : ''}
          <div class="meta-info">الفرع: ${branchName} | مرجع: ${reportRefId}</div>
          <div class="meta-info">تاريخ الطباعة: ${currentDateStr}</div>
          ${dateRangeStr ? `<div style="font-size: 9.5px; font-weight: 800; background: #000; color: #FFF; padding: 2px 5px; border-radius: 3px; margin-top: 3px; display: inline-block;">الفترة: ${dateRangeStr}</div>` : ''}
          <div class="dashed-sep"></div>
        </div>

        ${statsHtml}

        ${mainContentHtml}

        <div class="thermal-footer">
          <div>نظام إدارة المبيعات ونقاط البيع - مطعم البرادعي</div>
          <div>*** تقرير حراري 80MM رسمـي ***</div>
        </div>
      </body>
      </html>
    `;
  } else {
    // A4 Format Fallback
    const tableHeaderHtml = columns
      .map(c => `<th style="padding: 9px 10px; border: 1px solid #0F172A; background-color: #0F172A; color: #FFFFFF; font-weight: 800; font-size: 12px; text-align: center;">${c.label}</th>`)
      .join('');

    const tableRowsHtml = data.map((row, idx) => {
      const cells = columns.map(c => {
        let val = typeof c.accessor === 'function' ? c.accessor(row, idx) : row[c.accessor];
        if (val === undefined || val === null) val = '';
        const cleanVal = String(val).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
        return `<td style="padding: 8px 10px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 700; color: #0F172A; text-align: center;">${cleanVal}</td>`;
      }).join('');
      return `<tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">${cells}</tr>`;
    }).join('');

    let totalsRowHtml = '';
    if (totals && typeof totals === 'object') {
      const totalCells = columns.map((c, colIdx) => {
        const key = c.key || (typeof c.accessor === 'string' ? c.accessor : null);
        let val = key ? totals[key] : (totals[colIdx] !== undefined ? totals[colIdx] : undefined);
        if (val === undefined && (colIdx === 1 || colIdx === columns.length - 2)) {
          val = 'الإجمالي';
        }
        const cleanVal = val !== undefined ? String(val).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim() : '';
        return `<td style="padding: 10px 8px; border: 1px solid #1E293B; background-color: #000000; font-weight: 900; font-size: 13px; color: #FFFFFF; text-align: center;">${cleanVal}</td>`;
      }).join('');
      totalsRowHtml = `<tfoot><tr style="background-color: #000000; color: #FFFFFF;">${totalCells}</tr></tfoot>`;
    }

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

    html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          @page { size: A4 portrait; margin: 0mm; }
          @media print {
            @page { margin: 0mm; }
            html, body { margin: 0 !important; padding: 10mm 12mm !important; background: #FFFFFF !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Cairo', Arial, sans-serif; color: #0F172A; direction: rtl; padding: 10mm 12mm; background-color: #FFFFFF; font-size: 12px; }
          .top-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
          .header-title-box { text-align: right; }
          .doc-main-title { font-size: 24px; font-weight: 900; color: #0F172A; margin: 0 0 2px 0; line-height: 1.1; }
          .doc-print-date { font-size: 11px; font-weight: 700; color: #64748B; }
          .brand-logo-box { text-align: left; }
          .brand-company { font-size: 26px; font-weight: 900; color: #0F172A; letter-spacing: 1px; line-height: 1; }
          .brand-tagline { font-size: 10px; font-weight: 800; color: #64748B; letter-spacing: 0.5px; margin-top: 3px; }
          .brand-meta { font-size: 10px; font-weight: 700; color: #475569; margin-top: 3px; }
          .header-divider { border-bottom: 2.5px solid #0F172A; margin: 10px 0 14px 0; }
          .date-range-bar { background: #0F172A; color: #FFFFFF; text-align: center; padding: 7px 12px; border-radius: 4px; font-weight: 800; font-size: 13px; margin-bottom: 16px; letter-spacing: 0.3px; }
          .table-container { border: 1.5px solid #0F172A; border-radius: 4px; overflow: hidden; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          .system-footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748B; font-weight: 800; border-top: 1px solid #E2E8F0; padding-top: 8px; }
        </style>
      </head>
      <body>
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
        <div class="header-divider"></div>
        <div class="date-range-bar">الفترة من ${dateRangeStr || 'اليوم'}</div>
        ${statsHtml}
        <div class="table-container">
          <table>
            <thead><tr>${tableHeaderHtml}</tr></thead>
            <tbody>${tableRowsHtml}</tbody>
            ${totalsRowHtml}
          </table>
        </div>
        <div class="system-footer">
          <div>نظام إدارة المبيعات ونقاط البيع - مطعم البرادعي</div>
          <div>تقرير إداري رسمـي</div>
        </div>
      </body>
      </html>
    `;
  }

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
