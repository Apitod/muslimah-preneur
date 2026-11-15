/* ═══════════════════════════════════════
   MUSLIMAH PRENEUR — form.js
   Pendaftaran sponsor · WA delivery
═══════════════════════════════════════ */
(function () {
  'use strict';

  /* ── HELPERS ── */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  function formatRupiah(v) {
    var digits = String(v).replace(/[^\d]/g, '');
    if (!digits) return v;
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function setError(id, msg) {
    var input = document.getElementById(id);
    var err   = document.getElementById(id + '-error');
    if (input) input.classList.add('error');
    if (err)   { err.textContent = msg; err.classList.add('show'); }
    return false;
  }
  function clearError(id) {
    var input = document.getElementById(id);
    var err   = document.getElementById(id + '-error');
    if (input) input.classList.remove('error');
    if (err)   err.classList.remove('show');
  }

  /* ── FORM CARDS ANIMATE IN ── */
  function animateCards() {
    if (!window.IntersectionObserver) {
      $$('.form-card').forEach(function (c) { c.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    $$('.form-card').forEach(function (card, i) {
      card.style.setProperty('--delay', (i * 0.1) + 's');
      io.observe(card);
    });
  }

  /* ── TIER PICKER ── */
  function initTierPicker() {
    var opts = $$('.tier-opt');
    opts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        opts.forEach(function (o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        opt.querySelector('input[type=radio]').checked = true;
        clearError('paket');
        // ripple
        var r = document.createElement('span');
        r.style.cssText = 'position:absolute;border-radius:50%;background:rgba(235,214,183,.32);width:8px;height:8px;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);animation:ripple .5s ease both;pointer-events:none';
        opt.appendChild(r);
        setTimeout(function () { opt.removeChild(r); }, 600);
      });
      opt.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.click(); }
      });
    });
    // preselect from ?paket=platinum|gold|silver
    var want = new URLSearchParams(location.search).get('paket');
    if (want) {
      var hit = document.getElementById('opt-' + want.slice(0, 4));
      if (hit) hit.click();
    }
    // add ripple keyframes once
    if (!document.getElementById('ripple-style')) {
      var s = document.createElement('style');
      s.id = 'ripple-style';
      s.textContent = '@keyframes ripple{to{transform:translate(-50%,-50%) scale(16);opacity:0}}';
      document.head.appendChild(s);
    }
  }

  /* ── UPLOAD ZONE ── */
  function initUpload() {
    var zone    = document.getElementById('uploadZone');
    var input   = document.getElementById('bukti_transfer');
    var preview = document.getElementById('uploadPreview');
    var img     = document.getElementById('previewImg');
    var fname   = document.getElementById('uploadFilename');
    if (!zone || !input) return;

    function handleFile(file) {
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5 MB.');
        return;
      }
      fname.textContent = file.name;
      zone.classList.add('has-file');
      clearError('bukti_transfer');
      if (file.type.startsWith('image/')) {
        var reader = new FileReader();
        reader.onload = function (e) {
          img.src = e.target.result;
          img.style.display = 'block';
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        img.style.display = 'none';
        preview.style.display = 'block';
      }
    }

    input.addEventListener('change', function () { handleFile(input.files[0]); });

    // drag & drop
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault(); zone.classList.remove('drag-over');
      var file = e.dataTransfer.files[0];
      if (file) { input.files = e.dataTransfer.files; handleFile(file); }
    });
  }

  /* ── COPY REKENING ── */
  function initCopyRek() {
    var btn = document.getElementById('copyRek');
    if (!btn) return;
    btn.addEventListener('click', function () {
      navigator.clipboard && navigator.clipboard.writeText('2137416261').then(function () {
        btn.textContent = '✓ Disalin!';
        setTimeout(function () { btn.innerHTML = '📋 Salin Nomor'; }, 2000);
      });
    });
  }

  /* ── VALIDATE ── */
  function validate() {
    var ok = true;
    // paket
    if (!$('input[name="paket"]:checked')) {
      setError('paket', 'Pilih salah satu paket sponsorship.'); ok = false;
    }
    // required fields
    [
      { id: 'nama_perusahaan', msg: 'Wajib diisi.' },
      { id: 'bidang_usaha',   msg: 'Wajib diisi.' },
      { id: 'nama_pic',       msg: 'Wajib diisi.' },
      { id: 'no_wa',          msg: 'Wajib diisi.' },
      { id: 'nama_transfer',  msg: 'Wajib diisi.' },
      { id: 'jumlah_transfer',msg: 'Wajib diisi.' },
    ].forEach(function (f) {
      if (!val(f.id)) { setError(f.id, f.msg); ok = false; }
    });
    return ok;
  }

  /* ── BUILD WA MESSAGE ── */
  function buildWA(data, invoiceNo) {
    var lines = [
      "Assalamu'alaikum, saya sudah mendaftar sebagai sponsor Talk Show Muslimah Preneur.",
      '',
      'No. Invoice: ' + invoiceNo,
      'Perusahaan: ' + data.nama_perusahaan,
      'Bidang: ' + data.bidang_usaha,
      'Paket: ' + data.paket,
      'Jumlah Transfer: Rp ' + formatRupiah(data.jumlah_transfer),
      'PIC: ' + data.nama_pic,
      'No. WhatsApp: ' + data.no_wa
    ];
    if (data.email) lines.push('Email: ' + data.email);
    if (data.alamat) lines.push('Alamat: ' + data.alamat);
    if (data.nama_transfer) lines.push('Nama Pengirim: ' + data.nama_transfer);
    lines.push('', 'Mohon melampirkan struk dan bukti transfer berhasil.');
    lines.push('', 'Terima kasih.');
    return 'https://wa.me/6285398687711?text=' + encodeURIComponent(lines.join('\n'));
  }

  var invoiceFallback = 0;

  function nextInvoiceNo() {
    var n;
    try {
      var stored = parseInt(window.localStorage.getItem('mp_invoice_no') || '0', 10);
      n = (isNaN(stored) ? 0 : stored) + 1;
      window.localStorage.setItem('mp_invoice_no', String(n));
    } catch (err) {
      invoiceFallback += 1;
      n = invoiceFallback;
    }
    return 'INV-' + String(n).padStart(3, '0');
  }

  function todayID() {
    try {
      return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (err) {
      return new Date().toISOString().slice(0, 10);
    }
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

  async function makeInvoice(data, invoiceNo) {
    if (document.fonts && document.fonts.load) {
      try {
        await Promise.all([
          document.fonts.load('400 78px "Playfair Display"'),
          document.fonts.load('italic 24px Lora'),
          document.fonts.load('600 30px Lora'),
          document.fonts.load('700 36px Lora')
        ]);
      } catch (err) {}
    }
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (err) {}
    }

    var W = 1080, H = 1560, M = 52;
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
    ctx.fillRect(M, M, W - M * 2, 210);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#EBD6B7';
    ctx.font = '600 32px Lora, Georgia, serif';
    ctx.fillText('INVOICE SPONSORSHIP', W / 2, M + 66);

    ctx.fillStyle = 'rgba(235,214,183,.78)';
    ctx.font = 'italic 24px Lora, Georgia, serif';
    ctx.fillText('Muslimah Preneur Talk Show', W / 2, M + 106);

    ctx.strokeStyle = 'rgba(235,214,183,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, M + 132);
    ctx.lineTo(W / 2 + 60, M + 132);
    ctx.stroke();

    ctx.fillStyle = '#EBD6B7';
    ctx.font = '15px Lora, Georgia, serif';
    ctx.fillText('MQ AAMINAH  ×  DAARUL ILMIL KARIMI', W / 2, M + 170);

    var logo = await loadImg('assets/logo.webp');
    var lw = 300;
    var lh = lw * logo.height / logo.width;
    var logoY = M + 210 + 48;
    ctx.drawImage(logo, (W - lw) / 2, logoY, lw, lh);

    var y = logoY + lh;

    ctx.fillStyle = '#4A1521';
    ctx.font = '400 78px "Playfair Display", Georgia, serif';
    ctx.fillText('INVOICE', W / 2, y + 86);

    ctx.fillStyle = '#56582C';
    ctx.font = 'italic 24px Lora, Georgia, serif';
    ctx.fillText('Bukti Pendaftaran Sponsorship', W / 2, y + 128);

    dashedLine(ctx, W / 2 - 380, y + 174, W / 2 + 380, y + 174);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#6E6857';
    ctx.font = '600 17px Lora, Georgia, serif';
    ctx.fillText('NO. INVOICE', 140, y + 228);
    ctx.fillText('TANGGAL', 620, y + 228);

    ctx.fillStyle = '#4A1521';
    ctx.font = '700 36px Lora, Georgia, serif';
    ctx.fillText(invoiceNo, 140, y + 270);

    ctx.font = '600 26px Lora, Georgia, serif';
    ctx.fillText(todayID(), 620, y + 268);

    dashedLine(ctx, W / 2 - 380, y + 312, W / 2 + 380, y + 312);

    ctx.fillStyle = '#6E6857';
    ctx.font = '600 17px Lora, Georgia, serif';
    ctx.fillText('DITUJUKAN KEPADA', 140, y + 366);

    ctx.fillStyle = '#4A1521';
    fitFont(ctx, data.nama_perusahaan, 800, 44, '400 {s}px "Playfair Display", Georgia, serif', 24);
    ctx.fillText(data.nama_perusahaan, 140, y + 414);

    ctx.fillStyle = '#56582C';
    ctx.font = '600 26px Lora, Georgia, serif';
    ctx.fillText(data.nama_pic + (data.jabatan ? ' · ' + data.jabatan : ''), 140, y + 458);

    ctx.fillStyle = '#6E6857';
    var contact = data.no_wa + (data.email ? ' · ' + data.email : '');
    fitFont(ctx, contact, 800, 24, '400 {s}px Lora, Georgia, serif', 16);
    ctx.fillText(contact, 140, y + 496);

    dashedLine(ctx, W / 2 - 380, y + 540, W / 2 + 380, y + 540);

    ctx.fillStyle = '#6E6857';
    ctx.font = '600 17px Lora, Georgia, serif';
    ctx.fillText('PAKET SPONSORSHIP', 140, y + 594);

    ctx.fillStyle = '#4A1521';
    fitFont(ctx, data.paket, 800, 36, '600 {s}px "Playfair Display", Georgia, serif', 20);
    ctx.fillText(data.paket, 140, y + 638);

    ctx.fillStyle = '#56582C';
    ctx.font = '600 30px Lora, Georgia, serif';
    ctx.fillText('Nilai Transfer: Rp ' + formatRupiah(data.jumlah_transfer), 140, y + 684);

    dashedLine(ctx, W / 2 - 380, y + 728, W / 2 + 380, y + 728);

    ctx.fillStyle = '#6E6857';
    ctx.font = '600 17px Lora, Georgia, serif';
    ctx.fillText('PEMBAYARAN', 140, y + 782);

    ctx.fillStyle = '#4A1521';
    ctx.font = '600 27px Lora, Georgia, serif';
    ctx.fillText('Bank BNI · 2137416261 · a.n. Dian Purnamayanti', 140, y + 824);

    ctx.fillStyle = '#6E6857';
    ctx.font = '600 17px Lora, Georgia, serif';
    ctx.fillText('STATUS', 140, y + 878);

    ctx.fillStyle = '#8E9463';
    ctx.font = '700 28px Lora, Georgia, serif';
    ctx.fillText('MENUNGGU KONFIRMASI', 140, y + 916);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#6E6857';
    ctx.font = 'italic 21px Lora, Georgia, serif';
    ctx.fillText('Mohon lampirkan struk dan bukti transfer berhasil saat konfirmasi via WhatsApp.', W / 2, y + 976);

    ctx.fillStyle = '#4A1521';
    ctx.fillRect(M, H - M - 104, W - M * 2, 104);

    ctx.fillStyle = '#EBD6B7';
    ctx.font = '600 22px Lora, Georgia, serif';
    ctx.fillText('Terima kasih atas kemitraan Anda', W / 2, H - M - 58);

    ctx.fillStyle = 'rgba(235,214,183,.68)';
    ctx.font = 'italic 18px Lora, Georgia, serif';
    ctx.fillText('MQ Aaminah × Daarul Ilmil Karimi · 2026', W / 2, H - M - 24);

    return canvas.toDataURL('image/png');
  }

  /* ── SUBMIT ── */
  function initForm() {
    var form = document.getElementById('sponsorForm');
    var success = document.getElementById('successScreen');
    var submitBtn = document.getElementById('submitBtn');
    var invoiceImg = document.getElementById('invoiceImg');
    var invoiceDownload = document.getElementById('invoiceDownload');
    var waConfirm = document.getElementById('waConfirm');
    var invoiceNote = document.getElementById('invoiceNote');
    var defaultInvoiceNote = invoiceNote ? invoiceNote.textContent : '';
    if (!form) return;

    form.querySelectorAll('input, textarea, select').forEach(function (el) {
      el.addEventListener('input', function () { clearError(el.id); });
      el.addEventListener('change', function () { clearError(el.id); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      $$('.field-error').forEach(function (el) { el.classList.remove('show'); });
      $$('.field input,.field select,.field textarea').forEach(function (el) { el.classList.remove('error'); });

      if (!validate()) {
        var firstErr = form.querySelector('.error, .field-error.show');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      var paket = $('input[name="paket"]:checked');
      var data = {
        paket: paket ? paket.value : '',
        nama_perusahaan: val('nama_perusahaan'),
        bidang_usaha: val('bidang_usaha'),
        alamat: val('alamat'),
        nama_pic: val('nama_pic'),
        jabatan: val('jabatan'),
        no_wa: val('no_wa'),
        email: val('email'),
        nama_transfer: val('nama_transfer'),
        jumlah_transfer: val('jumlah_transfer')
      };
      var invoiceNo = nextInvoiceNo();
      var original = submitBtn.innerHTML;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Membuat invoice...';

      makeInvoice(data, invoiceNo).then(function (dataURL) {
        invoiceImg.src = dataURL;
        invoiceDownload.href = dataURL;
        invoiceDownload.setAttribute('download', 'Invoice-Sponsorship-' + invoiceNo + '.png');
        waConfirm.href = buildWA(data, invoiceNo);
        waConfirm.hidden = true;
        if (invoiceNote) invoiceNote.textContent = defaultInvoiceNote;
        form.style.display = 'none';
        success.classList.add('show');
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
      }).catch(function (err) {
        console.error(err);
        alert('Maaf, invoice gagal dibuat. Silakan coba lagi.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
      });
    });

    if (invoiceDownload) {
      invoiceDownload.addEventListener('click', function () {
        if (waConfirm) waConfirm.hidden = false;
        if (invoiceNote) invoiceNote.textContent = 'Invoice berhasil diunduh. Silakan konfirmasi via WhatsApp dan lampirkan struk serta bukti transfer berhasil.';
      });
    }
  }

  /* ── INIT ── */
  document.addEventListener('DOMContentLoaded', function () {
    animateCards();
    initTierPicker();
    initUpload();
    initCopyRek();
    initForm();
  });
})();
