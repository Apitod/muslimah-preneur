const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const BUCKET = 'bukti-transfer';
const EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf'
};

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

  const type = body.type;
  if (type !== 'peserta' && type !== 'sponsor') {
    return send(res, 400, { ok: false, error: 'Tipe pendaftaran tidak valid.' });
  }

  const contentType = String(body.contentType || '').toLowerCase();
  const ext = EXT[contentType];
  if (!ext) {
    return send(res, 400, { ok: false, error: 'Format file harus JPG, PNG, atau PDF.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return send(res, 503, { ok: false, error: 'Backend Supabase belum dikonfigurasi.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const path = type + '/' + randomUUID() + '.' + ext;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error) {
    return send(res, 502, { ok: false, error: 'Gagal menyiapkan upload lampiran.' });
  }

  return send(res, 200, {
    ok: true,
    path: data.path || path,
    token: data.token,
    signedUrl: data.signedUrl
  });
};
