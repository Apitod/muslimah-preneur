const { createClient } = require('@supabase/supabase-js');

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const token = String((req.query && req.query.token) || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return send(res, 400, { ok: false, error: 'Token invoice tidak valid.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return send(res, 503, { ok: false, error: 'Backend Supabase belum dikonfigurasi.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await supabase.rpc('get_invoice_by_token', { p_token: token });
  if (error) {
    return send(res, 404, { ok: false, status: 'not_found' });
  }
  if (!data || data.ok !== true) {
    return send(res, 404, { ok: false, status: (data && data.status) || 'not_found' });
  }

  return send(res, 200, data);
};
