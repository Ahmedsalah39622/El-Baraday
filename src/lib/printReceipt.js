// Thermal Receipt Printing Helper for 8cm (80mm) Epson Printers - Single Continuous Bon
export function printThermalReceipt(orderData) {
  if (!orderData) return;

  const {
    orderNumber = '1',
    dateStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
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
    total = 0,
    paidAmount = 0,
    remainingAmount = 0,
    orderType = 'takeaway',
  } = orderData;

  const isDelivery = orderType === 'delivery';
  const floorApartmentText = [
    customerFloor ? `الدور ${customerFloor}` : '',
    customerApartment ? `شقة ${customerApartment}` : ''
  ].filter(Boolean).join(' - ');

  // Build item rows HTML matching popup grid styling
  const itemsHtml = items.map((item, idx) => `
    <tr style="border-bottom: ${idx < items.length - 1 ? '1px dashed #CCC' : 'none'}; page-break-inside: avoid;">
      <td style="padding: 6px 4px; font-weight: 800; text-align: right; font-size: 13px; color: #1A1A2E;">
        ${item.name} ${item.size ? `<span style="font-size: 11px; color: #555;">(${item.size})</span>` : ''}
      </td>
      <td style="padding: 6px 4px; font-weight: 900; text-align: center; font-size: 13px; color: #1A1A2E;">${item.quantity}</td>
      <td style="padding: 6px 4px; font-weight: 700; text-align: center; font-size: 12px; color: #555;">${item.price}</td>
      <td style="padding: 6px 4px; font-weight: 900; text-align: center; font-size: 13px; color: #1A1A2E;">${(item.price * item.quantity).toFixed(0)}</td>
    </tr>
  `).join('');

  // Complete HTML document matching the Popup Design with 8cm width
  let html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة #${orderNumber}</title>
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
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
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
          font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
          margin: 0 auto;
          padding: 4px;
          width: 80mm;
          max-width: 80mm;
          color: #1A1A2E;
          background: #FFFFFF;
          direction: rtl;
        }
        .bon-card {
          width: 78mm;
          max-width: 78mm;
          background: #FFFFFF;
          border: 1.5px solid #1A1A2E;
          border-radius: 10px;
          padding: 10px;
          margin: 0 auto 8px auto;
          display: block;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .dashed-line { border-bottom: 1px dashed #999; margin: 8px 0; }
        .solid-line { border-bottom: 1.5px solid #1A1A2E; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; align-items: center; margin: 4px 0; font-size: 13px; color: #1A1A2E; }
        .badge {
          border: 1px solid #1A1A2E;
          background: #F3F4F6;
          color: #1A1A2E;
          padding: 2px 10px;
          border-radius: 6px;
          display: inline-block;
          font-weight: 900;
          font-size: 12px;
          margin-top: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          border: 1.5px solid #1A1A2E;
          border-radius: 8px;
          overflow: hidden;
        }
        th {
          background: #F3F4F6;
          color: #1A1A2E;
          padding: 6px 4px;
          font-size: 12px;
          font-weight: 900;
          border-bottom: 1.5px solid #1A1A2E;
          text-align: center;
        }
        .change-box {
          background: #1A1A2E;
          color: #FFFFFF;
          padding: 8px 10px;
          border-radius: 8px;
          margin-top: 8px;
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
      <div class="bon-card">
        <!-- Big Order Number & Header -->
        <div class="center">
          <h1 style="margin: 0; font-size: 44px; font-weight: 900; line-height: 1; color: #1A1A2E;">${orderNumber}</h1>
          <h2 style="margin: 4px 0 0 0; font-size: 16px; font-weight: 800; color: #1A1A2E;">مطعم البرادعي للحواوشي</h2>
          ${!isDelivery ? `<div class="badge">${orderType === 'takeaway' ? 'تيك أوي (Takeaway)' : 'صالة / محلي'}</div>` : ''}
        </div>

        <div class="dashed-line"></div>

        <!-- Driver / Cashier Info -->
        ${isDelivery ? `
          <div class="row"><span style="font-weight: 700;">الطيار :</span><span class="bold">${driverName}</span></div>
        ` : `
          <div class="row"><span style="font-weight: 700;">نوع الطلب :</span><span class="bold">${orderType === 'takeaway' ? 'تيك أوي' : 'محلي'}</span></div>
        `}
        <div class="row"><span style="color: #555;">التاريخ :</span><span>${dateStr}</span></div>
        <div class="row"><span style="color: #555;">الكاشير :</span><span>${cashierName}</span></div>

        ${isDelivery ? `
          <div class="dashed-line"></div>
          <!-- Customer Details -->
          <div class="row"><span style="font-weight: 700;">العميل :</span><span class="bold">${customerName}</span></div>
          <div class="row"><span style="font-weight: 700;">رقم الهاتف :</span><span class="bold" style="letter-spacing: 0.5px;">${customerPhone}</span></div>
          <div class="row"><span style="font-weight: 700;">العنوان :</span><span class="bold">${customerAddress}</span></div>
          ${floorApartmentText ? `<div class="row"><span style="font-weight: 700;">الدور / الشقة :</span><span class="bold">${floorApartmentText}</span></div>` : ''}
        ` : ''}

        <div class="dashed-line"></div>

        <!-- Items Table Grid -->
        <table>
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

        <div class="dashed-line"></div>

        <!-- Totals -->
        <div class="row"><span style="color: #555;">المجموع الفرعي</span><span class="bold">${subtotal.toFixed(2)} ج.م</span></div>
        ${isDelivery && deliveryFee > 0 ? `<div class="row"><span style="color: #E06B1F; font-weight: 700;">خدمة التوصيل</span><span class="bold" style="color: #E06B1F;">+${deliveryFee.toFixed(2)} ج.م</span></div>` : ''}
        <div class="solid-line"></div>
        <div class="row" style="font-size: 14px;"><span class="bold">الصافي / الإجمالي النهائي</span><span class="bold" style="font-size: 16px; color: #4285F4;">${total.toFixed(2)} ج.م</span></div>
        <div class="row"><span style="font-weight: 700;">المبلغ المدفوع</span><span class="bold">${paidAmount.toFixed(2)} ج.م</span></div>

        <!-- Remaining Change Box -->
        <div class="change-box">
          <span>المتبقي / الباقي للعميل</span>
          <span style="font-size: 16px;">${remainingAmount.toFixed(2)} ج.م</span>
        </div>
      </div>
  `;

  // Append RECEIPT 2 (Kitchen/Driver slip) ONLY for Delivery orders
  if (isDelivery) {
    const kitchenItemsHtml = items.map((item, idx) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: ${idx < items.length - 1 ? '1px solid #DDD' : 'none'};">
        <span style="font-weight: 900; font-size: 15px; color: #1A1A2E;">${item.name} ${item.size ? `(${item.size})` : ''} ${item.notes ? `[${item.notes}]` : ''}</span>
        <span style="font-weight: 900; font-size: 16px; color: #1A1A2E;">${item.quantity}</span>
      </div>
    `).join('');

    html += `
      <div class="page-break"></div>
      <div class="bon-card">
        <div class="center">
          <h1 style="margin: 0; font-size: 52px; font-weight: 900; line-height: 1; color: #1A1A2E;">${orderNumber}</h1>
          <h2 style="margin: 6px 0 2px 0; font-size: 24px; font-weight: 900; letter-spacing: 1px;">دليفري</h2>
          <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #555;">${customerAddress} ${floorApartmentText ? `(${floorApartmentText})` : ''}</h3>
        </div>

        <div style="border-bottom: 2px solid #1A1A2E; margin: 10px 0;"></div>

        <div style="border: 2px solid #1A1A2E; border-radius: 8px; padding: 8px; margin: 8px 0;">
          ${kitchenItemsHtml}
        </div>

        <div class="dashed-line"></div>
        <div class="center" style="font-size: 12px; color: #555;">${dateStr}</div>
      </div>
    `;
  }

  html += `
    </body>
    </html>
  `;

  // Hidden iframe execution for 100% reliable print preview
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
