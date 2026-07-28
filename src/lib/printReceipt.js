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

// Custom General / Collection Invoice Printing Helper
export function printCustomInvoice(invoiceData, settings = {}, isThermal = false) {
  if (!invoiceData) return;

  const {
    invoice_number = 'INV-1001',
    customer_name = 'عميل',
    customer_phone = '',
    title = 'فاتورة تحصيل',
    amount = 0,
    paid_amount = 0,
    remaining_amount = 0,
    payment_status = 'paid',
    payment_method = 'cash',
    invoice_date = new Date().toISOString().split('T')[0],
    notes = '',
    items = [],
  } = invoiceData;

  const companyName = settings?.company_name || 'مطعم البرادعي للحواوشي';
  const companyAddress = settings?.company_address || 'المحل الرئيسي';
  const companyPhone = settings?.company_phone || '01012345678';

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'محصل بالكامل';
      case 'partial': return 'تحصيل جزئي';
      case 'unpaid': return 'غير محصل (آجل)';
      default: return 'مكتمل';
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'cash': return 'نقداً (كاش)';
      case 'visa': return 'فيزا / بطاقة';
      case 'transfer': return 'تحويل بنكي';
      case 'vodafone_cash': return 'فودافون كاش';
      default: return method || 'كاش';
    }
  };

  const itemsHtml = Array.isArray(items) && items.length > 0
    ? items.map((item) => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 6px; text-align: right;">${item.description || item.name || item.product_name || 'بند'}</td>
          <td style="padding: 6px; text-align: center;">${item.qty || item.quantity || 1}</td>
          <td style="padding: 6px; text-align: center;">${parseFloat(item.price || 0).toLocaleString()} ج.م</td>
          <td style="padding: 6px; text-align: center; font-weight: bold;">${parseFloat(item.total || ((item.price || 0) * (item.qty || item.quantity || 1)) || 0).toLocaleString()} ج.m</td>
        </tr>
      `).join('')
    : '';

  const html = isThermal ? `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة ${invoice_number}</title>
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
            padding: 0 3mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
          margin: 0 auto;
          padding: 0 3mm;
          width: 100%;
          color: #000000;
          background: #ffffff;
          direction: rtl;
        }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .dashed { border-bottom: 1.5px dashed #000000; margin: 5px 0; }
        .solid { border-bottom: 2px solid #000000; margin: 6px 0; }
        table.meta { width: 100%; border-collapse: collapse; margin: 4px 0; }
        table.meta td { font-size: 11px; font-weight: 800; padding: 3px 0; color: #000000; }
        .total-box {
          border: 2px solid #000000;
          padding: 6px;
          border-radius: 6px;
          margin: 6px 0;
          font-weight: 900;
          background: #F9FAFB;
        }
      </style>
    </head>
    <body>
      <div style="padding: 3mm 0;">
        <div class="center">
          <h2 style="margin: 0; font-size: 16px; font-weight: 900; color: #000000;">${companyName}</h2>
          <div style="font-size: 10px; font-weight: 700; color: #000000;">${companyAddress} ${companyPhone ? `| هاتف: ${companyPhone}` : ''}</div>
          <div style="margin-top: 4px; font-size: 12px; font-weight: 900; background: #E5E7EB; border: 1.5px solid #000000; padding: 2px 8px; display: inline-block; border-radius: 4px; color: #000000;">
            فاتورة تحصيل #${invoice_number}
          </div>
        </div>

        <div class="solid"></div>

        <table class="meta">
          <tr>
            <td style="width: 40%;">العميل / الجهة:</td>
            <td style="font-weight: 900; text-align: left;">${customer_name}</td>
          </tr>
          ${customer_phone ? `
            <tr>
              <td>رقم الهاتف:</td>
              <td style="font-weight: 900; text-align: left;">${customer_phone}</td>
            </tr>
          ` : ''}
          <tr>
            <td>تاريخ الفاتورة:</td>
            <td style="font-weight: 900; text-align: left;">${invoice_date ? invoice_date.split('T')[0] : ''}</td>
          </tr>
          <tr>
            <td>البيان / الوصف:</td>
            <td style="font-weight: 900; text-align: left;">${title || 'فاتورة تحصيل'}</td>
          </tr>
        </table>

        ${itemsHtml ? `
          <div class="solid"></div>
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000;">
            <thead>
              <tr style="background: #E5E7EB;">
                <th style="font-size: 10px; padding: 3px; text-align: right; border-bottom: 1.5px solid #000;">البند</th>
                <th style="font-size: 10px; padding: 3px; text-align: center; border-bottom: 1.5px solid #000;">العدد</th>
                <th style="font-size: 10px; padding: 3px; text-align: center; border-bottom: 1.5px solid #000;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        ` : ''}

        <div class="solid"></div>

        <div class="total-box">
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 900;">
            <span>مبلغ التحصيل:</span>
            <span>${parseFloat(amount).toLocaleString()} ج.م</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; color: #166534; margin-top: 3px;">
            <span>المحصل (المدفوع):</span>
            <span>${parseFloat(paid_amount).toLocaleString()} ج.م</span>
          </div>
          ${parseFloat(remaining_amount) > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 900; color: #991b1b; margin-top: 3px;">
              <span>المتبقي (الآجل):</span>
              <span>${parseFloat(remaining_amount).toLocaleString()} ج.م</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; margin-top: 5px; border-top: 1px dashed #000; padding-top: 4px;">
            <span>طريقة الدفع: ${getPaymentMethodLabel(payment_method)}</span>
            <span>الحالة: ${getStatusLabel(payment_status)}</span>
          </div>
        </div>

        ${notes ? `
          <div style="font-size: 10px; font-weight: 800; background: #F3F4F6; padding: 4px; border-radius: 4px; border: 1px solid #000000; text-align: center; margin-top: 4px;">
            ملاحظات: ${notes}
          </div>
        ` : ''}

        <div class="dashed"></div>
        <div class="center" style="font-size: 10px; font-weight: 900; margin-top: 6px;">شكراً لتعاملكم معنا!</div>
      </div>
    </body>
    </html>
  ` : `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة ${invoice_number}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @page {
          size: auto;
          margin: 10mm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        body {
          font-family: 'Cairo', system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: 15px;
          color: #000000;
          background: #ffffff;
          direction: rtl;
        }
        .invoice-box {
          max-width: 800px;
          margin: auto;
          padding: 24px;
          border: 2px solid #000000;
          border-radius: 12px;
          box-sizing: border-box;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000000;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0 0 6px 0;
          font-size: 26px;
          font-weight: 900;
          color: #000000;
        }
        .header p {
          margin: 0;
          font-size: 14px;
          color: #222222;
          font-weight: 700;
        }
        .doc-title {
          display: inline-block;
          margin-top: 12px;
          padding: 6px 24px;
          border: 2px solid #000000;
          font-size: 19px;
          font-weight: 900;
          background: #F1F5F9;
          border-radius: 6px;
          color: #000000;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .meta-table td {
          padding: 10px 14px;
          border: 1.5px solid #000000;
          font-size: 14px;
          font-weight: 700;
          color: #000000;
        }
        .meta-table td strong {
          color: #000000;
          font-weight: 900;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .items-table th {
          background: #E2E8F0;
          border: 1.5px solid #000000;
          padding: 10px;
          font-size: 14px;
          font-weight: 900;
          color: #000000;
        }
        .items-table td {
          border: 1px solid #000000;
          padding: 8px 10px;
          font-size: 13px;
          font-weight: 700;
          color: #000000;
        }
        .totals-box {
          width: 100%;
          border: 2px solid #000000;
          background: #F8FAFC;
          padding: 16px;
          box-sizing: border-box;
          margin-bottom: 20px;
          border-radius: 8px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: 800;
          margin-bottom: 8px;
          color: #000000;
        }
        .totals-row.main {
          font-size: 21px;
          font-weight: 900;
          border-bottom: 2px solid #000000;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .notes-box {
          border: 1.5px dashed #000000;
          padding: 12px;
          margin-bottom: 25px;
          font-size: 13px;
          font-weight: 700;
          background: #FAFAFA;
          border-radius: 6px;
          color: #000000;
        }
        .signatures {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          text-align: center;
        }
        .signatures strong {
          font-size: 14px;
          font-weight: 900;
          color: #000000;
        }
        .signatures .sign-line {
          margin-top: 45px;
          width: 180px;
          border-top: 2px solid #000000;
        }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <h1>${companyName}</h1>
          <p>${companyAddress} ${companyPhone ? ` | هاتف: ${companyPhone}` : ''}</p>
          <div class="doc-title">فاتورة تحصيل مالي</div>
        </div>

        <table class="meta-table">
          <tr>
            <td><strong>رقم الفاتورة:</strong> ${invoice_number}</td>
            <td><strong>تاريخ الفاتورة (يوم كذا):</strong> ${invoice_date ? invoice_date.split('T')[0] : ''}</td>
          </tr>
          <tr>
            <td><strong>اسم العميل/الجهة (باسم كذا):</strong> ${customer_name}</td>
            <td><strong>رقم الهاتف:</strong> ${customer_phone || '-'}</td>
          </tr>
          <tr>
            <td colspan="2"><strong>البيان / الوصف:</strong> ${title || 'فاتورة تحصيل'}</td>
          </tr>
        </table>

        ${itemsHtml ? `
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: right;">البند / البيان</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        ` : ''}

        <div class="totals-box">
          <div class="totals-row main">
            <span>مبلغ التحصيل الإجمالي:</span>
            <span>${parseFloat(amount).toLocaleString()} ج.م</span>
          </div>
          <div class="totals-row" style="color: #15803D;">
            <span>المبلغ المستلم (المحصل):</span>
            <span>${parseFloat(paid_amount).toLocaleString()} ج.م</span>
          </div>
          ${parseFloat(remaining_amount) > 0 ? `
            <div class="totals-row" style="color: #B91C1C;">
              <span>المبلغ المتبقي (الآجل):</span>
              <span>${parseFloat(remaining_amount).toLocaleString()} ج.م</span>
            </div>
          ` : ''}
          <div style="margin-top: 12px; font-size: 14px; font-weight: 800; border-top: 1.5px dashed #000000; padding-top: 10px; display: flex; justify-content: space-between;">
            <span><strong>طريقة الدفع:</strong> ${getPaymentMethodLabel(payment_method)}</span>
            <span><strong>حالة التحصيل:</strong> ${getStatusLabel(payment_status)}</span>
          </div>
        </div>

        ${notes ? `
          <div class="notes-box">
            <strong>ملاحظات:</strong> ${notes}
          </div>
        ` : ''}

        <div class="signatures">
          <div>
            <strong>توقيع الموظف / المسؤول</strong>
            <div class="sign-line"></div>
          </div>
          <div>
            <strong>توقيع المستلم / العميل</strong>
            <div class="sign-line"></div>
          </div>
        </div>
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
      } catch (e) { }
    }, 2000);
  }, 250);
}

