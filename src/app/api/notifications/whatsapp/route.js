import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, message, orderData, driverPhone } = body;

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    // Load WhatsApp settings from DB
    const settingsRes = await query('SELECT key, value FROM app_settings WHERE key LIKE $1', ['whatsapp_%']);
    const settings = {};
    (settingsRes.rows || []).forEach(row => {
      settings[row.key] = row.value;
    });

    const isEnabled = settings.whatsapp_enabled !== 'false';
    const mode = settings.whatsapp_mode || 'api';
    let provider = settings.whatsapp_provider || 'greenapi';
    const instanceId = settings.whatsapp_instance_id || '';
    const token = settings.whatsapp_token || '';
    const apiUrl = settings.whatsapp_api_url || '';

    // Auto-detect Green API if instanceId starts with 7107 or is numeric, unless provider is explicitly specified as ultramsg
    if (!settings.whatsapp_provider && instanceId && (instanceId.startsWith('7107') || instanceId.length >= 10)) {
      provider = 'greenapi';
    }

    if (!isEnabled) {
      return NextResponse.json({ sentViaApi: false, reason: 'WhatsApp auto-sending disabled in settings' });
    }

    // If mode is 'api' and credentials are provided, send via API Gateway
    if (mode === 'api' && (instanceId || apiUrl)) {
      if (provider === 'ultramsg' && instanceId && token) {
        let cleanDigits = phone.replace(/\D/g, '');
        if (cleanDigits.startsWith('01') && cleanDigits.length === 11) cleanDigits = '2' + cleanDigits;

        const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
        const params = new URLSearchParams();
        params.append('token', token);
        params.append('to', cleanDigits);
        params.append('body', message);

        console.log(`📡 Sending UltraMsg to ${cleanDigits} via ${url}`);

        const apiResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });

        const resData = await apiResponse.json();
        console.log('✅ UltraMsg Result:', resData);

        if (apiResponse.ok && (resData.sent === 'true' || resData.sent === true || resData.id || !resData.error)) {
          return NextResponse.json({ sentViaApi: true, provider: 'ultramsg', result: resData });
        } else {
          return NextResponse.json({ sentViaApi: false, error: resData.error || resData.message || 'UltraMsg Error', result: resData }, { status: 400 });
        }
      } else if (provider === 'greenapi' || (instanceId && token)) {
        const cleanId = (instanceId || '7103131720').trim();
        const cleanToken = (token || 'ef5cc1024bd3415db99710f63901b0fbbd0a3dcf19c44dd3aa').trim();

        let rawDigits = phone.replace(/\D/g, '');
        if (rawDigits.startsWith('01') && rawDigits.length === 11) rawDigits = '2' + rawDigits;
        let chatId = rawDigits.endsWith('@c.us') ? rawDigits : `${rawDigits}@c.us`;

        const targetUrl = `https://api.green-api.com/waInstance${cleanId}/sendMessage/${cleanToken}`;

        console.log(`📡 Sending Green-API message to ${chatId} via ${targetUrl}`);

        const apiResponse = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, message })
        });

        const resData = await apiResponse.json();
        console.log('✅ Green-API Result:', resData);

        if (apiResponse.ok && (resData.idMessage || resData.id)) {
          return NextResponse.json({ sentViaApi: true, provider: 'greenapi', result: resData });
        } else {
          return NextResponse.json({ sentViaApi: false, error: resData.message || resData.error || 'Green-API error', result: resData }, { status: 400 });
        }
      } else if (provider === 'webhook' && apiUrl) {
        const apiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message, orderData, driverPhone })
        });

        if (apiResponse.ok) {
          const resData = await apiResponse.json();
          return NextResponse.json({ sentViaApi: true, provider: 'webhook', result: resData });
        }
      }
    }

    // Fallback: API not configured or mode is browser
    return NextResponse.json({ sentViaApi: false, mode: 'browser', message: 'API credentials not configured, user will send via browser/direct link' });

  } catch (error) {
    console.error('❌ Error in WhatsApp notification API:', error);
    return NextResponse.json({ error: error.message, sentViaApi: false }, { status: 500 });
  }
}
