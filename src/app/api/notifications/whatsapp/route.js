import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, message, orderData, driverPhone, isTest } = body;

    if (!phone || !message) {
      return NextResponse.json({ error: 'رقم الهاتف ونصف الرسالة مطلوبان' }, { status: 400 });
    }

    // Format phone number into international digits
    let rawDigits = String(phone).replace(/\D/g, '');
    if (rawDigits.startsWith('00')) {
      rawDigits = rawDigits.substring(2);
    }
    if (rawDigits.startsWith('01') && rawDigits.length === 11) {
      rawDigits = '2' + rawDigits;
    } else if (rawDigits.startsWith('1') && rawDigits.length === 10) {
      rawDigits = '20' + rawDigits;
    }

    // Load WhatsApp settings from DB
    const settingsRes = await query("SELECT `key`, `value` FROM app_settings WHERE `key` LIKE 'whatsapp_%'");
    const settings = {};
    (settingsRes.rows || []).forEach(row => {
      settings[row.key] = row.value;
    });

    const isEnabled = settings.whatsapp_enabled !== 'false';
    const mode = isTest ? 'api' : (settings.whatsapp_mode || 'api');
    let provider = settings.whatsapp_provider || 'greenapi';
    const instanceId = (settings.whatsapp_instance_id || '').trim();
    const token = (settings.whatsapp_token || '').trim();
    const apiUrl = (settings.whatsapp_api_url || '').trim();

    if (!isEnabled && !isTest) {
      return NextResponse.json({ sentViaApi: false, reason: 'إرسال رسائل الواتساب الأوتوماتيكية معطل من الإعدادات' });
    }

    // If mode is 'api', attempt sending via configured provider
    if (mode === 'api') {
      if (provider === 'ultramsg') {
        if (!instanceId || !token) {
          return NextResponse.json({ sentViaApi: false, error: 'بيانات UltraMsg (Instance ID و Token) غير مكتملة بالإعدادات' }, { status: 400 });
        }
        const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
        const params = new URLSearchParams();
        params.append('token', token);
        params.append('to', rawDigits);
        params.append('body', message);

        console.log(`📡 Sending UltraMsg to ${rawDigits} via ${url}`);

        const apiResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });

        const resData = await apiResponse.json().catch(() => ({}));
        console.log('✅ UltraMsg Result:', resData);

        if (apiResponse.ok && (resData.sent === 'true' || resData.sent === true || resData.id || !resData.error)) {
          return NextResponse.json({ sentViaApi: true, provider: 'ultramsg', result: resData });
        } else {
          return NextResponse.json({ 
            sentViaApi: false, 
            error: resData.error || resData.message || `خطأ في UltraMsg (رمز ${apiResponse.status})`, 
            result: resData 
          }, { status: 400 });
        }

      } else if (provider === 'greenapi') {
        const cleanId = instanceId || '7103131720';
        const cleanToken = token || 'ef5cc1024bd3415db99710f63901b0fbbd0a3dcf19c44dd3aa';

        const chatId = rawDigits.endsWith('@c.us') ? rawDigits : `${rawDigits}@c.us`;
        let targetHost = apiUrl ? apiUrl.trim().replace(/\/+$/, '') : (cleanId.length >= 4 ? `https://${cleanId.substring(0, 4)}.api.greenapi.com` : 'https://api.green-api.com');
        if (!targetHost.startsWith('http')) targetHost = `https://${targetHost}`;

        const targetUrl = `${targetHost}/waInstance${cleanId}/sendMessage/${cleanToken}`;

        console.log(`📡 Sending Green-API message to ${chatId} via ${targetUrl}`);

        const apiResponse = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, message })
        });

        let resData = {};
        try {
          resData = await apiResponse.json();
        } catch (e) {
          const rawText = await apiResponse.text().catch(() => '');
          resData = { rawText };
        }

        console.log('✅ Green-API Response Status:', apiResponse.status, resData);

        if (apiResponse.ok && (resData.idMessage || resData.id)) {
          return NextResponse.json({ sentViaApi: true, provider: 'greenapi', result: resData });
        } else {
          let errorMsg = resData.message || resData.error || resData.rawText;
          if (apiResponse.status === 401) {
            errorMsg = 'غير مصرح (401 Unauthorized): برجاء التأكد من صحة Instance ID و Token الخاص بحساب Green API في الإعدادات';
          } else if (apiResponse.status === 400) {
            errorMsg = 'طلب غير صالح (400 Bad Request): تأكد من صحة رقم الهاتف وبنية حساب Green API';
          } else if (!errorMsg) {
            errorMsg = `خطأ في Green API (كود ${apiResponse.status})`;
          }
          return NextResponse.json({ sentViaApi: false, error: errorMsg, status: apiResponse.status, result: resData }, { status: 400 });
        }

      } else if (provider === 'webhook' && apiUrl) {
        const apiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: rawDigits, message, orderData, driverPhone })
        });

        if (apiResponse.ok) {
          const resData = await apiResponse.json().catch(() => ({}));
          return NextResponse.json({ sentViaApi: true, provider: 'webhook', result: resData });
        } else {
          return NextResponse.json({ sentViaApi: false, error: `فشل الاتصال بالـ Webhook (${apiResponse.status})` }, { status: 400 });
        }
      }
    }

    // Fallback: API not configured or mode is browser
    return NextResponse.json({ sentViaApi: false, mode: 'browser', message: 'تم اختيار فتح الواتساب عبر المتصفح أو التطبيق المباشر' });

  } catch (error) {
    console.error('❌ Error in WhatsApp notification API:', error);
    return NextResponse.json({ error: error.message, sentViaApi: false }, { status: 500 });
  }
}

