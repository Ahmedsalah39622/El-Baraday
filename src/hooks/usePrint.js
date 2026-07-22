'use client';

export default function usePrint() {
  const printInvoice = (invoice, companyInfo) => {
    if (!invoice || !companyInfo) return;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${invoice.id || ''}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          
          body {
            font-family: 'Cairo', sans-serif;
            margin: 0;
            padding: 0;
            width: 80mm;
            color: #000;
            background: #fff;
            font-size: 12px;
          }
          .receipt {
            padding: 10px;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .header h1 {
            margin: 0 0 5px 0;
            font-size: 18px;
            font-weight: 700;
          }
          .header p {
            margin: 2px 0;
            font-size: 12px;
          }
          .info {
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .items-table th {
            border-bottom: 1px solid #000;
            padding: 4px 0;
            text-align: right;
            font-weight: 600;
          }
          .items-table td {
            padding: 4px 0;
            text-align: right;
          }
          .items-table .center {
            text-align: center;
          }
          .items-table .left {
            text-align: left;
          }
          .totals {
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-bottom: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-weight: 600;
          }
          .total-row.grand {
            font-size: 16px;
            font-weight: 700;
            border-bottom: 1px dashed #000;
            padding-bottom: 5px;
            margin-bottom: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 11px;
          }
          @media print {
            body {
              width: 80mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h1>${companyInfo.name || 'البرادعى'}</h1>
            ${companyInfo.address ? `<p>${companyInfo.address}</p>` : ''}
            ${companyInfo.phone ? `<p>تليفون: ${companyInfo.phone}</p>` : ''}
          </div>
          
          <div class="info">
            <div class="info-row">
              <span>رقم الفاتورة:</span>
              <span>${invoice.invoiceNumber || invoice.id || ''}</span>
            </div>
            <div class="info-row">
              <span>التاريخ:</span>
              <span>${new Date(invoice.date || Date.now()).toLocaleString('ar-EG')}</span>
            </div>
            ${invoice.cashier ? `
            <div class="info-row">
              <span>الكاشير:</span>
              <span>${invoice.cashier}</span>
            </div>` : ''}
            ${invoice.customer ? `
            <div class="info-row">
              <span>العميل:</span>
              <span>${invoice.customer}</span>
            </div>` : ''}
            ${invoice.orderType ? `
            <div class="info-row">
              <span>نوع الطلب:</span>
              <span>${invoice.orderType}</span>
            </div>` : ''}
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th class="center">الكمية</th>
                <th class="left">السعر</th>
                <th class="left">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="center">${item.quantity}</td>
                  <td class="left">${(item.price || 0).toFixed(2)}</td>
                  <td class="left">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>الإجمالي الفرعي:</span>
              <span>${(invoice.subtotal || 0).toFixed(2)} ج.م</span>
            </div>
            ${invoice.discount > 0 ? `
            <div class="total-row">
              <span>الخصم:</span>
              <span>${(invoice.discount || 0).toFixed(2)} ج.م</span>
            </div>` : ''}
            ${invoice.tax > 0 ? `
            <div class="total-row">
              <span>الضريبة:</span>
              <span>${(invoice.tax || 0).toFixed(2)} ج.م</span>
            </div>` : ''}
            <div class="total-row grand">
              <span>الصافي:</span>
              <span>${(invoice.total || 0).toFixed(2)} ج.م</span>
            </div>
            <div class="total-row">
              <span>المدفوع (${invoice.paymentMethod || 'نقدي'}):</span>
              <span>${(invoice.paid || 0).toFixed(2)} ج.م</span>
            </div>
            ${invoice.change > 0 ? `
            <div class="total-row">
              <span>المتبقي:</span>
              <span>${(invoice.change || 0).toFixed(2)} ج.م</span>
            </div>` : ''}
          </div>

          <div class="footer">
            <p>شكراً لزيارتكم</p>
            <p>برمجة Novix Works</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
            // Fallback for browsers that don't support onafterprint
            setTimeout(function() {
              window.close();
            }, 10000);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return { printInvoice };
}
