/**
 * WhatsApp & SMS Utility for El-Baraday POS System
 * مطعم البرادعي للحواوشي
 */

/**
 * Formats phone number into international format for WhatsApp (e.g., 01012345678 -> 201012345678)
 */
export function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, ''); // Remove non-digit characters
  
  // Egyptian local numbers starting with 01X (11 digits)
  if (clean.startsWith('01') && clean.length === 11) {
    clean = '2' + clean;
  } else if (clean.startsWith('1') && clean.length === 10) {
    clean = '20' + clean;
  }
  
  return clean;
}

/**
 * Generates formatted Arabic delivery notification text for WhatsApp
 */
export function generateDeliveryMessage(orderData = {}, driverPhone = '', companySettings = {}) {
  const companyName = companySettings.company_name || companySettings.companyName || 'مطعم البرادعي للحواوشي';
  const companyPhone = companySettings.company_phone || companySettings.phone || '';
  
  const orderNum = orderData.orderNumber || orderData.order_number || '---';
  const customerName = orderData.customerName || orderData.customer_name || 'عميلنا العزيز';
  const driverName = orderData.driverName || orderData.driver_name || 'طاقم التوصيل';
  
  const items = orderData.items || [];
  const subtotal = orderData.subtotal || 0;
  const deliveryFee = orderData.deliveryFee || orderData.delivery_fee || 0;
  const total = orderData.total || 0;
  
  // Address details
  const address = orderData.customerAddress || orderData.customer_address || '';
  const floor = orderData.customerFloor || orderData.customer_floor || '';
  const apartment = orderData.customerApartment || orderData.customer_apartment || '';
  
  let fullAddress = address;
  if (floor) fullAddress += ` - الدور: ${floor}`;
  if (apartment) fullAddress += ` - شقة: ${apartment}`;

  // Build Items breakdown text
  let itemsListText = '';
  if (items.length > 0) {
    itemsListText = items.map((item, idx) => {
      const name = item.product_name || item.name || 'صنف';
      const size = item.size ? ` (${item.size})` : '';
      const qty = item.quantity || 1;
      const price = (item.price || 0) * qty;
      return `${idx + 1}. ${name}${size} × ${qty} = ${price} ج.م`;
    }).join('\n');
  } else {
    itemsListText = 'تفاصيل الطلب مسجلة بالسيستم';
  }

  // Construct message
  let msg = `🍟 *${companyName}* 🍔\n`;
  msg += `أهلاً بك يا *${customerName}* 👋\n\n`;
  msg += `تم تنفيذ طلب الدليفري الخاص بك بنجاح! 🎉\n`;
  msg += `📌 *رقم الطلب:* #${orderNum}\n\n`;
  
  msg += `📋 *تفاصيل الطلب:*\n${itemsListText}\n`;
  msg += `─────────────────\n`;
  if (deliveryFee > 0) {
    msg += `🚚 *رسوم التوصيل:* ${deliveryFee} ج.م\n`;
  }
  msg += `💵 *الإجمالي المطلوب:* *${total} ج.م*\n\n`;

  msg += `🛵 *بيانات طيار التوصيل:*\n`;
  msg += `👤 *الطيار:* ${driverName}\n`;
  if (driverPhone) {
    msg += `📞 *رقم تليفون الطيار:* ${driverPhone}\n`;
  } else {
    msg += `📞 *تليفون المحل للتواصل:* ${companyPhone || 'من خلال خدمة العملاء'}\n`;
  }

  if (fullAddress) {
    msg += `\n📍 *عنوان التوصيل:* ${fullAddress}\n`;
  }

  msg += `\nنتمنى لك وجبة شهية! 😋❤️`;

  return msg;
}

/**
 * Trigger sending WhatsApp message:
 * 1. Tries automatic background API call if configured.
 * 2. Opens WhatsApp Web / Direct URL in new tab if chosen or fallback.
 */
export async function sendDeliveryWhatsApp({ orderData, driverPhone, companySettings = {}, autoOpenBrowser = true }) {
  const customerPhone = orderData.customerPhone || orderData.customer_phone;
  if (!customerPhone) {
    return { success: false, error: 'رقم هاتف العميل غير موجود' };
  }

  const cleanPhone = formatWhatsAppPhone(customerPhone);
  const messageText = generateDeliveryMessage(orderData, driverPhone, companySettings);

  // 1. Try sending via backend API Gateway (UltraMsg / GreenAPI / Webhook)
  try {
    const apiRes = await fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        message: messageText,
        orderData,
        driverPhone
      })
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.sentViaApi) {
        return { success: true, sentVia: 'api', provider: data.provider };
      }
    }
  } catch (err) {
    console.warn('⚠️ API Gateway send failed, falling back to direct link:', err.message);
  }

  // 2. Open Direct WhatsApp Web / Mobile URL if autoOpenBrowser is true
  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
  
  if (autoOpenBrowser && typeof window !== 'undefined') {
    window.open(waUrl, '_blank');
  }

  return { success: true, sentVia: 'browser', url: waUrl, message: messageText, phone: cleanPhone };
}
