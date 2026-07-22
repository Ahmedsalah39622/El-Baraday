export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0 ج.م';
  return `${Number(amount).toFixed(2)} ج.م`;
};

export const formatDate = (date) => {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatTime = (date) => {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (date) => {
  const d = date ? new Date(date) : new Date();
  return `${formatDate(d)} ${formatTime(d)}`;
};

export const generateInvoiceNumber = () => {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0');
  const timeStr = now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `INV-${dateStr}-${timeStr}${random}`;
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};
