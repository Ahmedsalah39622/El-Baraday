// Thermal Receipt Printing Helper - 100% Optimized for 80mm Thermal POS Printers (Xprinter POS80 / XP-D200N)
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

  // Format Items Table Rows with clear responsive font scaling
  const itemsHtml = items.map((item, idx) => `
    <tr style="border-bottom: ${idx < items.length - 1 ? '1px dashed #444' : '1.5px solid #000'};">
      <td style="padding: 4px 1px; font-weight: 800; text-align: right; font-size: 12px; color: #000; word-break: break-word;">
        ${item.name || item.product_name || 'صنف'}
        ${item.size ? `<br><span style="font-size: 10px; font-weight: 700; color: #222;">📏 (حجم ${item.size})</span>` : ''}
        ${item.notes ? `<br><span style="font-size: 10px; font-weight: 700; color: #000;">📝 [${item.notes}]</span>` : ''}
      </td>
      <td style="padding: 4px 1px; font-weight: 900; text-align: center; font-size: 14px; color: #000;">${item.quantity}</td>
      <td style="padding: 4px 1px; font-weight: 700; text-align: center; font-size: 11px; color: #000;">${parseFloat(item.price).toFixed(0)}</td>
      <td style="padding: 4px 1px; font-weight: 900; text-align: center; font-size: 13px; color: #000;">${(parseFloat(item.price) * item.quantity).toFixed(0)}</td>
    </tr>
  `).join('');

  // HTML Template for 80mm Thermal Printer
  let html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة #${orderNumber}</title>
      <style>
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
            width: 78mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #FFF !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        html, body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
          margin: 0 auto;
          padding: 1mm 2mm;
          width: 78mm;
          max-width: 78mm;
          color: #000000;
          background: #FFFFFF;
          direction: rtl;
        }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .dashed-sep { border-bottom: 1.5px dashed #000000; margin: 5px 0; }
        .solid-sep { border-bottom: 2px solid #000000; margin: 6px 0; }
        .double-sep { border-bottom: 3px double #000000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; align-items: center; margin: 2px 0; font-size: 12px; color: #000000; }
        .badge {
          border: 1.5px solid #000000;
          background: #F3F4F6;
          color: #000000;
          padding: 2px 8px;
          border-radius: 4px;
          display: inline-block;
          font-weight: 900;
          font-size: 12px;
          margin-top: 3px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 5px 0;
          border: 1.5px solid #000000;
        }
        th {
          background: #E5E7EB;
          color: #000000;
          padding: 4px 1px;
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
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #F9FAFB;
        }
        .cash-box {
          background: #000000;
          color: #FFFFFF;
          padding: 4px 6px;
          border-radius: 6px;
          margin-top: 4px;
          font-weight: 900;
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
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
      <div class="center">
        <h1 style="margin: 0; font-size: 42px; font-weight: 900; line-height: 1; color: #000000;">#${orderNumber}</h1>
        <h2 style="margin: 2px 0 0 0; font-size: 15px; font-weight: 900; color: #000000;">مطعم البرادعي للحواوشي واللحوم</h2>
        <div style="font-size: 10px; font-weight: 700; color: #222; margin-top: 1px;">فرع: ${branchName}</div>
        <div class="badge">
          ${isDelivery ? '🛵 دليفري (توصيل للمنزل)' : (orderType === 'takeaway' ? '🥡 تيك أوي (Takeaway)' : '🍽️ صالة / طاولات')}
        </div>
      </div>

      <div class="solid-sep"></div>

      <!-- Meta Details -->
      <div class="row"><span style="font-weight: 700;">الكاشير:</span><span class="bold">${cashierName}</span></div>
      <div class="row"><span style="color: #222;">التاريخ والوقت:</span><span class="bold" style="font-size: 11px;">${dateStr}</span></div>

      ${isDelivery ? `
        <div class="dashed-sep"></div>
        ${cleanDriver ? `<div class="row"><span style="font-weight: 700;">الطيار المسؤول:</span><span class="bold" style="font-size: 13px;">🚴 ${cleanDriver}</span></div>` : ''}
        ${cleanName ? `<div class="row"><span style="font-weight: 700;">اسم العميل:</span><span class="bold">${cleanName}</span></div>` : ''}
        ${cleanPhone ? `<div class="row"><span style="font-weight: 700;">رقم الهاتف:</span><span class="bold" style="font-size: 13px;">📞 ${cleanPhone}</span></div>` : ''}
        ${cleanAddress ? `<div class="row"><span style="font-weight: 700;">العنوان:</span><span class="bold" style="font-size: 12px;">📍 ${cleanAddress}</span></div>` : ''}
        ${floorApartmentText ? `<div class="row"><span style="font-weight: 700;">الدور / الشقة:</span><span class="bold">🏠 ${floorApartmentText}</span></div>` : ''}
      ` : ''}

      ${orderNoteText ? `
        <div class="dashed-sep"></div>
        <div style="background: #F3F4F6; padding: 4px 6px; border-radius: 4px; border: 1px solid #000000; margin: 3px 0; font-size: 11px;">
          <span style="font-weight: 900;">📝 ملاحظات الطلب:</span>
          <span class="bold"> ${orderNoteText}</span>
        </div>
      ` : ''}

      <div class="solid-sep"></div>

      <!-- Items Table -->
      <table>
        <thead>
          <tr>
            <th style="text-align: right; width: 48%;">المنتج</th>
            <th style="width: 14%;">الكمية</th>
            <th style="width: 19%;">السعر</th>
            <th style="width: 19%;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="dashed-sep"></div>

      <!-- Financial Totals -->
      <div class="row"><span style="color: #222;">المجموع الفرعي:</span><span class="bold">${parseFloat(subtotal).toFixed(2)} ج.م</span></div>
      ${isDelivery && parseFloat(deliveryFee) > 0 ? `<div class="row"><span style="font-weight: 800;">🛵 خدمة التوصيل:</span><span class="bold">+${parseFloat(deliveryFee).toFixed(2)} ج.م</span></div>` : ''}
      ${parseFloat(discount) > 0 ? `<div class="row"><span style="font-weight: 800;">🎁 الخصم:</span><span class="bold">-${parseFloat(discount).toFixed(2)} ج.م</span></div>` : ''}
      
      <div class="total-box">
        <span>الصافي / الإجمالي النهائي:</span>
        <span style="font-size: 16px; color: #000000;">${parseFloat(total).toFixed(2)} ج.م</span>
      </div>

      <div class="row" style="margin-top: 4px;"><span style="font-weight: 700;">المبلغ المدفوع:</span><span class="bold">${parseFloat(paidAmount || total).toFixed(2)} ج.م</span></div>

      <!-- Remaining Change -->
      <div class="cash-box">
        <span>المتبقي للعميل (الباقي):</span>
        <span style="font-size: 15px;">${parseFloat(remainingAmount).toFixed(2)} ج.م</span>
      </div>

      <!-- Cash Collection Status Indicator -->
      <div style="margin-top: 6px; text-align: center; padding: 3px; border: 1.5px solid #000; border-radius: 4px; font-weight: 900; font-size: 11px; background: ${isCashCollected ? '#E5E7EB' : '#FFFFFF'};">
        ${isCashCollected ? '🟢 تم استلام النقدية وتوريد المبلغ بالشيفت' : '🔴 عهدة دليفري مع الطيار (لم تُورد بعد)'}
      </div>

      <div class="double-sep"></div>
      <div class="center" style="font-size: 11px; font-weight: 800; color: #000000;">
        شكراً لزيارتكم مطعم البرادعي! ❤️<br>
        نتمنى لكم وجبة شهية ولذيذة 🍔🥩
      </div>
  `;

  // Kitchen / Driver Slip for Delivery Orders
  if (isDelivery) {
    const kitchenItemsHtml = items.map((item, idx) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: ${idx < items.length - 1 ? '1px dashed #000' : 'none'};">
        <span style="font-weight: 900; font-size: 14px; color: #000000;">
          ${item.name || item.product_name} ${item.size ? `(${item.size})` : ''} ${item.notes ? `[${item.notes}]` : ''}
        </span>
        <span style="font-weight: 900; font-size: 17px; color: #000000; border: 1.5px solid #000; padding: 1px 6px; border-radius: 4px; background: #E5E7EB;">
          x${item.quantity}
        </span>
      </div>
    `).join('');

    html += `
      <div class="page-break"></div>
      <div class="center">
        <h1 style="margin: 0; font-size: 48px; font-weight: 900; line-height: 1; color: #000000;">#${orderNumber}</h1>
        <div class="badge" style="font-size: 14px; padding: 3px 10px;">🛵 بون المطبخ والدليفري</div>
        ${cleanDriver ? `<h3 style="margin: 4px 0 0 0; font-size: 14px; font-weight: 900; color: #000000;">الطيار: ${cleanDriver}</h3>` : ''}
        ${cleanName ? `<h3 style="margin: 2px 0 0 0; font-size: 13px; font-weight: 800; color: #000000;">العميل: ${cleanName} ${cleanPhone ? `(${cleanPhone})` : ''}</h3>` : ''}
        ${cleanAddress ? `<h3 style="margin: 2px 0 0 0; font-size: 12px; font-weight: 800; color: #000000;">الوجهة: ${cleanAddress} ${floorApartmentText ? `(${floorApartmentText})` : ''}</h3>` : ''}
      </div>

      <div class="solid-sep"></div>

      <div style="border: 1.5px solid #000000; border-radius: 6px; padding: 4px; margin: 4px 0;">
        ${kitchenItemsHtml}
      </div>

      ${orderNoteText ? `
        <div style="margin-top: 4px; font-weight: 900; font-size: 12px; color: #000000; background: #E5E7EB; padding: 4px; border-radius: 4px; border: 1px solid #000000; text-align: center;">
          ملاحظات: ${orderNoteText}
        </div>
      ` : ''}

      <div class="dashed-sep"></div>
      <div class="center" style="font-size: 10px; font-weight: 800; color: #000000;">${dateStr}</div>
    `;
  }

  html += `
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
