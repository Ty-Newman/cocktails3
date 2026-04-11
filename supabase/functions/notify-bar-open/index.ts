import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SetBarOpenResult = {
  ok?: boolean;
  error?: string;
  was_open?: boolean;
  is_open?: boolean;
  should_notify_email?: boolean;
};

type RecipientRow = { email: string; user_id: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'Missing authorization' });
  }

  let body: { bar_id?: string; is_open?: boolean };
  try {
    body = (await req.json()) as { bar_id?: string; is_open?: boolean };
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON' });
  }

  const barId = typeof body.bar_id === 'string' ? body.bar_id.trim() : '';
  if (!barId) {
    return jsonResponse(400, { error: 'bar_id required' });
  }
  if (typeof body.is_open !== 'boolean') {
    return jsonResponse(400, { error: 'is_open boolean required' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail =
    Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';
  const appUrl = (Deno.env.get('PUBLIC_APP_URL') ?? '').replace(/\/$/, '');

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('Missing Supabase env');
    return jsonResponse(500, { error: 'Server misconfigured' });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: rpcData, error: rpcError } = await userClient.rpc('set_bar_open', {
    p_bar_id: barId,
    p_is_open: body.is_open,
  });

  if (rpcError) {
    console.error('set_bar_open', rpcError);
    return jsonResponse(500, { error: rpcError.message });
  }

  const result = rpcData as SetBarOpenResult;
  if (!result?.ok) {
    const status = result?.error === 'forbidden' ? 403 : result?.error === 'not_authenticated' ? 401 : 400;
    return jsonResponse(status, { error: result?.error ?? 'rpc_failed', details: result });
  }

  let emailsSent = 0;
  if (result.should_notify_email === true) {
    if (!resendKey) {
      console.warn('RESEND_API_KEY not set; skipping emails');
    } else {
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: recipients, error: recErr } = await admin.rpc('get_bar_open_email_recipients', {
        p_bar_id: barId,
      });

      if (recErr) {
        console.error('get_bar_open_email_recipients', recErr);
        return jsonResponse(200, {
          ...result,
          emails_sent: 0,
          email_error: recErr.message,
        });
      }

      const { data: barRow } = await admin.from('bars').select('name, slug').eq('id', barId).single();
      const barName = barRow?.name ?? 'A bar';
      const barSlug = barRow?.slug ?? '';
      const link =
        appUrl && barSlug ? `${appUrl}/${encodeURIComponent(barSlug)}` : appUrl || '';

      const rows = (recipients ?? []) as RecipientRow[];
      for (const row of rows) {
        const to = row.email?.trim();
        if (!to) continue;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [to],
            subject: `${barName} is open`,
            html: barOpenEmailHtml({ barName, link }),
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error('Resend error', res.status, errText);
          continue;
        }
        emailsSent += 1;
      }
    }
  }

  return jsonResponse(200, { ...result, emails_sent: emailsSent });
});

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function barOpenEmailHtml(opts: { barName: string; link: string }) {
  const { barName, link } = opts;
  const pLink = link
    ? `<p><a href="${escapeHtml(link)}">Open the menu</a></p>`
    : '';
  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5;">
  <p><strong>${escapeHtml(barName)}</strong> is open.</p>
  ${pLink}
  <p style="color:#666;font-size:14px;">You’re receiving this because you’re a member of this bar and bar-open emails are enabled in your profile settings.</p>
</body>
</html>`.trim();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
