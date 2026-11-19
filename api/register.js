const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'bukti-transfer';
const MAX_FIELD = 500;
const PACKAGES = {
  platinum: { label: 'Platinum', price: 5000000 },
  gold: { label: 'Gold', price: 3000000 },
  silver: { label: 'Silver', price: 2500000 },
  reguler: { label: 'Reguler', price: 500000 }
};

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

function normalizeWhatsApp(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.indexOf('0062') === 0) digits = digits.slice(2);
  if (digits.indexOf('620') === 0) digits = '62' + digits.slice(3);
  if (digits.charAt(0) === '0') digits = '62' + digits.slice(1);
  else if (digits.indexOf('62') !== 0 && digits.charAt(0) === '8') digits = '62' + digits;
  return digits;
}

function validWhatsApp(value) {
  return /^62[0-9]{8,13}$/.test(value);
}

function validAttachment(path, type) {
  if (!path) return true;
  return new RegExp('^' + type + '/[a-z0-9-]+\\.[a-z0-9]+$', 'i').test(path);
}

function normalizePackage(value) {
  const key = clean(value, 100).toLowerCase();
  if (key.includes('platinum')) return PACKAGES.platinum;
  if (key.includes('gold')) return PACKAGES.gold;
  if (key.includes('silver')) return PACKAGES.silver;
  if (key.includes('reguler') || key.includes('regular')) return PACKAGES.reguler;
  return null;
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
    const whatsapp = normalizeWhatsApp(clean(body.whatsapp, 30));
    const kategori = clean(body.kategori, 100);
    const aaminah = clean(body.aminah, 100);
    const quantity = Number(body.quantity || 1);
    const code = clean(body.code, 50).toUpperCase();
    const expectedTotal = toAmount(body.expected_total);
    const attachmentPath = clean(body.attachment_path, 500);
    const attachmentName = clean(body.attachment_name, 255);

    if (!nama || !whatsapp || !kategori) {
      return send(res, 400, { ok: false, error: 'Data peserta belum lengkap.' });
    }
    if (!validWhatsApp(whatsapp)) {
      return send(res, 400, { ok: false, error: 'Nomor WhatsApp tidak valid. Gunakan 08..., 62..., atau +62...' });
    }
    if (!['MQ Aaminah', 'Selain MQ. Aaminah/DIK'].includes(kategori)) {
      return send(res, 400, { ok: false, error: 'Kategori peserta tidak valid.' });
    }
    if (kategori === 'MQ Aaminah' && !aaminah) {
      return send(res, 400, { ok: false, error: 'Aaminah wajib diisi.' });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
      return send(res, 400, { ok: false, error: 'Jumlah tiket harus 1 sampai 5.' });
    }
    if (kategori === 'MQ Aaminah' && quantity !== 1) {
      return send(res, 400, { ok: false, error: 'Kategori MQ Aaminah hanya 1 tiket per order.' });
    }
    if (!attachmentPath || !validAttachment(attachmentPath, 'peserta')) {
      return send(res, 400, { ok: false, error: 'Bukti transfer wajib diunggah.' });
    }

    const { data, error } = await supabase.rpc('create_participant_order', {
      payload: {
        name: nama,
        whatsapp: whatsapp,
        category: kategori,
        aaminah: kategori === 'MQ Aaminah' ? aaminah : '',
        quantity: quantity,
        code: kategori === 'MQ Aaminah' ? code : '',
        expected_total: expectedTotal || null,
        attachment_path: attachmentPath,
        attachment_name: attachmentName
      }
    });

    if (error) {
      await supabase.storage.from(BUCKET).remove([attachmentPath]);
      return send(res, 502, { ok: false, error: 'Gagal menyimpan pendaftaran.' });
    }
    if (!data || data.ok !== true) {
      await supabase.storage.from(BUCKET).remove([attachmentPath]);
      return send(res, 409, {
        ok: false,
        error: (data && data.error) || 'Pendaftaran gagal disimpan.',
        pricing: data && data.pricing ? data.pricing : null
      });
    }

    return send(res, 200, {
      ok: true,
      orderNo: data.orderNo,
      total: data.total,
      earlyBirdQty: data.earlyBirdQty,
      regularQty: data.regularQty,
      discountAmount: data.discountAmount,
      status: data.status
    });
  }

  if (type === 'sponsor') {
    const pkg = normalizePackage(body.paket);
    const company = clean(body.nama_perusahaan, 200);
    const businessField = clean(body.bidang_usaha, 200);
    const address = clean(body.alamat);
    const picName = clean(body.nama_pic, 200);
    const position = clean(body.jabatan, 100);
    const whatsapp = normalizeWhatsApp(clean(body.no_wa, 30));
    const email = clean(body.email, 200);
    const transferName = clean(body.nama_transfer, 200);
    const amount = toAmount(body.jumlah_transfer);
    const attachmentPath = clean(body.attachment_path, 500);
    const attachmentName = clean(body.attachment_name, 255);

    if (!pkg || !company || !businessField || !picName || !whatsapp || !transferName) {
      return send(res, 400, { ok: false, error: 'Data sponsor belum lengkap.' });
    }
    if (!validWhatsApp(whatsapp)) {
      return send(res, 400, { ok: false, error: 'Nomor WhatsApp tidak valid. Gunakan 08..., 62..., atau +62...' });
    }
    if (email && !isEmail(email)) {
      return send(res, 400, { ok: false, error: 'Format email tidak valid.' });
    }
    if (!attachmentPath || !validAttachment(attachmentPath, 'sponsor')) {
      return send(res, 400, { ok: false, error: 'Bukti transfer wajib diunggah.' });
    }
    if (amount && amount !== pkg.price) {
      return send(res, 400, { ok: false, error: 'Jumlah transfer harus Rp ' + pkg.price.toLocaleString('id-ID') + '.' });
    }

    const { data, error } = await supabase
      .from('sponsors')
      .insert({
        package: pkg.label,
        company: company,
        business_field: businessField,
        address: address || null,
        pic_name: picName,
        position: position || null,
        whatsapp: whatsapp,
        email: email || null,
        transfer_name: transferName,
        amount: pkg.price,
        attachment_path: attachmentPath,
        attachment_name: attachmentName || null,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      await supabase.storage.from(BUCKET).remove([attachmentPath]);
      return send(res, 502, { ok: false, error: 'Gagal menyimpan pendaftaran.' });
    }

    return send(res, 200, { ok: true, sponsorId: data.id, status: 'pending' });
  }

  return send(res, 400, { ok: false, error: 'Tipe pendaftaran tidak valid.' });
};
