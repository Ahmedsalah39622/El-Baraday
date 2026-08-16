const printedOrderIdsSet = new Set();

export function isOrderPrinted(orderId, orderNumber) {
  if (!orderId && !orderNumber) return false;
  if (orderId && printedOrderIdsSet.has(String(orderId))) return true;
  if (orderNumber && printedOrderIdsSet.has(String(orderNumber))) return true;
  return false;
}

export function markOrderAsPrinted(orderId, orderNumber) {
  if (orderId) printedOrderIdsSet.add(String(orderId));
  if (orderNumber) printedOrderIdsSet.add(String(orderNumber));
}

export function printThermalReceipt(orderData) {
  if (!orderData) return;

  const orderId = orderData.id || orderData.order_id;
  const orderNum = orderData.orderNumber || orderData.order_number || '1';

  markOrderAsPrinted(orderId, orderNum);

  const orderTypeVal = orderData.orderType || orderData.order_type || 'takeaway';
  const isDelivery = orderTypeVal === 'delivery';

  const cashierName = orderData.cashierName || orderData.cashier_name || 'الكاشير';
  const driverName = orderData.driverName || orderData.driver_name || '';
  const branchName = orderData.branchName || orderData.branch_name || 'الفرع الرئيسي';

  const customerName = orderData.customerName || orderData.customer_name || '';
  const customerPhone = orderData.customerPhone || orderData.customer_phone || '';

  const addressPart = orderData.customerAddress || orderData.customer_address || orderData.address || '';
  const areaPart = orderData.customerArea || orderData.customer_area || orderData.area || '';
  const combinedAddr = [addressPart, areaPart].filter((a) => a && a !== 'null' && a !== 'undefined').join(' - ');

  const customerFloor = orderData.customerFloor || orderData.customer_floor || orderData.floor || '';
  const customerApartment = orderData.customerApartment || orderData.customer_apartment || orderData.apartment || '';

  const items = orderData.items || [];
  const subtotal = orderData.subtotal || 0;
  const deliveryFee = orderData.deliveryFee || orderData.delivery_fee || 0;
  const discount = orderData.discount || 0;
  const total = orderData.total || 0;
  const paidAmount = orderData.paidAmount || orderData.paid_amount || 0;
  const remainingAmount = orderData.remainingAmount || orderData.remaining_amount || 0;
  const notes = orderData.notes || orderData.orderNotes || '';
  const orderNotes = orderData.orderNotes || orderData.notes || '';
  const isCashCollected = orderData.is_cash_collected || orderData.isCashCollected || false;

  const dateStr = orderData.dateStr || new Date(orderData.createdAt || orderData.created_at || Date.now()).toLocaleString('ar-EG', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  let formattedTimeAndDay = dateStr;
  try {
    const rawDate = orderData.createdAt || orderData.created_at;
    const d = rawDate ? new Date(rawDate) : new Date();
    if (!isNaN(d.getTime())) {
      const dayName = d.toLocaleDateString('ar-EG', { weekday: 'long' });
      const timeStr = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
      formattedTimeAndDay = `${timeStr} - ${dayName}`;
    }
  } catch (e) {
    formattedTimeAndDay = dateStr;
  }

  let transferBranchText = orderData.sourceBranchName || orderData.source_branch_name || '';
  const noteContent = notes || orderNotes || '';
  if (!transferBranchText && noteContent.includes('طلب دليفري محول من')) {
    const match = noteContent.match(/طلب دليفري محول من\s+([^\]\s]+(?:\s+[^\]\s]+)*?)(?:\s+بواسطة|\])/);
    if (match && match[1]) {
      transferBranchText = match[1].trim();
    } else {
      transferBranchText = 'فرع آخر';
    }
  }

  const orderNoteText = notes || orderNotes || '';
  const cleanPhone = (customerPhone && customerPhone !== 'null' && customerPhone !== 'undefined') ? String(customerPhone).trim() : '';
  const cleanName = (customerName && customerName !== 'null' && customerName !== 'undefined') ? String(customerName).trim() : '';
  const cleanAddress = (combinedAddr && combinedAddr !== 'null' && combinedAddr !== 'undefined') ? String(combinedAddr).trim() : '';
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
      <tr style="border-bottom: ${idx < items.length - 1 ? '1px dashed #999' : '1.5px solid #000'};">
        <td style="padding: 2px 1px; font-weight: 800; text-align: right; font-size: 10px; color: #000; word-break: break-word;">
          ${itemName}
          ${itemSize ? `<span style="font-size: 9px; font-weight: 700; color: #333;"> ${itemSize}</span>` : ''}
          ${itemNotes ? `<span style="font-size: 9px; font-weight: 700; color: #333;"> (${itemNotes})</span>` : ''}
        </td>
        <td style="padding: 2px 1px; font-weight: 900; text-align: center; font-size: 11px; color: #000;">${item.quantity}</td>
        <td style="padding: 2px 1px; font-weight: 700; text-align: center; font-size: 10px; color: #000;">${itemPrice}</td>
        <td style="padding: 2px 1px; font-weight: 900; text-align: center; font-size: 11px; color: #000;">${itemTotal}</td>
      </tr>
    `;
  }).join('');

  // 100% Compact & Paper-Saving HTML Template using 2-Column Tables
  let html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة #${orderNum}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&display=swap');
        @page {
          size: ${isDelivery ? '80mm auto' : '58mm auto'};
          margin: 0mm !important;
        }
        @media print {
          @page {
            size: ${isDelivery ? '80mm auto' : '58mm auto'};
            margin: 0mm !important;
          }
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 ${isDelivery ? '1.5mm' : '0.5mm'} !important;
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
          padding: 0 1.5mm;
          width: 100%;
          color: #000000;
          background: #FFFFFF;
          direction: rtl;
        }
        .print-wrapper {
          width: 100% !important;
          margin: 0 auto !important;
          padding: 1mm 0 !important;
          box-sizing: border-box !important;
        }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .dashed-sep { border-bottom: 1px dashed #000000; margin: 2px 0; }
        .solid-sep { border-bottom: 1.5px solid #000000; margin: 3px 0; }
        .double-sep { border-bottom: 2px double #000000; margin: 3px 0; }
        
        .badge {
          border: 1px solid #000000;
          background: #F3F4F6;
          color: #000000;
          padding: 1px 5px;
          border-radius: 4px;
          display: inline-block;
          font-weight: 900;
          font-size: 9.5px;
          margin-top: 1px;
        }
        
        /* Compact Table Layout */
        table.meta-table, table.totals-table, table.items-table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 1px 0 !important;
          table-layout: fixed !important;
        }
        table.meta-table td {
          padding: 1px 0 !important;
        }
        table.items-table {
          border: 1px solid #000000 !important;
        }
        table.items-table th {
          background: #E5E7EB;
          color: #000000;
          padding: 2px 1px;
          font-size: 10px;
          font-weight: 900;
          border-bottom: 1px solid #000000;
          text-align: center;
        }
        
        .total-box {
          border: 1.5px solid #000000;
          padding: 2px 4px;
          border-radius: 4px;
          margin-top: 2px;
          font-weight: 900;
          font-size: 11px;
          background: #F9FAFB;
        }
        .cash-box {
          background: #000000;
          color: #FFFFFF;
          padding: 2px 4px;
          border-radius: 4px;
          margin-top: 2px;
          font-weight: 900;
          font-size: 10px;
        }
        .page-break {
          page-break-before: always !important;
          break-before: page !important;
          margin-top: 4px;
        }
      </style>
    </head>
    <body>
      ${isDelivery ? `
        <!-- Main Delivery Receipt Body -->
        <div class="print-wrapper">
          <div class="center">
            <h1 style="margin: 0; font-size: 32px; font-weight: 900; line-height: 1; color: #000000; direction: ltr; display: block; text-align: center;">#${orderNum}</h1>
            <h2 style="margin: 1px 0 0 0; font-size: 11.5px; font-weight: 900; color: #000000;">مطعم البرادعي للحواوشي واللحوم</h2>
            <div style="font-size: 9px; font-weight: 700; color: #333;">فرع: ${branchName ? String(branchName).replace(/^فرع\s+/, '') : 'الرئيسي'}</div>
            <div class="badge">
              🛵 دليفري (توصيل للمنزل)
            </div>
            ${transferBranchText ? `
              <div style="margin-top: 4px; padding: 4px 6px; border: 2px solid #000000; border-radius: 6px; font-size: 11px; font-weight: 900; background: #E5E7EB; color: #000000; text-align: center;">
                🚀 طلب دليفري محول من: ${transferBranchText}
              </div>
            ` : ''}
          </div>

          <div class="solid-sep"></div>

          <!-- Meta Details Table (Strict 2 Columns to eliminate right/left clipping) -->
          <table class="meta-table">
            <tr>
              <td style="text-align: right; font-weight: 700; font-size: 11px; width: 35%;">طريقة الدفع:</td>
              <td style="text-align: left; font-weight: 900; font-size: 11px; width: 65%;">
                ${(orderData.paymentMethod === 'instapay' || orderData.payment_method === 'instapay') ? '⚡ إنستا باي (InstaPay)' : 
                  (orderData.paymentMethod === 'vodafone_cash' || orderData.payment_method === 'vodafone_cash') ? '📱 فودافون كاش (Vodafone Cash)' :
                  (orderData.paymentMethod === 'card' || orderData.payment_method === 'card') ? '💳 شبكة / فيزا (Card)' : '💵 نقداً (كاش)'}
              </td>
            </tr>
            <tr>
              <td style="text-align: right; font-weight: 700; font-size: 11px; width: 35%;">الكاشير:</td>
              <td style="text-align: left; font-weight: 900; font-size: 11px; width: 65%;">${cashierName}</td>
            </tr>
            <tr>
              <td style="text-align: right; font-weight: 700; font-size: 11px; width: 35%;">التاريخ والوقت:</td>
              <td style="text-align: left; font-weight: 900; font-size: 10px; width: 65%;">${dateStr}</td>
            </tr>
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
                <td style="text-align: right; font-weight: 700; font-size: 11px;">📍 العنوان:</td>
                <td style="text-align: left; font-weight: 900; font-size: 11px; color: #000; word-break: break-word;">📍 ${cleanAddress}</td>
              </tr>
            ` : ''}
            ${floorApartmentText ? `
              <tr>
                <td style="text-align: right; font-weight: 700; font-size: 11px;">الدور / الشقة:</td>
                <td style="text-align: left; font-weight: 900; font-size: 11px;">🏠 ${floorApartmentText}</td>
              </tr>
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
            ${parseFloat(deliveryFee) > 0 ? `
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
      ` : `
        <!-- Compact Takeaway Receipt Body (بون تيك أوي مصغر 58mm) -->
        <div class="print-wrapper" style="padding: 0.5mm 0 !important; max-width: 58mm; margin: 0 auto;">
          <!-- 1. Top Center: Big Order Number -->
          <div style="text-align: center; margin-bottom: 2px;">
            <h1 style="margin: 0; font-size: 38px; font-weight: 900; line-height: 1; color: #000000; direction: ltr; text-align: center;">#${orderNum}</h1>
          </div>

          <!-- 2. Shop Name -->
          <div style="text-align: center; margin-bottom: 3px;">
            <h2 style="margin: 0; font-size: 11.5px; font-weight: 900; color: #000000; text-align: center;">مطعم البرادعي للحواوشي واللحوم</h2>
            ${branchName && branchName !== 'الفرع الرئيسي' ? `<div style="font-size: 8.5px; font-weight: 700; color: #333; text-align: center;">فرع: ${String(branchName).replace(/^فرع\s+/, '')}</div>` : ''}
          </div>

          <div style="border-bottom: 1.5px solid #000000; margin: 2px 0;"></div>

          <!-- 3. Cashier (one side) vs Time & Day (other side) -->
          <table style="width: 100%; border-collapse: collapse; margin: 2px 0;">
            <tr>
              <td style="text-align: right; font-weight: 900; font-size: 9.5px; color: #000000; width: 45%;">
                الكاشير: ${cashierName}
              </td>
              <td style="text-align: left; font-weight: 800; font-size: 8.5px; color: #000000; width: 55%;">
                ${formattedTimeAndDay}
              </td>
            </tr>
          </table>

          <!-- 4. Requested items inside clean rounded rectangle -->
          <div style="border: 1.5px solid #000000; border-radius: 8px; padding: 3px; margin: 3px 0; background: #FFFFFF; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
              <thead>
                <tr style="border-bottom: 1px solid #000000; background: #F3F4F6;">
                  <th style="text-align: right; width: 46%; padding: 2px 1px; font-size: 9px; font-weight: 900; color: #000000;">الصنف</th>
                  <th style="text-align: center; width: 18%; padding: 2px 1px; font-size: 9px; font-weight: 900; color: #000000;">العدد</th>
                  <th style="text-align: center; width: 18%; padding: 2px 1px; font-size: 9px; font-weight: 900; color: #000000;">السعر</th>
                  <th style="text-align: left; width: 18%; padding: 2px 1px; font-size: 9px; font-weight: 900; color: #000000;">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <!-- 5. Total -->
          <div style="border: 1.5px solid #000000; border-radius: 6px; padding: 3px 5px; margin-top: 3px; background: #F9FAFB;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="text-align: right; font-weight: 900; font-size: 11px; color: #000000;">الإجمالي:</td>
                <td style="text-align: left; font-weight: 900; font-size: 15px; color: #000000;">${parseFloat(total).toFixed(2)} ج.م</td>
              </tr>
              ${parseFloat(discount) > 0 ? `
                <tr>
                  <td style="text-align: right; font-weight: 700; font-size: 8.5px; color: #444;">الخصم:</td>
                  <td style="text-align: left; font-weight: 900; font-size: 8.5px; color: #444;">-${parseFloat(discount).toFixed(2)} ج.م</td>
                </tr>
              ` : ''}
              ${(paidAmount && paidAmount !== total) || parseFloat(remainingAmount) > 0 ? `
                <tr>
                  <td style="text-align: right; font-weight: 700; font-size: 8.5px; color: #444;">المدفوع / المتبقي:</td>
                  <td style="text-align: left; font-weight: 900; font-size: 8.5px; color: #444;">${parseFloat(paidAmount || total).toFixed(0)} / ${parseFloat(remainingAmount).toFixed(0)} ج.م</td>
                </tr>
              ` : ''}
            </table>
          </div>

          ${orderNoteText ? `
            <div style="margin-top: 3px; border: 1px dashed #000000; border-radius: 4px; padding: 2px 4px; font-size: 8.5px; font-weight: 800;">
              📝 ملاحظات: ${orderNoteText}
            </div>
          ` : ''}

          <div style="border-bottom: 1px dashed #000000; margin: 3px 0 2px 0;"></div>
          <div style="text-align: center; font-size: 8.5px; font-weight: 800; color: #000000;">
            شكراً لزيارتكم مطعم البرادعي! ❤️
          </div>
        </div>
      `}

      <!-- Kitchen / Driver Slip for Delivery Orders -->
      ${isDelivery ? `
        <div class="page-break"></div>
        <div class="print-wrapper">
          <div class="center">
            <h1 style="margin: 0; font-size: 42px; font-weight: 900; line-height: 1; color: #000000;">#${orderNum}</h1>
            <div class="badge" style="font-size: 12px; padding: 3px 10px;">🛵 بون المطبخ والدليفري</div>
            ${transferBranchText ? `
              <div style="margin-top: 4px; padding: 4px 6px; border: 2px solid #000000; border-radius: 6px; font-size: 12px; font-weight: 900; background: #E5E7EB; color: #000000; text-align: center;">
                🚀 طلب دليفري محول من: ${transferBranchText}
              </div>
            ` : ''}
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
  iframe.style.position = 'absolute';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.border = '0';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print iframe error:', e);
    }
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch (e) { }
    }, 3000);
  }, 300);
}

export function playOrderNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playTone(659.25, 0, 0.15); // E5
    playTone(880, 0.15, 0.35);  // A5
  } catch (e) {
    console.warn('Audio chime notice error:', e);
  }
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

// Bulletproof 80mm Thermal Printer Raffle Coupon Ticket
export function printRaffleCoupon(couponData) {
  if (!couponData) return;

  const {
    couponNumber = Math.floor(100000 + Math.random() * 900000),
    customerName = 'عميل المحل',
    customerPhone = '',
    raffleTitle = 'سحب الجائزة الكبرى - مطعم البرادعي',
    dateStr = new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
    branchName = 'مطعم البرادعي للحواوشي'
  } = couponData;

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>كوبون سحب #${couponNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@700;800;900&display=swap');
        @page { size: 80mm auto; margin: 0mm !important; }
        @media print {
          html, body { width: 100% !important; margin: 0 !important; padding: 2mm !important; background: #FFF !important; color: #000 !important; }
        }
        body {
          font-family: 'Cairo', sans-serif;
          width: 72mm;
          margin: 0 auto;
          padding: 4px;
          color: #000000;
          text-align: center;
          direction: rtl;
        }
        .coupon-border {
          border: 2px dashed #000000;
          border-radius: 8px;
          padding: 8px 6px;
        }
        .header-title { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
        .sub-header { font-size: 12px; font-weight: 800; margin-bottom: 6px; }
        .number-box {
          border: 2px solid #000000;
          border-radius: 6px;
          background: #000000;
          color: #FFFFFF;
          padding: 6px;
          font-size: 18px;
          font-weight: 900;
          margin: 8px 0;
        }
        .meta-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; border-bottom: 1px solid #000; padding: 4px 0; }
        .footer-note { font-size: 10px; font-weight: 800; margin-top: 8px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="coupon-border">
        <div class="header-title">🎟️ كوبون دخول سحب الجوائز 🎟️</div>
        <div class="sub-header">${branchName}</div>
        <div style="font-size: 11px; font-weight: 800;">${raffleTitle}</div>
        
        <div class="number-box">
          رقم الكوبون: #${couponNumber}
        </div>

        <div class="meta-row">
          <span>اسم العميل:</span>
          <span>${customerName}</span>
        </div>
        ${customerPhone ? `
          <div class="meta-row">
            <span>رقم الهاتف:</span>
            <span>${customerPhone}</span>
          </div>
        ` : ''}
        <div class="meta-row">
          <span>تاريخ الإصدار:</span>
          <span>${dateStr}</span>
        </div>

        <div class="footer-note">
          ✂️ يُوضع هذا الكوبون في صندوق السحب للدخول في القرعة العلنية والجوائز! 🎁
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

// Thermal Receipt Helper for Order Returns (إيصال مرتجع)
export function printReturnReceipt(returnData) {
  if (!returnData) return;

  const {
    orderNumber = '',
    returnType = 'partial',
    dateStr = new Date().toLocaleString('ar-EG', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true
    }),
    branchName = 'مطعم البرادعي للحواوشي',
    cashierName = 'الكاشير',
    customerName = '',
    customerPhone = '',
    returnedItems = [],
    totalReturned = 0,
    reason = '',
  } = returnData;

  const returnTitle = returnType === 'full' ? 'إيصال مرتجع فاتورة بالكامل' : 'إيصال مرتجع أصناف (جزئي)';
  const cleanPhone = customerPhone ? String(customerPhone).trim() : '';
  const cleanName = customerName ? String(customerName).trim() : '';

  const itemsHtml = (returnedItems || []).map((item, idx) => {
    let itemName = String(item.name || item.product_name || 'صنف').trim();
    const itemSize = item.size ? `(${item.size})` : '';
    const itemPrice = parseFloat(item.price || 0).toFixed(0);
    const qty = parseInt(item.quantity) || 1;
    const itemTotal = (parseFloat(item.price || 0) * qty).toFixed(0);

    return `
      <tr style="border-bottom: ${idx < returnedItems.length - 1 ? '1px dashed #999' : '1.5px solid #000'};">
        <td style="padding: 2px 1px; font-weight: 800; text-align: right; font-size: 10px; color: #000;">
          ${itemName} ${itemSize ? `<span style="font-size: 9px;">${itemSize}</span>` : ''}
        </td>
        <td style="padding: 2px 1px; font-weight: 900; text-align: center; font-size: 11px; color: #000;">${qty}</td>
        <td style="padding: 2px 1px; font-weight: 700; text-align: center; font-size: 10px; color: #000;">${itemPrice}</td>
        <td style="padding: 2px 1px; font-weight: 900; text-align: center; font-size: 11px; color: #000;">${itemTotal}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>إيصال مرتجع #${orderNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&display=swap');
        @page { size: 80mm auto; margin: 0mm !important; }
        @media print {
          @page { size: 80mm auto; margin: 0mm !important; }
          html, body { width: 100% !important; margin: 0 !important; padding: 0 1.5mm !important; background: #FFF !important; color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        * { box-sizing: border-box !important; margin: 0; padding: 0; }
        html, body { font-family: 'Cairo', sans-serif; width: 100%; color: #000; background: #FFF; direction: rtl; }
        .wrapper { padding: 1mm 0; }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .title-box { border: 1.5px solid #000; background: #F3F4F6; padding: 3px 4px; font-size: 11.5px; font-weight: 900; margin: 2px 0; text-align: center; border-radius: 4px; }
        .refund-box { border: 2px double #000; background: #FFF; padding: 4px 6px; font-size: 12px; font-weight: 900; margin: 3px 0; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 2px 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="center bold" style="font-size: 14px;">مطعم البرادعي للحواوشي</div>
        <div class="center" style="font-size: 9.5px;">${branchName}</div>
        
        <div class="title-box">
          🔄 ${returnTitle}<br>
          <span style="font-size: 10.5px;">طلب رقم: #${orderNumber}</span>
        </div>

        <table style="font-size: 10px; font-weight: 700;">
          <tr>
            <td>تاريخ المرتجع: ${dateStr}</td>
            <td style="text-align: left;">الكاشير: ${cashierName}</td>
          </tr>
          ${cleanName ? `<tr><td colspan="2">العميل: ${cleanName} ${cleanPhone ? `(${cleanPhone})` : ''}</td></tr>` : ''}
        </table>

        <div style="border-bottom: 1px solid #000; margin: 2px 0;"></div>

        <div class="bold" style="font-size: 10px; margin-bottom: 2px;">📋 الأصناف المرتجعة:</div>
        <table>
          <thead>
            <tr style="border-bottom: 1.5px solid #000; font-size: 10px; font-weight: 900;">
              <th style="text-align: right;">الصنف</th>
              <th style="text-align: center;">العدد</th>
              <th style="text-align: center;">السعر</th>
              <th style="text-align: center;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="refund-box">
          💰 خصم من النقدية / مرتجع:<br>
          <span style="font-size: 16px; font-weight: 900;">${parseFloat(totalReturned).toFixed(2)} ج.م</span>
        </div>

        ${reason ? `
          <div style="font-size: 9.5px; font-weight: 800; border: 1px dashed #000; padding: 2px 4px; margin-top: 2px; border-radius: 4px;">
            📝 سبب الإرجاع: ${reason}
          </div>
        ` : ''}

        <div style="margin-top: 4px; font-size: 9px; text-align: center; font-weight: 700;">
          توقيع الكاشير: ........................<br>
          شكراً لتفهمكم | مطعم البرادعي
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

// Dedicated Ultra-Compact 80mm Thermal Driver Custody Receipt
export function printDriverCustodyReceipt(custodyData) {
  if (!custodyData) return;

  const {
    driverName = 'كافة الطيارين',
    branchName = 'الفرع الرئيسي',
    orders = [],
    totalOrdersSubtotal = 0,
    totalDeliveryFeesSum = 0,
    grandTotalSum = 0,
    filterStatus = 'all',
    dateStr = new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
  } = custodyData;

  const rowsHtml = (orders || []).map((o, idx) => {
    const orderNum = o.order_number || o.orderNumber || idx + 1;
    const custName = o.customer_name || o.customerName || 'عميل';
    const custAddress = o.customer_address || o.customerAddress || o.address || 'غير محدد';
    const tot = parseFloat(o.total || 0);
    const fee = parseFloat(o.delivery_fee || o.deliveryFee || 0);
    const sub = parseFloat(o.subtotal || 0) || Math.max(0, tot - fee);

    return `
      <tr style="border-bottom: 1px solid #000; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB'};">
        <td style="padding: 4px 2px; font-weight: 900; text-align: center; font-size: 9.5px; border-left: 1px solid #000;">${idx + 1}</td>
        <td style="padding: 4px 2px; font-weight: 900; text-align: center; font-size: 9.5px; border-left: 1px solid #000;">#${orderNum}</td>
        <td style="padding: 4px 3px; font-weight: 800; text-align: right; font-size: 9px; border-left: 1px solid #000; word-break: break-word;">${custName}</td>
        <td style="padding: 4px 3px; font-weight: 700; text-align: right; font-size: 8.5px; border-left: 1px solid #000; word-break: break-word; line-height: 1.3;">${custAddress}</td>
        <td style="padding: 4px 2px; font-weight: 800; text-align: center; font-size: 9px; border-left: 1px solid #000;">${sub.toFixed(0)}</td>
        <td style="padding: 4px 2px; font-weight: 800; text-align: center; font-size: 9px; border-left: 1px solid #000;">+${fee.toFixed(0)}</td>
        <td style="padding: 4px 2px; font-weight: 900; text-align: center; font-size: 9.5px;">${tot.toFixed(0)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>كشف عهدة - ${driverName}</title>
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
            padding: 0 1mm !important;
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
        .center { text-align: center; }
        .brand-name {
          font-size: 16px;
          font-weight: 900;
          color: #000;
        }
        .report-badge {
          display: inline-block;
          font-size: 12px;
          font-weight: 900;
          border: 1.5px solid #000;
          padding: 2px 8px;
          border-radius: 4px;
          margin: 3px 0;
          background: #000;
          color: #FFF;
        }
        .meta-text {
          font-size: 9.5px;
          font-weight: 800;
          color: #111;
          line-height: 1.4;
        }
        .double-sep {
          border-bottom: 2px double #000;
          margin: 4px 0;
        }
        .dashed-sep {
          border-bottom: 1px dashed #000;
          margin: 4px 0;
        }

        /* Unified Single Table Box */
        .orders-box {
          border: 1.5px solid #000;
          border-radius: 4px;
          overflow: hidden;
          margin: 5px 0;
        }
        .orders-table {
          width: 100%;
          border-collapse: collapse;
        }
        .orders-table th {
          background-color: #000;
          color: #FFF;
          font-size: 9.5px;
          font-weight: 900;
          padding: 4px 2px;
          text-align: center;
          border-left: 1px solid #444;
        }
        .orders-table th:last-child {
          border-left: none;
        }

        /* Unified Totals Box Directly Below Table */
        .totals-box {
          border: 2px solid #000;
          border-radius: 4px;
          padding: 6px;
          background-color: #F8FAFC;
          margin-top: 5px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 2px;
        }
        .grand-total-row {
          border-top: 1.5px solid #000;
          padding-top: 4px;
          margin-top: 4px;
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 900;
          background: #000;
          color: #FFF;
          padding: 4px 6px;
          border-radius: 3px;
        }
        .signatures {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          text-align: center;
          padding-bottom: 14mm;
        }
        .sign-title {
          font-size: 9px;
          font-weight: 800;
        }
        .sign-line {
          margin-top: 22px;
          border-top: 1px dashed #000;
          width: 75px;
        }
      </style>
    </head>
    <body>
      <div class="center">
        <div class="brand-name">مطعم البرادعي</div>
        <div class="report-badge">🛵 كشف عهدة وتسليمات طيار</div>
        <div class="meta-text">الطيار: <strong>${driverName}</strong> | الفرع: ${branchName}</div>
        <div class="meta-text">تاريخ الطباعة: ${dateStr}</div>
        <div class="meta-text">عدد الطلبات بالكشف: <strong>${orders.length} طلب</strong></div>
      </div>

      <div class="double-sep"></div>

      <!-- SINGLE CONCISE ORDERS BOX -->
      <div class="orders-box">
        <table class="orders-table">
          <thead>
            <tr>
              <th style="width: 7%;">#</th>
              <th style="width: 14%;">الطلب</th>
              <th style="width: 22%; text-align: right; padding-right: 4px;">العميل</th>
              <th style="width: 28%; text-align: right; padding-right: 4px;">العنوان</th>
              <th style="width: 9%;">صافي</th>
              <th style="width: 9%;">خدمة</th>
              <th style="width: 11%;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- TOTALS BOX DIRECTLY UNDER ORDERS -->
      <div class="totals-box">
        <div class="total-row">
          <span>عدد الأوردرات:</span>
          <span>${orders.length} طلب</span>
        </div>
        <div class="total-row">
          <span>إجمالي قيمة الأوردرات (صافي):</span>
          <span>${totalOrdersSubtotal.toLocaleString()} ج.م</span>
        </div>
        <div class="total-row">
          <span>إجمالي خدمة الدليفري:</span>
          <span>+${totalDeliveryFeesSum.toLocaleString()} ج.م</span>
        </div>
        <div class="grand-total-row">
          <span>الإجمالي الكلي للعهدة:</span>
          <span>${grandTotalSum.toLocaleString()} ج.م</span>
        </div>
      </div>

      <!-- SIGNATURES -->
      <div class="signatures">
        <div>
          <div class="sign-title">توقيع الطيار المستلم</div>
          <div class="sign-line"></div>
        </div>
        <div>
          <div class="sign-title">توقيع الكاشير / الإدارة</div>
          <div class="sign-line"></div>
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



