import { exportToExcel } from './exportToExcel';
import { formatWhatsAppPhone } from './whatsapp';

/**
 * Export Customers List to UTF-8 Excel (.csv) file with full details
 */
export function exportCustomersToExcel(customers = []) {
  if (!customers || customers.length === 0) {
    alert('لا يوجد عملاء متاحين للتصدير');
    return;
  }

  const columns = [
    { label: 'اسم العميل', accessor: row => row.name || 'عميل' },
    { label: 'رقم الهاتف', accessor: row => row.phone || '' },
    { label: 'العنوان الرئيسي', accessor: row => row.address || (row.addresses && row.addresses[0]?.address) || '' },
    { label: 'الدور', accessor: row => row.floor || (row.addresses && row.addresses[0]?.floor) || '' },
    { label: 'الشقة', accessor: row => row.apartment || (row.addresses && row.addresses[0]?.apartment) || '' },
    { 
      label: 'كافة العناوين المحفوظة', 
      accessor: row => (row.addresses || [])
        .map(a => `${a.address}${a.floor ? ` (د ${a.floor}` : ''}${a.apartment ? ` ش ${a.apartment})` : a.floor ? ')' : ''}`)
        .filter(Boolean)
        .join(' | ') 
    },
    { label: 'عدد الطلبات', accessor: row => row.totalTransactions || row.ordersCount || 0 },
    { label: 'إجمالي الإنفاق (ج.م)', accessor: row => row.totalSpend || 0 },
  ];

  exportToExcel('داتا_عملاء_مطعم_البرادعي', columns, customers);
}

/**
 * Export Customers List to VCF (vCard 3.0) contacts file compatible with iPhone (iOS) & Android
 */
export function exportCustomersToVCF(customers = []) {
  if (!customers || customers.length === 0) {
    alert('لا يوجد عملاء متاحين لتجهيز ملف جهات الاتصال');
    return;
  }

  let vcfContent = '';

  customers.forEach(c => {
    if (!c.phone) return;
    
    const cleanPhone = formatWhatsAppPhone(c.phone) || String(c.phone).replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('2') ? '+' + cleanPhone : cleanPhone;
    
    const name = c.name ? c.name.trim() : 'عميل البرادعي';
    const mainAddress = (c.address || (c.addresses && c.addresses[0]?.address) || '').replace(/[\r\n;,]/g, ' ');
    const ordersCount = c.totalTransactions || c.ordersCount || 0;
    const totalSpend = c.totalSpend || 0;

    vcfContent += 'BEGIN:VCARD\r\n';
    vcfContent += 'VERSION:3.0\r\n';
    vcfContent += `FN:البرادعي - ${name}\r\n`;
    vcfContent += `N:;${name};البرادعي;;;\r\n`;
    vcfContent += `TEL;TYPE=CELL,VOICE:${formattedPhone}\r\n`;
    if (mainAddress) {
      vcfContent += `ADR;TYPE=HOME:;;${mainAddress};;;;\r\n`;
    }
    vcfContent += `NOTE:مطعم البرادعي للحواوشي - عدد الطلبات: ${ordersCount} - الإجمالي: ${totalSpend} ج.م\r\n`;
    vcfContent += 'END:VCARD\r\n';
  });

  const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `جهات_اتصال_العملاء_${new Date().toISOString().slice(0,10)}.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
