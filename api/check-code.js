const { createClient } = require('@supabase/supabase-js');

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (err) {
      return send(res, 400, { ok: false, error: 'Body tidak valid.' });
    }
  }
  if (!body || typeof body !== 'object') {
    return send(res, 400, { ok: false, error: 'Body kosong.' });
  }

  const code = String(body.code || '').trim().slice(0, 50);
  if (!code) {
    return send(res, 200, { ok: true, valid: false, discount: 0, remaining: 0 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return send(res, 503, { ok: false, error: 'Backend Supabase belum dikonfigurasi.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await supabase.rpc('check_discount_code', { p_code: code });
  if (error) {
    return send(res, 502, { ok: false, error: 'Gagal memeriksa kode diskon.' });
  }

  return send(res, 200, {
    ok: true,
    valid: !!(data && data.valid),
    discount: Number(data && data.discount) || 0,
    remaining: Number(data && data.remaining) || 0
  });
};
