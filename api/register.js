const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'bukti-transfer';
const MUSLIMAH_DIK_CUTOFF = new Date('2026-11-30T23:59:59+08:00').getTime();
const MAX_FIELD = 500;

function clean(value, max) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max || MAX_FIELD);
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function toAmount(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validAttachment(path, type) {
  if (!path) return true;
  return new RegExp('^' + type + '/[a-z0-9-]+\\.[a-z0-9]+$', 'i').test(path);
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return send(res, 503, { ok: false, error: 'Backend Supabase belum dikonfigurasi.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const type = body.type;

  if (type === 'peserta') {
    const nama = clean(body.nama);
    const whatsapp = clean(body.whatsapp, 30).replace(/[^\d+]/g, '');
    const kategori = clean(body.kategori, 100);
    const aaminah = clean(body.aminah, 100);
    const email = clean(body.email, 200);
    let nominal = 0;
    if (kategori === 'Muslimah DIK') nominal = 175000;
    else if (kategori === 'Umum') nominal = 200000;
    const attachmentPath = clean(body.attachment_path, 500);
    const attachmentName = clean(body.attachment_name, 255);

    if (!nama || !whatsapp || !kategori) {
      return send(res, 400, { ok: false, error: 'Data peserta belum lengkap.' });
    }
    if (!nominal) {
      return send(res, 400, { ok: false, error: 'Kategori peserta tidak valid.' });
    }
    if (kategori === 'Muslimah DIK' && Date.now() > MUSLIMAH_DIK_CUTOFF) {
      return send(res, 400, { ok: false, error: 'Pendaftaran Muslimah DIK sudah ditutup.' });
    }
    if (kategori === 'Muslimah DIK' && !aaminah) {
      return send(res, 400, { ok: false, error: 'Aaminah wajib diisi.' });
    }
    if (email && !isEmail(email)) {
      return send(res, 400, { ok: false, error: 'Format email tidak valid.' });
    }
    if (!validAttachment(attachmentPath, 'peserta')) {
      return send(res, 400, { ok: false, error: 'Lampiran tidak valid.' });
    }

    const { data, error } = await supabase
      .from('participants')
      .insert({
        name: nama,
        whatsapp: whatsapp,
        category: kategori,
        aaminah: aaminah || null,
        email: email || null,
        nominal_transfer: nominal,
        attachment_path: attachmentPath || null,
        attachment_name: attachmentName || null
      })
      .select('ticket_no')
      .single();

    if (error) {
      if (attachmentPath) {
        await supabase.storage.from(BUCKET).remove([attachmentPath]);
      }
      return send(res, 502, { ok: false, error: 'Gagal menyimpan pendaftaran.' });
    }

    return send(res, 200, { ok: true, ticketNo: data.ticket_no });
  }

  if (type === 'sponsor') {
    const paket = clean(body.paket, 100);
    const company = clean(body.nama_perusahaan, 200);
    const businessField = clean(body.bidang_usaha, 200);
    const address = clean(body.alamat);
    const picName = clean(body.nama_pic, 200);
    const position = clean(body.jabatan, 100);
    const whatsapp = clean(body.no_wa, 30).replace(/[^\d+]/g, '');
    const email = clean(body.email, 200);
    const transferName = clean(body.nama_transfer, 200);
    const amount = toAmount(body.jumlah_transfer);
    const attachmentPath = clean(body.attachment_path, 500);
    const attachmentName = clean(body.attachment_name, 255);

    if (!paket || !company || !businessField || !picName || !whatsapp || !transferName || amount <= 0) {
      return send(res, 400, { ok: false, error: 'Data sponsor belum lengkap.' });
    }
    if (email && !isEmail(email)) {
      return send(res, 400, { ok: false, error: 'Format email tidak valid.' });
    }
    if (!validAttachment(attachmentPath, 'sponsor')) {
      return send(res, 400, { ok: false, error: 'Lampiran tidak valid.' });
    }

    const { data, error } = await supabase
      .from('sponsors')
      .insert({
        package: paket,
        company: company,
        business_field: businessField,
        address: address || null,
        pic_name: picName,
        position: position || null,
        whatsapp: whatsapp,
        email: email || null,
        transfer_name: transferName,
        amount: amount,
        attachment_path: attachmentPath || null,
        attachment_name: attachmentName || null
      })
      .select('invoice_no')
      .single();

    if (error) {
      if (attachmentPath) {
        await supabase.storage.from(BUCKET).remove([attachmentPath]);
      }
      return send(res, 502, { ok: false, error: 'Gagal menyimpan pendaftaran.' });
    }

    return send(res, 200, { ok: true, invoiceNo: data.invoice_no });
  }

  return send(res, 400, { ok: false, error: 'Tipe pendaftaran tidak valid.' });
};
