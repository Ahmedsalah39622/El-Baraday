// Thermal Receipt Printing Helper - 100% Bulletproof for 80mm Thermal POS Printers (Xprinter / POS80)
export function printThermalReceipt(orderData) {
  if (!orderData) return;

  const {
    orderNumber = '1',
    dateStr = new Date().toLocaleString('ar-EG', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true
    }),
    branchName = 'الفرع الرئيسي',
    driverName = '',
    cashierName = 'الكاشير',
    customerName = '',
    customerPhone = '',
    customerAddress = '',
    customerFloor = '',
    customerApartment = '',
    items = [],
    subtotal = 0,
    deliveryFee = 0,
    discount = 0,
    total = 0,
    paidAmount = 0,
    notes = '',
    orderNotes = '',
    remainingAmount = 0,
    orderType = 'takeaway',
    isCashCollected = false,
  } = orderData;

  const orderNoteText = notes || orderNotes || '';
  const isDelivery = orderType === 'delivery';
  const cleanPhone = (customerPhone && customerPhone !== 'null' && customerPhone !== 'undefined') ? String(customerPhone).trim() : '';
  const cleanName = (customerName && customerName !== 'null' && customerName !== 'undefined') ? String(customerName).trim() : '';
  const cleanAddress = (customerAddress && customerAddress !== 'null' && customerAddress !== 'undefined') ? String(customerAddress).trim() : '';
  const cleanDriver = (driverName && driverName !== 'null' && driverName !== 'undefined') ? String(driverName).trim() : '';
  
  const floorApartmentText = [
    customerFloor ? `الدور ${customerFloor}` : '',
    customerApartment ? `شقة ${customerApartment}` : ''
  ].filter(Boolean).join(' - ');

  // Format Items Table Rows with strict string sanitization
  const itemsHtml = (items || []).map((item, idx) => {
    let rawName = item.name || item.product_name || item.productName || 'صنف';
    if (typeof rawName === 'object') {
      rawName = rawName.name || rawName.ar || JSON.stringify(rawName);
    }
    let itemName = String(rawName).trim();
    // Clean up dummy placeholder brackets if present
    if (itemName.startsWith('[[') && itemName.endsWith(']]')) {
      itemName = itemName.replace(/^\[+/, '').replace(/\]+$/, '').trim() || 'صنف';
    }

    const itemSize = item.size ? `(حجم ${item.size})` : '';
    const itemNotes = item.notes ? `(${item.notes})` : '';
    const itemPrice = parseFloat(item.price || 0).toFixed(0);
    const itemTotal = (parseFloat(item.price || 0) * (parseInt(item.quantity) || 1)).toFixed(0);

    return `
      <tr style="border-bottom: ${idx < items.length - 1 ? '1px dashed #666' : '1.5px solid #000'};">
        <td style="padding: 4px 2px; font-weight: 800; text-align: right; font-size: 11px; color: #000; word-break: break-word;">
          ${itemName}
          ${itemSize ? `<br><span style="font-size: 10px; font-weight: 700; color: #333;">${itemSize}</span>` : ''}
          ${itemNotes ? `<br><span style="font-size: 10px; font-weight: 700; color: #333;">${itemNotes}</span>` : ''}
        </td>
        <td style="padding: 4px 2px; font-weight: 900; text-align: center; font-size: 13px; color: #000;">${item.quantity}</td>
        <td style="padding: 4px 2px; font-weight: 700; text-align: center; font-size: 11px; color: #000;">${itemPrice}</td>
        <td style="padding: 4px 2px; font-weight: 900; text-align: center; font-size: 12px; color: #000;">${itemTotal}</td>
      </tr>
    `;
  }).join('');

  // 100% Bulletproof HTML Template using 2-Column Tables for Metadata & Totals
  let html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة #${orderNumber}</title>
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
            padding: 0 4mm !important;
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
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        html, body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
          margin: 0 auto;
          padding: 0 4mm;
          width: 100%;
          color: #000000;
          background: #FFFFFF;
          direction: rtl;
        }
        .print-wrapper {
          width: 100% !important;
          margin: 0 auto !important;
          padding: 2mm 0 !important;
          box-sizing: border-box !important;
        }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .dashed-sep { border-bottom: 1.5px dashed #000000; margin: 5px 0; }
        .solid-sep { border-bottom: 2px solid #000000; margin: 6px 0; }
        .double-sep { border-bottom: 3px double #000000; margin: 6px 0; }
        
        .badge {
          border: 1.5px solid #000000;
          background: #F3F4F6;
          color: #000000;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          font-weight: 900;
          font-size: 11px;
          margin-top: 3px;
        }
        
        /* Table Layout for Metadata & Totals to prevent side clipping */
        table.meta-table, table.totals-table, table.items-table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 3px 0 !important;
          table-layout: fixed !important;
        }
        table.items-table {
          border: 1.5px solid #000000 !important;
        }
        table.items-table th {
          background: #E5E7EB;
          color: #000000;
          padding: 4px 2px;
          font-size: 11px;
          font-weight: 900;
          border-bottom: 1.5px solid #000000;
          text-align: center;
        }
        
        .total-box {
          border: 2px solid #000000;
          padding: 4px 6px;
          border-radius: 6px;
          margin-top: 5px;
          font-weight: 900;
          font-size: 13px;
          background: #F9FAFB;
        }
        .cash-box {
          background: #000000;
          color: #FFFFFF;
          padding: 4px 6px;
          border-radius: 6px;
          margin-top: 4px;
          font-weight: 900;
          font-size: 12px;
        }
        .page-break {
          page-break-before: always !important;
          break-before: page !important;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <!-- Main Receipt Body -->
      <div class="print-wrapper">
        <div class="center">
          <h1 style="margin: 0; font-size: 36px; font-weight: 900; line-height: 1; color: #000000;">#${orderNumber}</h1>
          <h2 style="margin: 3px 0 0 0; font-size: 14px; font-weight: 900; color: #000000;">مطعم البرادعي للحواوشي واللحوم</h2>
          <div style="font-size: 10px; font-weight: 700; color: #333; margin-top: 1px;">فرع: ${branchName}</div>
          <div class="badge">
            ${isDelivery ? '🛵 دليفري (توصيل للمنزل)' : (orderType === 'takeaway' ? '🥡 تيك أوي (Takeaway)' : '🍽️ صالة / طاولات')}
          </div>
        </div>

        <div class="solid-sep"></div>

        <!-- Meta Details Table (Strict 2 Columns to eliminate right/left clipping) -->
        <table class="meta-table">
          <tr>
            <td style="text-align: right; font-weight: 700; font-size: 11px; width: 35%;">الكاشير:</td>
            <td style="text-align: left; font-weight: 900; font-size: 11px; width: 65%;">${cashierName}</td>
          </tr>
          <tr>
            <td style="text-align: right; font-weight: 700; font-size: 11px; width: 35%;">التاريخ والوقت:</td>
            <td style="text-align: left; font-weight: 900; font-size: 10px; width: 65%;">${dateStr}</td>
          </tr>
          ${isDelivery ? `
            ${cleanDriver ? `
              <tr>
                <td style="text-align: right; font-weight: 700; font-size: 11px;">الطيار المسؤول:</td>
                <td style="text-align: left; font-weight: 900; font-size: 12px;">🚴 ${cleanDriver}</td>
              </tr>
            ` : ''}
            ${cleanName ? `
              <tr>
                <td style="text-align: right; font-weight: 700; font-size: 11px;">اسم العميل:</td>
                <td style="text-align: left; font-weight: 900; font-size: 11px;">${cleanName}</td>
              </tr>
            ` : ''}
            ${cleanPhone ? `
              <tr>
                <td style="text-align: right; font-weight: 700; font-size: 11px;">رقم الهاتف:</td>
                <td style="text-align: left; font-weight: 900; font-size: 12px;">📞 ${cleanPhone}</td>
              </tr>
            ` : ''}
            ${cleanAddress ? `
              <tr>
                <td style="text-align: right; font-weight: 700; font-size: 11px;">العنوان:</td>
                <td style="text-align: left; font-weight: 900; font-size: 11px;">📍 ${cleanAddress}</td>
              </tr>
            ` : ''}
            ${floorApartmentText ? `
              <tr>
                <td style="text-align: right; font-weight: 700; font-size: 11px;">الدور / الشقة:</td>
                <td style="text-align: left; font-weight: 900; font-size: 11px;">🏠 ${floorApartmentText}</td>
              </tr>
            ` : ''}
          ` : ''}
        </table>

        ${orderNoteText ? `
          <div class="dashed-sep"></div>
          <div style="background: #F3F4F6; padding: 4px 6px; border-radius: 4px; border: 1px solid #000000; margin: 3px 0; font-size: 10px;">
            <span style="font-weight: 900;">📝 ملاحظات الطلب:</span>
            <span class="bold"> ${orderNoteText}</span>
          </div>
        ` : ''}

        <div class="solid-sep"></div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="text-align: right; width: 45%;">المنتج</th>
              <th style="width: 15%;">الكمية</th>
              <th style="width: 20%;">السعر</th>
              <th style="width: 20%;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="dashed-sep"></div>

        <!-- Totals Table -->
        <table class="totals-table">
          <tr>
            <td style="text-align: right; font-weight: 700; font-size: 11px; width: 50%;">المجموع الفرعي:</td>
            <td style="text-align: left; font-weight: 900; font-size: 11px; width: 50%;">${parseFloat(subtotal).toFixed(2)} ج.م</td>
          </tr>
          ${isDelivery && parseFloat(deliveryFee) > 0 ? `
            <tr>
              <td style="text-align: right; font-weight: 800; font-size: 11px;">🛵 خدمة التوصيل:</td>
              <td style="text-align: left; font-weight: 900; font-size: 11px;">+${parseFloat(deliveryFee).toFixed(2)} ج.م</td>
            </tr>
          ` : ''}
          ${parseFloat(discount) > 0 ? `
            <tr>
              <td style="text-align: right; font-weight: 800; font-size: 11px;">🎁 الخصم:</td>
              <td style="text-align: left; font-weight: 900; font-size: 11px;">-${parseFloat(discount).toFixed(2)} ج.م</td>
            </tr>
          ` : ''}
        </table>
        
        <div class="total-box">
          <table style="width: 100%; border: none;">
            <tr>
              <td style="text-align: right; font-weight: 900; font-size: 12px; width: 60%;">الصافي / الإجمالي النهائي:</td>
              <td style="text-align: left; font-weight: 900; font-size: 15px; width: 40%; color: #000000;">${parseFloat(total).toFixed(2)} ج.م</td>
            </tr>
          </table>
        </div>

        <table class="totals-table" style="margin-top: 4px;">
          <tr>
            <td style="text-align: right; font-weight: 700; font-size: 11px; width: 50%;">المبلغ المدفوع:</td>
            <td style="text-align: left; font-weight: 900; font-size: 11px; width: 50%;">${parseFloat(paidAmount || total).toFixed(2)} ج.م</td>
          </tr>
        </table>

        <!-- Remaining Change Box -->
        <div class="cash-box">
          <table style="width: 100%; border: none;">
            <tr>
              <td style="text-align: right; font-weight: 900; font-size: 11px; color: #FFF; width: 60%;">المتبقي للعميل (الباقي):</td>
              <td style="text-align: left; font-weight: 900; font-size: 14px; color: #FFF; width: 40%;">${parseFloat(remainingAmount).toFixed(2)} ج.م</td>
            </tr>
          </table>
        </div>

        <!-- Cash Collection Status Indicator -->
        <div style="margin-top: 6px; text-align: center; padding: 3px; border: 1.5px solid #000; border-radius: 4px; font-weight: 900; font-size: 10px; background: ${isCashCollected ? '#E5E7EB' : '#FFFFFF'};">
          ${isCashCollected ? '🟢 تم استلام النقدية وتوريد المبلغ بالشيفت' : '🔴 عهدة دليفري مع الطيار (لم تُورد بعد)'}
        </div>

        <div class="double-sep"></div>
        <div class="center" style="font-size: 10px; font-weight: 800; color: #000000;">
          شكراً لزيارتكم مطعم البرادعي! ❤️<br>
          نتمنى لكم وجبة شهية ولذيذة 🍔🥩
        </div>
      </div>

      <!-- Kitchen / Driver Slip for Delivery Orders -->
      ${isDelivery ? `
        <div class="page-break"></div>
        <div class="print-wrapper">
          <div class="center">
            <h1 style="margin: 0; font-size: 42px; font-weight: 900; line-height: 1; color: #000000;">#${orderNumber}</h1>
            <div class="badge" style="font-size: 12px; padding: 3px 10px;">🛵 بون المطبخ والدليفري</div>
            ${cleanDriver ? `<h3 style="margin: 4px 0 0 0; font-size: 12px; font-weight: 900; color: #000000;">الطيار: ${cleanDriver}</h3>` : ''}
            ${cleanName ? `<h3 style="margin: 2px 0 0 0; font-size: 11px; font-weight: 800; color: #000000;">العميل: ${cleanName} ${cleanPhone ? `(${cleanPhone})` : ''}</h3>` : ''}
            ${cleanAddress ? `<h3 style="margin: 2px 0 0 0; font-size: 11px; font-weight: 800; color: #000000;">الوجهة: ${cleanAddress} ${floorApartmentText ? `(${floorApartmentText})` : ''}</h3>` : ''}
          </div>

          <div class="solid-sep"></div>

          <div style="border: 1.5px solid #000000; border-radius: 6px; padding: 4px; margin: 4px 0;">
            ${(items || []).map((item, idx) => {
              let rawN = item.name || item.product_name || item.productName || 'صنف';
              if (typeof rawN === 'object') rawN = rawN.name || rawN.ar || JSON.stringify(rawN);
              let iName = String(rawN).trim().replace(/^\[+/, '').replace(/\]+$/, '').trim() || 'صنف';

              return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: ${idx < items.length - 1 ? '1px dashed #000' : 'none'};">
                  <span style="font-weight: 900; font-size: 12px; color: #000000;">
                    ${iName} ${item.size ? `(${item.size})` : ''} ${item.notes ? `(${item.notes})` : ''}
                  </span>
                  <span style="font-weight: 900; font-size: 15px; color: #000000; border: 1.5px solid #000; padding: 1px 6px; border-radius: 4px; background: #E5E7EB;">
                    x${item.quantity}
                  </span>
                </div>
              `;
            }).join('')}
          </div>

          ${orderNoteText ? `
            <div style="margin-top: 4px; font-weight: 900; font-size: 10px; color: #000000; background: #E5E7EB; padding: 4px; border-radius: 4px; border: 1px solid #000000; text-align: center;">
              ملاحظات: ${orderNoteText}
            </div>
          ` : ''}

          <div class="dashed-sep"></div>
          <div class="center" style="font-size: 10px; font-weight: 800; color: #000000;">${dateStr}</div>
        </div>
      ` : ''}
    </body>
    </html>
  `;

  // Hidden iframe trigger for 100% reliable printing
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
      } catch (e) { }
    }, 2000);
  }, 250);
}
