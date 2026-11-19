(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var info = {
    earlyBirdRemaining: 200,
    regularRemaining: 300,
    earlyBirdPrice: 175000,
    regularPrice: 200000,
    codeRemaining: 0,
    codeActive: false,
    closed: false
  };
  var codeState = { checked: false, valid: false, discount: 0 };
  var currentTotal = 0;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function normalizePhone(v) {
    var digits = String(v || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.indexOf('0062') === 0) digits = digits.slice(2);
    if (digits.indexOf('620') === 0) digits = '62' + digits.slice(3);
    if (digits.charAt(0) === '0') digits = '62' + digits.slice(1);
    else if (digits.indexOf('62') !== 0 && digits.charAt(0) === '8') digits = '62' + digits;
    return digits;
  }
  function formatRp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }

  function getSupabase() {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !window.supabase) return null;
    if (/YOUR-PROJECT/i.test(window.SUPABASE_URL) || /YOUR-ANON-KEY/i.test(window.SUPABASE_ANON_KEY)) return null;
    if (!window.__sbClient) {
      window.__sbClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    return window.__sbClient;
  }

  async function uploadAttachment(file, type) {
    if (!file) return { path: '', name: '' };
    var sb = getSupabase();
    if (!sb) throw new Error('Upload lampiran belum dikonfigurasi.');
    var res = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type, filename: file.name, contentType: file.type })
    });
    var body = await res.json().catch(function () { return {}; });
    if (!res.ok || !body.ok) throw new Error(body.error || 'Gagal menyiapkan upload lampiran.');
    var up = await sb.storage.from('bukti-transfer').uploadToSignedUrl(body.path, body.token, file, { contentType: file.type });
    if (up.error) throw new Error(up.error.message || 'Upload lampiran gagal.');
    return { path: body.path, name: file.name };
  }

  function setStatus(el, message, type) {
    if (!el) return;
    el.textContent = message || '';
    el.className = 'form-status' + (message ? ' show ' + (type || 'error') : '');
  }

  function postRegistration(data) {
    return fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok || !body.ok) {
          var err = new Error(body.error || 'Pendaftaran gagal disimpan.');
          err.pricing = body.pricing || null;
          throw err;
        }
        return body;
      });
    });
  }

  function initProgress() {
    var bar = document.getElementById('progressBar');
    if (!bar) return;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? Math.min(window.scrollY / max, 1) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function initReveal() {
    var els = $$('[data-reveal],[data-stagger]');
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function initRail() {
    var rail = document.getElementById('storyRail');
    if (!rail) return;
    var links = $$('a', rail);
    var sections = links.map(function (a) { return document.getElementById(a.getAttribute('data-target')); });
    function update() {
      var marker = window.scrollY + window.innerHeight * 0.4;
      var current = 0;
      sections.forEach(function (section, i) {
        if (section && section.offsetTop <= marker) current = i;
      });
      links.forEach(function (a, i) { a.classList.toggle('active', i === current); });
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function setErr(id, msg) {
    var input = document.getElementById(id);
    var err = document.getElementById(id + '-error');
    if (input) input.classList.add('error');
    if (err) { err.textContent = msg; err.classList.add('show'); }
  }

  function clearErr(id) {
    var input = document.getElementById(id);
    var err = document.getElementById(id + '-error');
    if (input) input.classList.remove('error');
    if (err) { err.textContent = ''; err.classList.remove('show'); }
  }

  function clearAll() {
    $$('.err').forEach(function (el) { el.textContent = ''; el.classList.remove('show'); });
    $$('.field input, .field select').forEach(function (el) { el.classList.remove('error'); });
  }

  function initCopyRek() {
    var btn = document.getElementById('copyRek');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText('2137416261').then(function () {
        btn.textContent = '✓ Disalin!';
        setTimeout(function () { btn.textContent = 'Salin Nomor'; }, 2000);
      });
    });
  }

  function initForm() {
    var form = document.getElementById('hadirForm');
    if (!form) return;

    var submitBtn = document.getElementById('submitBtn');
    var formStatus = document.getElementById('formStatus');
    var resetBtn = document.getElementById('resetBtn');
    var daftarIntro = document.getElementById('daftarIntro');
    var successPanel = document.getElementById('regSuccess');
    var successOrderNo = document.getElementById('successOrderNo');
    var kategoriEl = document.getElementById('kategori');
    var aminahField = document.getElementById('aminahField');
    var aminahInput = document.getElementById('aminah_ke');
    var codeField = document.getElementById('codeField');
    var codeInput = document.getElementById('kode_diskon');
    var codeHint = document.getElementById('codeHint');
    var qtyField = document.getElementById('qtyField');
    var qtyInput = document.getElementById('jumlah_tiket');
    var totalEl = document.getElementById('totalTransfer');
    var priceDetail = document.getElementById('priceDetail');
    var quotaDetail = document.getElementById('quotaDetail');
    var buktiInput = document.getElementById('bukti_transfer');

    function quantity() {
      var n = parseInt(qtyInput && qtyInput.value, 10);
      if (!Number.isFinite(n)) n = 1;
      n = Math.max(1, Math.min(5, n));
      if (qtyInput) qtyInput.value = String(n);
      return n;
    }

    function syncVisibility() {
      var kategori = kategoriEl ? kategoriEl.value : '';
      var isAminah = kategori === 'MQ Aaminah';
      var isBulk = kategori === 'Selain MQ. Aaminah/DIK';
      if (aminahField) aminahField.hidden = !isAminah;
      if (codeField) codeField.hidden = !isAminah;
      if (qtyField) qtyField.hidden = !isBulk;
      if (!isAminah) {
        if (aminahInput) aminahInput.value = '';
        if (codeInput) codeInput.value = '';
        codeState = { checked: false, valid: false, discount: 0 };
        clearErr('aminah_ke');
        clearErr('kode_diskon');
      }
      if (!isBulk) {
        if (qtyInput) qtyInput.value = '1';
        clearErr('jumlah_tiket');
      }
      syncPricing();
    }

    function syncPricing() {
      var kategori = kategoriEl ? kategoriEl.value : '';
      if (!kategori) {
        currentTotal = 0;
        if (totalEl) totalEl.textContent = 'Rp 0';
        if (priceDetail) priceDetail.textContent = 'Pilih kategori untuk melihat harga.';
        if (quotaDetail) quotaDetail.textContent = '';
        return;
      }
      var qty = kategori === 'MQ Aaminah' ? 1 : quantity();
      var earlyAvailable = Math.max(0, Number(info.earlyBirdRemaining) || 0);
      var regularAvailable = Math.max(0, Number(info.regularRemaining) || 0);
      var earlyQty = Math.min(qty, earlyAvailable);
      var regularQty = qty - earlyQty;
      var total = earlyQty * info.earlyBirdPrice + regularQty * info.regularPrice;
      var discount = 0;
      if (kategori === 'MQ Aaminah' && codeState.checked && codeState.valid && earlyQty > 0) {
        discount = codeState.discount || 25000;
        total -= discount;
      }
      currentTotal = Math.max(0, total);
      if (totalEl) totalEl.textContent = formatRp(currentTotal);
      var bits = [];
      if (earlyQty > 0) bits.push('Early bird ' + earlyQty + ' × ' + formatRp(info.earlyBirdPrice));
      if (regularQty > 0) bits.push('Regular ' + regularQty + ' × ' + formatRp(info.regularPrice));
      if (discount > 0) bits.push('Potongan kode −' + formatRp(discount));
      if (priceDetail) priceDetail.textContent = bits.length ? bits.join(' · ') : 'Harga belum tersedia.';
      var qbits = [];
      qbits.push('Sisa kuota early bird: ' + earlyAvailable + ' tiket');
      qbits.push('regular: ' + regularAvailable + ' tiket');
      if (regularQty > regularAvailable) qbits.push('Kuota tidak mencukupi untuk jumlah ini.');
      if (quotaDetail) quotaDetail.textContent = qbits.join(' · ');
    }

    async function fetchInfo() {
      try {
        var res = await fetch('/api/registration-info', { cache: 'no-store' });
        var body = await res.json();
        if (res.ok && body.ok && body.info) info = body.info;
      } catch (err) {
        // Defaults keep the form usable if the info endpoint is temporarily unavailable.
      }
      if (info.closed) {
        setStatus(formStatus, 'Pendaftaran sudah ditutup.', 'error');
        if (submitBtn) submitBtn.disabled = true;
      }
      syncPricing();
    }

    async function checkCode() {
      var code = codeInput ? codeInput.value.trim() : '';
      if (!code) {
        codeState = { checked: true, valid: false, discount: 0 };
        if (codeHint) codeHint.textContent = 'Kode hanya berlaku untuk MQ Aaminah selama kuota early bird tersedia.';
        clearErr('kode_diskon');
        syncPricing();
        return false;
      }
      if (codeHint) codeHint.textContent = 'Memeriksa kode…';
      try {
        var res = await fetch('/api/check-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code })
        });
        var body = await res.json().catch(function () { return {}; });
        if (!res.ok || !body.ok) throw new Error(body.error || 'Gagal memeriksa kode.');
        codeState = { checked: true, valid: !!body.valid, discount: Number(body.discount) || 0 };
        if (body.valid) {
          if (codeHint) codeHint.textContent = 'Kode valid · potongan ' + formatRp(codeState.discount) + ' · sisa ' + body.remaining + ' penggunaan.';
          clearErr('kode_diskon');
        } else {
          if (codeHint) codeHint.textContent = 'Kode tidak valid atau kuota kode sudah habis.';
          setErr('kode_diskon', 'Kode diskon tidak valid atau sudah habis.');
        }
      } catch (err) {
        codeState = { checked: true, valid: false, discount: 0 };
        if (codeHint) codeHint.textContent = 'Gagal memeriksa kode. Coba lagi.';
        setErr('kode_diskon', err.message || 'Gagal memeriksa kode.');
      }
      syncPricing();
      return codeState.valid;
    }

    function validate() {
      var ok = true;
      if (val('nama').length < 2) { setErr('nama', 'Nama lengkap wajib diisi.'); ok = false; }
      var phone = normalizePhone(val('whatsapp'));
      if (!/^62[0-9]{8,13}$/.test(phone)) { setErr('whatsapp', 'Nomor WhatsApp tidak valid. Gunakan 08..., 62..., atau +62...'); ok = false; }
      var kategori = val('kategori');
      if (!kategori) {
        setErr('kategori', 'Pilih kategori peserta.'); ok = false;
      } else if (kategori === 'MQ Aaminah' && !val('aminah_ke')) {
        setErr('aminah_ke', 'Aaminah wajib diisi.'); ok = false;
      }
      if (kategori === 'Selain MQ. Aaminah/DIK') {
        var q = quantity();
        if (q < 1 || q > 5) { setErr('jumlah_tiket', 'Jumlah tiket harus 1 sampai 5.'); ok = false; }
      }
      var file = buktiInput && buktiInput.files && buktiInput.files[0];
      if (!file) { setErr('bukti_transfer', 'Bukti transfer wajib diunggah.'); ok = false; }
      if (kategori === 'MQ Aaminah' && codeInput && codeInput.value.trim() && !codeState.valid) {
        setErr('kode_diskon', 'Kode diskon belum valid. Periksa kembali atau kosongkan.'); ok = false;
      }
      return ok;
    }

    if (kategoriEl) {
      kategoriEl.addEventListener('change', syncVisibility);
    }
    if (qtyInput) {
      qtyInput.addEventListener('input', syncPricing);
      qtyInput.addEventListener('change', syncPricing);
    }
    if (codeInput) {
      codeInput.addEventListener('blur', checkCode);
      codeInput.addEventListener('input', function () {
        codeState = { checked: false, valid: false, discount: 0 };
        clearErr('kode_diskon');
        syncPricing();
      });
    }

    $$('input, select', form).forEach(function (el) {
      el.addEventListener('input', function () { clearErr(el.id); });
      el.addEventListener('change', function () { clearErr(el.id); });
    });

    if (buktiInput) {
      buktiInput.addEventListener('change', function () {
        var file = buktiInput.files && buktiInput.files[0];
        if (file && file.size > 5 * 1024 * 1024) {
          setStatus(formStatus, 'Ukuran bukti transfer maksimal 5 MB.', 'error');
          buktiInput.value = '';
        } else {
          setStatus(formStatus, '', '');
        }
      });
    }

    var waInput = document.getElementById('whatsapp');
    if (waInput) {
      waInput.addEventListener('blur', function () {
        var normalized = normalizePhone(waInput.value);
        if (normalized && normalized.indexOf('62') === 0) waInput.value = '+' + normalized;
      });
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      clearAll();
      setStatus(formStatus, '', '');

      if (info.closed) {
        setStatus(formStatus, 'Pendaftaran sudah ditutup.', 'error');
        return;
      }

      if (kategoriEl && kategoriEl.value === 'MQ Aaminah' && codeInput && codeInput.value.trim() && !codeState.checked) {
        await checkCode();
      }
      if (!validate()) {
        var first = $('.err.show', form);
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      var kategori = val('kategori');
      var qty = kategori === 'MQ Aaminah' ? 1 : quantity();
      var file = buktiInput && buktiInput.files && buktiInput.files[0] ? buktiInput.files[0] : null;
      var data = {
        type: 'peserta',
        nama: val('nama'),
        whatsapp: normalizePhone(val('whatsapp')),
        kategori: kategori,
        aminah: val('aminah_ke'),
        quantity: qty,
        code: kategori === 'MQ Aaminah' ? val('kode_diskon') : '',
        expected_total: currentTotal,
        attachment_path: '',
        attachment_name: ''
      };
      var original = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan pendaftaran...';

      try {
        setStatus(formStatus, 'Mengunggah bukti transfer...', 'info');
        var attachment = await uploadAttachment(file, 'peserta');
        data.attachment_path = attachment.path;
        data.attachment_name = attachment.name;
        setStatus(formStatus, 'Menyimpan data pendaftaran...', 'info');
        var result = await postRegistration(data);
        if (!result.orderNo) throw new Error('Nomor order tidak diterima dari server.');

        if (successOrderNo) successOrderNo.textContent = result.orderNo;
        setStatus(formStatus, '', '');
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
        if (daftarIntro) daftarIntro.hidden = true;
        form.hidden = true;
        if (successPanel) {
          successPanel.hidden = false;
          successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (err) {
        console.error(err);
        if (err.pricing) {
          if (typeof err.pricing.earlyBirdRemaining === 'number') info.earlyBirdRemaining = err.pricing.earlyBirdRemaining;
          if (typeof err.pricing.regularRemaining === 'number') info.regularRemaining = err.pricing.regularRemaining;
          syncPricing();
        }
        var msg = err && err.message ? err.message : 'Pendaftaran gagal disimpan. Silakan coba lagi.';
        if (/fetch|network/i.test(msg)) msg = 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.';
        if (err.pricing) msg += ' Silakan unggah ulang bukti transfer dengan nominal terbaru.';
        if (buktiInput) buktiInput.value = '';
        setStatus(formStatus, msg, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        form.reset();
        clearAll();
        codeState = { checked: false, valid: false, discount: 0 };
        if (successPanel) successPanel.hidden = true;
        form.hidden = false;
        if (daftarIntro) daftarIntro.hidden = false;
        setStatus(formStatus, '', '');
        submitBtn.disabled = false;
        syncVisibility();
        fetchInfo();
        var section = document.getElementById('registrasi');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    syncVisibility();
    fetchInfo();
  }

  function boot() {
    initProgress();
    initReveal();
    initRail();
    initCopyRek();
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
