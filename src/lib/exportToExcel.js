// Utility to export tabular data to UTF-8 CSV / Excel compatible file
export function exportToExcel(filename, columns, data) {
  if (!data || !data.length) {
    alert('لا توجد بيانات متاحة للتصدير');
    return;
  }

  // UTF-8 BOM for Arabic text support in Microsoft Excel
  let csvContent = '\uFEFF';

  // Header row
  const headers = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
  csvContent += headers + '\r\n';

  // Data rows
  data.forEach(row => {
    const rowContent = columns.map(c => {
      let val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      if (val === undefined || val === null) val = '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',');
    csvContent += rowContent + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
