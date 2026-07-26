// Thermal Receipt Printing Helper Optimized Specifically for Xprinter XP-D200N (80mm Thermal Printer)
export function printThermalReceipt(orderData) {
  if (!orderData) return;

  const {
    orderNumber = '1',
    dateStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    branchName = 'الفرع الرئيسي',
    driverName = '',
    cashierName = 'كاشير',
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
  const floorApartmentText = [
    customerFloor ? `الدور ${customerFloor}` : '',
    customerApartment ? `شقة ${customerApartment}` : ''
  ].filter(Boolean).join(' - ');

  // Format Items Table Rows for Xprinter 80mm (Printable 72mm)
  const itemsHtml = items.map((item, idx) => `
    <tr style="border-bottom: ${idx < items.length - 1 ? '1px dashed #777' : '1.5px solid #000'};">
      <td style="padding: 6px 2px; font-weight: 800; text-align: right; font-size: 13px; color: #000; word-break: break-word;">
        ${item.name || item.product_name}
        ${item.size ? `<br><span style="font-size: 11px; font-weight: 700; color: #333;">📏 (حجم ${item.size})</span>` : ''}
        ${item.notes ? `<br><span style="font-size: 11px; font-weight: 700; color: #D97706;">📝 [${item.notes}]</span>` : ''}
      </td>
      <td style="padding: 6px 2px; font-weight: 900; text-align: center; font-size: 15px; color: #000;">${item.quantity}</td>
      <td style="padding: 6px 2px; font-weight: 700; text-align: center; font-size: 12px; color: #000;">${parseFloat(item.price).toFixed(0)}</td>
      <td style="padding: 6px 2px; font-weight: 900; text-align: center; font-size: 14px; color: #000;">${(parseFloat(item.price) * item.quantity).toFixed(0)}</td>
    </tr>
  `).join('');

  // Complete Thermal Receipt Document for Xprinter XP-D200N (80mm)
  let html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة #${orderNumber} - Xprinter</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0mm;
        }
        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          html, body {
            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            color: #000000 !important;
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
          padding: 2mm;
          width: 80mm;
          max-width: 80mm;
          color: #000000;
          background: #FFFFFF;
          direction: rtl;
        }
        .receipt-container {
          width: 76mm;
          max-width: 76mm;
          background: #FFFFFF;
          border: 2px solid #000000;
          border-radius: 12px;
          padding: 8px;
          margin: 0 auto 10px auto;
          display: block;
        }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .dashed-sep { border-bottom: 1.5px dashed #000000; margin: 6px 0; }
        .solid-sep { border-bottom: 2px solid #000000; margin: 8px 0; }
        .double-sep { border-bottom: 3px double #000000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; align-items: center; margin: 3px 0; font-size: 13px; color: #000000; }
        .badge {
          border: 1.5px solid #000000;
          background: #E5E7EB;
          color: #000000;
          padding: 3px 12px;
          border-radius: 6px;
          display: inline-block;
          font-weight: 900;
          font-size: 13px;
          margin-top: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 6px 0;
          border: 1.5px solid #000000;
          border-radius: 6px;
          overflow: hidden;
        }
        th {
          background: #E5E7EB;
          color: #000000;
          padding: 5px 2px;
          font-size: 12px;
          font-weight: 900;
          border-bottom: 1.5px solid #000000;
          text-align: center;
        }
        .total-box {
          background: #F3F4F6;
          border: 2px solid #000000;
          padding: 6px 8px;
          border-radius: 8px;
          margin-top: 6px;
          font-weight: 900;
          font-size: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .cash-box {
          background: #000000;
          color: #FFFFFF;
          padding: 6px 8px;
          border-radius: 8px;
          margin-top: 6px;
          font-weight: 900;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-break {
          page-break-before: always !important;
          break-before: page !important;
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <!-- Main Header & Order Number -->
        <div class="center">
          <h1 style="margin: 0; font-size: 56px; font-weight: 900; line-height: 1; color: #000000;">#${orderNumber}</h1>
          <h2 style="margin: 4px 0 0 0; font-size: 17px; font-weight: 900; color: #000000;">مطعم البرادعي للحواوشي واللحوم</h2>
          <div style="font-size: 11px; font-weight: 700; color: #333; margin-top: 2px;">فرع: ${branchName}</div>
          <div class="badge">
            ${isDelivery ? '🛵 دليفري (توصيل للمنزل)' : (orderType === 'takeaway' ? '🥡 تيك أوي (Takeaway)' : '🍽️ صالة / طاولات')}
          </div>
        </div>

        <div class="solid-sep"></div>

        <!-- Meta Information -->
        <div class="row"><span style="font-weight: 700;">الكاشير :</span><span class="bold">${cashierName}</span></div>
        <div class="row"><span style="color: #333;">التاريخ :</span><span class="bold" style="direction: ltr;">${dateStr}</span></div>

        ${isDelivery ? `
          <div class="dashed-sep"></div>
          <div class="row"><span style="font-weight: 700;">الطيار المسؤول :</span><span class="bold" style="font-size: 14px;">🚴 ${driverName || 'طاقم التوصيل'}</span></div>
          <div class="row"><span style="font-weight: 700;">اسم العميل :</span><span class="bold">${customerName || 'عميل دليفري'}</span></div>
          <div class="row"><span style="font-weight: 700;">رقم الهاتف :</span><span class="bold" style="letter-spacing: 0.5px; font-size: 14px;">📞 ${customerPhone}</span></div>
          <div class="row"><span style="font-weight: 700;">العنوان :</span><span class="bold" style="font-size: 13px;">📍 ${customerAddress}</span></div>
          ${floorApartmentText ? `<div class="row"><span style="font-weight: 700;">الدور / الشقة :</span><span class="bold">🏠 ${floorApartmentText}</span></div>` : ''}
        ` : ''}

        ${orderNoteText ? `
          <div class="dashed-sep"></div>
          <div style="background: #E5E7EB; padding: 5px 8px; border-radius: 6px; border: 1.5px solid #000000; margin: 4px 0; font-size: 12px;">
            <span style="font-weight: 900; color: #000000;">📝 ملاحظات الطلب:</span>
            <span class="bold" style="color: #000000;"> ${orderNoteText}</span>
          </div>
        ` : ''}

        <div class="solid-sep"></div>

        <!-- Items Table Grid -->
        <table>
          <thead>
            <tr>
              <th style="text-align: right; width: 44%;">المنتج</th>
              <th style="width: 14%;">الكمية</th>
              <th style="width: 21%;">السعر</th>
              <th style="width: 21%;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="dashed-sep"></div>

        <!-- Pricing Totals Breakdown -->
        <div class="row"><span style="color: #333;">المجموع الفرعي:</span><span class="bold">${parseFloat(subtotal).toFixed(2)} ج.م</span></div>
        ${isDelivery && parseFloat(deliveryFee) > 0 ? `<div class="row"><span style="font-weight: 800;">🛵 خدمة التوصيل:</span><span class="bold">+${parseFloat(deliveryFee).toFixed(2)} ج.م</span></div>` : ''}
        ${parseFloat(discount) > 0 ? `<div class="row"><span style="font-weight: 800;">🎁 الخصم:</span><span class="bold">-${parseFloat(discount).toFixed(2)} ج.م</span></div>` : ''}
        
        <div class="total-box">
          <span>الصافي / الإجمالي النهائي:</span>
          <span style="font-size: 18px; color: #000000;">${parseFloat(total).toFixed(2)} ج.م</span>
        </div>

        <div class="row" style="margin-top: 6px;"><span style="font-weight: 700;">المبلغ المدفوع:</span><span class="bold">${parseFloat(paidAmount || total).toFixed(2)} ج.م</span></div>

        <!-- Change Due Box -->
        <div class="cash-box">
          <span>المتبقي للعميل (الباقي):</span>
          <span style="font-size: 16px;">${parseFloat(remainingAmount).toFixed(2)} ج.م</span>
        </div>

        <!-- Cash Collection Status Indicator -->
        <div style="margin-top: 8px; text-align: center; padding: 4px; border: 1.5px solid #000; border-radius: 6px; font-weight: 900; font-size: 12px; background: ${isCashCollected ? '#E5E7EB' : '#FFFFFF'};">
          ${isCashCollected ? '🟢 تم استلام النقدية وتوريد المبلغ بالشيفت' : '🔴 عهدة دليفري مع الطيار (لم تُورد بعد)'}
        </div>

        <div class="double-sep"></div>
        <div class="center" style="font-size: 12px; font-weight: 800; color: #000000;">
          شكراً لزيارتكم مطعم البرادعي! ❤️<br>
          نتمنى لكم وجبة شهية ولذيذة 🍔🥩
        </div>
      </div>
  `;

  // Kitchen / Driver Coupon Slip for Delivery Orders
  if (isDelivery) {
    const kitchenItemsHtml = items.map((item, idx) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: ${idx < items.length - 1 ? '1.5px dashed #000' : 'none'};">
        <span style="font-weight: 900; font-size: 16px; color: #000000;">
          ${item.name || item.product_name} ${item.size ? `(${item.size})` : ''} ${item.notes ? `[${item.notes}]` : ''}
        </span>
        <span style="font-weight: 900; font-size: 20px; color: #000000; border: 1.5px solid #000; padding: 2px 8px; border-radius: 6px; background: #E5E7EB;">
          x${item.quantity}
        </span>
      </div>
    `).join('');

    html += `
      <div class="page-break"></div>
      <div class="receipt-container">
        <div class="center">
          <h1 style="margin: 0; font-size: 64px; font-weight: 900; line-height: 1; color: #000000;">#${orderNumber}</h1>
          <div class="badge" style="font-size: 16px; padding: 4px 14px;">🛵 بون المطبخ والدليفري</div>
          <h3 style="margin: 6px 0 0 0; font-size: 15px; font-weight: 900; color: #000000;">الطيار: ${driverName || 'طاقم التوصيل'}</h3>
          <h3 style="margin: 2px 0 0 0; font-size: 14px; font-weight: 800; color: #000000;">العميل: ${customerName} (${customerPhone})</h3>
          <h3 style="margin: 2px 0 0 0; font-size: 13px; font-weight: 800; color: #000000;">الوجهة: ${customerAddress} ${floorApartmentText ? `(${floorApartmentText})` : ''}</h3>
        </div>

        <div class="solid-sep"></div>

        <div style="border: 2px solid #000000; border-radius: 8px; padding: 6px; margin: 6px 0;">
          ${kitchenItemsHtml}
        </div>

        ${orderNoteText ? `
          <div style="margin-top: 6px; font-weight: 900; font-size: 13px; color: #000000; background: #E5E7EB; padding: 6px; border-radius: 6px; border: 1.5px solid #000000; text-align: center;">
            ملاحظات: ${orderNoteText}
          </div>
        ` : ''}

        <div class="dashed-sep"></div>
        <div class="center" style="font-size: 12px; font-weight: 800; color: #000000;">${dateStr}</div>
      </div>
    `;
  }

  html += `
    </body>
    </html>
  `;

  // Hidden iframe print trigger optimized for Xprinter D200N
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
