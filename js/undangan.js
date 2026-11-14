(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function normalizePhone(v) { return v.replace(/[^\d]/g, ''); }

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
    if (!val('kategori')) { setErr('kategori', 'Pilih kategori peserta.'); ok = false; }
    var email = val('email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('email', 'Format email tidak valid.'); ok = false; }
    return ok;
  }

  function makeCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < 6; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'MP-' + out;
  }

  function buildWA(data, code) {
    var lines = [
      "Assalamu'alaikum, saya sudah mendownload file tiket.",
      '',
      'Nomor Tiket: ' + code,
      'Nama: ' + data.nama,
      'Kategori: ' + data.kategori,
      'No. WhatsApp: ' + data.whatsapp,
      'Acara: Muslimah Preneur Talk Show — 25 Desember 2026'
    ];
    if (data.email) lines.push('Email: ' + data.email);
    if (data.instansi) lines.push('Asal/Instansi: ' + data.instansi);
    if (data.domisili) lines.push('Domisili: ' + data.domisili);
    lines.push('', 'Terima kasih.');
    return 'https://wa.me/6285398687711?text=' + encodeURIComponent(lines.join('\n'));
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
    ctx.font = '600 32px Lora, Georgia, serif';
    ctx.fillText('TIKET PESERTA', W / 2, M + 66);

    ctx.fillStyle = 'rgba(235,214,183,.78)';
    ctx.font = 'italic 24px Lora, Georgia, serif';
    ctx.fillText('Muslimah Preneur Talk Show', W / 2, M + 108);

    ctx.strokeStyle = 'rgba(235,214,183,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, M + 136);
    ctx.lineTo(W / 2 + 60, M + 136);
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
    ctx.font = '600 17px Lora, Georgia, serif';
    ctx.fillText('KODE TIKET', 140, y + 430);
    ctx.fillText('KATEGORI', 620, y + 430);

    ctx.fillStyle = '#4A1521';
    ctx.font = '700 38px Lora, Georgia, serif';
    ctx.fillText(code, 140, y + 478);

    fitFont(ctx, data.kategori, 320, 30, '600 {s}px "Playfair Display", Georgia, serif', 18);
    ctx.fillStyle = '#4A1521';
    ctx.fillText(data.kategori, 620, y + 476);

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
    var waConfirm = document.getElementById('waConfirm');
    var submitBtn = document.getElementById('submitBtn');
    var resetBtn = document.getElementById('resetBtn');
    var daftarIntro = document.getElementById('daftarIntro');
    var ticketNote = document.getElementById('ticketNote');
    var defaultNote = ticketNote ? ticketNote.textContent : '';

    $$('input, select', form).forEach(function (el) {
      el.addEventListener('input', function () { clearErr(el.id); });
      el.addEventListener('change', function () { clearErr(el.id); });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearAll();

      if (!validate()) {
        var first = $('.err.show', form);
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      var data = {
        nama: val('nama'),
        whatsapp: normalizePhone(val('whatsapp')),
        kategori: val('kategori'),
        email: val('email'),
        instansi: val('instansi'),
        domisili: val('domisili')
      };
      var code = makeCode();
      var original = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Membuat tiket...';

      makeTicket(data, code).then(function (dataURL) {
        ticketImg.src = dataURL;
        downloadBtn.href = dataURL;
        downloadBtn.setAttribute('download', 'Tiket-MuslimahPreneur-' + code + '.png');
        waConfirm.href = buildWA(data, code);
        waConfirm.hidden = true;
        if (ticketNote) ticketNote.textContent = defaultNote;
        if (daftarIntro) daftarIntro.hidden = true;
        form.hidden = true;
        ticketZone.hidden = false;
        ticketZone.scrollIntoView({ behavior: 'smooth', block: 'start' });
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
      }).catch(function (err) {
        console.error(err);
        alert('Maaf, tiket gagal dibuat. Silakan coba lagi.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
      });
    });

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        if (waConfirm) waConfirm.hidden = false;
        if (ticketNote) ticketNote.textContent = 'Tiket berhasil diunduh. Silakan konfirmasi kehadiran Anda via WhatsApp.';
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        form.reset();
        clearAll();
        ticketImg.removeAttribute('src');
        ticketZone.hidden = true;
        form.hidden = false;
        submitBtn.disabled = false;
        if (waConfirm) waConfirm.hidden = true;
        if (ticketNote) ticketNote.textContent = defaultNote;
        if (daftarIntro) daftarIntro.hidden = false;
        document.getElementById('daftar').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function boot() {
    initProgress();
    initReveal();
    initRail();
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
