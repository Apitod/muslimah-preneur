(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MUSLIMAH_DIK_CUTOFF = new Date('2026-11-30T23:59:59+08:00').getTime();

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function normalizePhone(v) { return v.replace(/[^\d]/g, ''); }

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
          throw new Error(body.error || 'Pendaftaran gagal disimpan.');
        }
        return body;
      });
    });
  }

  function showThanks(overlay, done) {
    if (!overlay) { done(); return; }
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    var short = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hold = short ? 450 : 1800;
    var fade = short ? 40 : 350;
    setTimeout(function () {
      overlay.classList.remove('show');
      setTimeout(function () { overlay.hidden = true; done(); }, fade);
    }, hold);
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

  function validate() {
    var ok = true;
    if (val('nama').length < 2) { setErr('nama', 'Nama lengkap wajib diisi.'); ok = false; }
    var phone = normalizePhone(val('whatsapp'));
    if (!/^[0-9]{9,15}$/.test(phone)) { setErr('whatsapp', 'Nomor WhatsApp tidak valid.'); ok = false; }
    if (!val('kategori')) {
      setErr('kategori', 'Pilih kategori peserta.'); ok = false;
    } else if (val('kategori') === 'Muslimah DIK' && !val('aminah_ke')) {
      setErr('aminah_ke', 'Aaminah wajib diisi.'); ok = false;
    }
    var email = val('email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('email', 'Format email tidak valid.'); ok = false; }
    if (val('kategori') && !val('nominal_transfer')) { setErr('nominal_transfer', 'Nominal transfer belum terisi.'); ok = false; }
    return ok;
  }

  function loadImg(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  function hexPath(ctx, cx, cy, r) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var angle = Math.PI / 3 * i + Math.PI / 6;
      var px = cx + r * Math.cos(angle);
      var py = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawPattern(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = '#56582C';
    ctx.globalAlpha = 0.06;
    ctx.lineWidth = 1.2;
    var r = 30;
    var step = r * 1.75;
    var row = 0;
    for (var y = -step; y < height + step; y += step * 0.86, row++) {
      var offset = (row % 2) ? step / 2 : 0;
      for (var x = -step; x < width + step; x += step) {
        hexPath(ctx, x + offset, y, r);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function dashedLine(ctx, x1, y1, x2, y2) {
    ctx.save();
    ctx.strokeStyle = 'rgba(74,21,33,.28)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function fitFont(ctx, text, maxWidth, startSize, tmpl, minSize) {
    var size = startSize;
    minSize = minSize || 18;
    while (size > minSize) {
      ctx.font = tmpl.replace('{s}', size);
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    ctx.font = tmpl.replace('{s}', size);
    return size;
  }

  async function makeTicket(data, code) {
    if (document.fonts && document.fonts.load) {
      try {
        await Promise.all([
          document.fonts.load('400 82px "Playfair Display"'),
          document.fonts.load('italic 26px Lora'),
          document.fonts.load('600 32px Lora'),
          document.fonts.load('700 38px Lora')
        ]);
      } catch (err) {}
    }
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (err) {}
    }

    var W = 1080, H = 1400, M = 52;
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#EFEDE3';
    ctx.fillRect(0, 0, W, H);
    drawPattern(ctx, W, H);

    ctx.strokeStyle = 'rgba(74,21,33,.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(M, M, W - M * 2, H - M * 2);

    ctx.fillStyle = '#4A1521';
    ctx.fillRect(M, M, W - M * 2, 250);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#EBD6B7';
    ctx.font = '600 34px Lora, Georgia, serif';
    ctx.fillText('TIKET PESERTA', W / 2, M + 82);

    ctx.strokeStyle = 'rgba(235,214,183,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, M + 130);
    ctx.lineTo(W / 2 + 60, M + 130);
    ctx.stroke();

    ctx.fillStyle = '#EBD6B7';
    ctx.font = '15px Lora, Georgia, serif';
    ctx.fillText('MQ AAMINAH  ×  DAARUL ILMIL KARIMI', W / 2, M + 176);

    var logo = await loadImg('assets/logo.webp');
    var lw = 330;
    var lh = lw * logo.height / logo.width;
    var logoY = M + 250 + 54;
    ctx.drawImage(logo, (W - lw) / 2, logoY, lw, lh);

    var y = logoY + lh;

    ctx.fillStyle = '#4A1521';
    ctx.font = '400 82px "Playfair Display", Georgia, serif';
    ctx.fillText('Muslimah Preneur', W / 2, y + 92);

    ctx.fillStyle = '#56582C';
    ctx.font = 'italic 26px Lora, Georgia, serif';
    ctx.fillText('Think Beyond, Empowering Self, Enriching Ummah', W / 2, y + 138);

    dashedLine(ctx, W / 2 - 380, y + 196, W / 2 + 380, y + 196);

    ctx.fillStyle = '#6E6857';
    ctx.font = '600 19px Lora, Georgia, serif';
    ctx.fillText('NAMA PESERTA', W / 2, y + 262);

    ctx.fillStyle = '#4A1521';
    fitFont(ctx, data.nama, 880, 56, '400 {s}px "Playfair Display", Georgia, serif', 28);
    ctx.fillText(data.nama, W / 2, y + 326);

    dashedLine(ctx, W / 2 - 380, y + 374, W / 2 + 380, y + 374);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#6E6857';
    ctx.font = '600 20px Lora, Georgia, serif';
    ctx.fillText('NO. TIKET', 140, y + 430);
    ctx.fillText('KATEGORI', 620, y + 430);

    ctx.fillStyle = '#4A1521';
    ctx.font = '700 50px Lora, Georgia, serif';
    ctx.fillText(code, 140, y + 484);

    var kategoriDisplay = data.kategori + (data.aminah ? ' · ' + data.aminah : '');
    fitFont(ctx, kategoriDisplay, 360, 40, '600 {s}px "Playfair Display", Georgia, serif', 18);
    ctx.fillStyle = '#4A1521';
    ctx.fillText(kategoriDisplay, 620, y + 482);

    dashedLine(ctx, W / 2 - 380, y + 526, W / 2 + 380, y + 526);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#6E6857';
    ctx.font = '600 17px Lora, Georgia, serif';
    ctx.fillText('TANGGAL', W / 2, y + 582);

    ctx.fillStyle = '#4A1521';
    ctx.font = '400 42px "Playfair Display", Georgia, serif';
    ctx.fillText("Jum'at, 25 Desember 2026", W / 2, y + 634);

    ctx.fillStyle = '#6E6857';
    ctx.font = '600 17px Lora, Georgia, serif';
    ctx.fillText('LOKASI', W / 2, y + 686);

    ctx.fillStyle = '#4A1521';
    fitFont(ctx, 'Max Ballroom · Hotel Maxone Makassar', 900, 32, '400 {s}px "Playfair Display", Georgia, serif', 20);
    ctx.fillText('Max Ballroom · Hotel Maxone Makassar', W / 2, y + 730);

    ctx.fillStyle = '#4A1521';
    ctx.fillRect(M, H - M - 108, W - M * 2, 108);

    ctx.fillStyle = '#EBD6B7';
    ctx.font = '600 21px Lora, Georgia, serif';
    ctx.fillText('Tunjukkan tiket ini saat registrasi ulang di lokasi acara', W / 2, H - M - 60);

    ctx.fillStyle = 'rgba(235,214,183,.68)';
    ctx.font = 'italic 18px Lora, Georgia, serif';
    ctx.fillText('MQ Aaminah × Daarul Ilmil Karimi · 2026', W / 2, H - M - 26);

    return canvas.toDataURL('image/png');
  }

  function initForm() {
    var form = document.getElementById('hadirForm');
    if (!form) return;

    var ticketZone = document.getElementById('ticketZone');
    var ticketImg = document.getElementById('ticketImg');
    var downloadBtn = document.getElementById('downloadBtn');
    var submitBtn = document.getElementById('submitBtn');
    var formStatus = document.getElementById('formStatus');
    var thanksOverlay = document.getElementById('thanksOverlay');
    var resetBtn = document.getElementById('resetBtn');
    var daftarIntro = document.getElementById('daftarIntro');
    var kategoriEl = document.getElementById('kategori');
    var aminahField = document.getElementById('aminahField');
    var aminahInput = document.getElementById('aminah_ke');
    var nominalInput = document.getElementById('nominal_transfer');
    var dikClosedNote = document.getElementById('dikClosedNote');

    function toggleAminah() {
      if (!aminahField) return;
      var show = !!(kategoriEl && kategoriEl.value === 'Muslimah DIK');
      aminahField.hidden = !show;
      if (!show) {
        if (aminahInput) aminahInput.value = '';
        clearErr('aminah_ke');
      }
    }

    function syncNominal() {
      if (!nominalInput) return;
      var kategori = kategoriEl ? kategoriEl.value : '';
      if (kategori === 'Muslimah DIK') nominalInput.value = '175.000';
      else if (kategori === 'Umum') nominalInput.value = '200.000';
      else nominalInput.value = '';
    }

    if (kategoriEl) {
      kategoriEl.addEventListener('change', function () {
        toggleAminah();
        syncNominal();
      });
      toggleAminah();
      syncNominal();
    }

    if (Date.now() > MUSLIMAH_DIK_CUTOFF) {
      var dikOpt = kategoriEl ? kategoriEl.querySelector('option[value="Muslimah DIK"]') : null;
      if (dikOpt) dikOpt.disabled = true;
      if (kategoriEl && kategoriEl.value === 'Muslimah DIK') kategoriEl.value = 'Umum';
      if (dikClosedNote) dikClosedNote.hidden = false;
      toggleAminah();
      syncNominal();
    }

    $$('input, select', form).forEach(function (el) {
      el.addEventListener('input', function () { clearErr(el.id); });
      el.addEventListener('change', function () { clearErr(el.id); });
    });

    var buktiInput = document.getElementById('bukti_transfer');
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

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      clearAll();
      setStatus(formStatus, '', '');

      if (!validate()) {
        var first = $('.err.show', form);
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      var fileInput = document.getElementById('bukti_transfer');
      var file = (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0] : null;
      var data = {
        type: 'peserta',
        nama: val('nama'),
        whatsapp: normalizePhone(val('whatsapp')),
        kategori: val('kategori'),
        aminah: val('aminah_ke'),
        email: val('email'),
        nominal_transfer: val('nominal_transfer'),
        attachment_path: '',
        attachment_name: ''
      };
      var original = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Menyimpan pendaftaran...';

      try {
        if (file) {
          setStatus(formStatus, 'Mengunggah bukti transfer...', 'info');
          var attachment = await uploadAttachment(file, 'peserta');
          data.attachment_path = attachment.path;
          data.attachment_name = attachment.name;
        }
        setStatus(formStatus, 'Menyimpan data pendaftaran...', 'info');
        var result = await postRegistration(data);
        if (!result.ticketNo) throw new Error('Nomor tiket tidak diterima dari server.');
        var ticketNo = String(result.ticketNo).padStart(3, '0');
        var dataURL = await makeTicket(data, ticketNo);

        ticketImg.src = dataURL;
        downloadBtn.href = dataURL;
        downloadBtn.setAttribute('download', 'Tiket-MuslimahPreneur-' + ticketNo + '.png');
        setStatus(formStatus, '', '');
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
        showThanks(thanksOverlay, function () {
          if (daftarIntro) daftarIntro.hidden = true;
          form.hidden = true;
          ticketZone.hidden = false;
          ticketZone.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } catch (err) {
        console.error(err);
        var msg = err && err.message ? err.message : 'Pendaftaran gagal disimpan. Silakan coba lagi.';
        if (/fetch|network/i.test(msg)) msg = 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.';
        setStatus(formStatus, msg, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        form.reset();
        clearAll();
        toggleAminah();
        syncNominal();
        setStatus(formStatus, '', '');
        if (thanksOverlay) { thanksOverlay.hidden = true; thanksOverlay.classList.remove('show'); }
        ticketImg.removeAttribute('src');
        ticketZone.hidden = true;
        form.hidden = false;
        submitBtn.disabled = false;
        if (daftarIntro) daftarIntro.hidden = false;
        var section = document.getElementById('registrasi');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
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
