(function () {
  'use strict';

  var data = null;

  function $(id) { return document.getElementById(id); }
  function formatRupiah(v) {
    return Number(v || 0).toLocaleString('id-ID');
  }
  function fmtDate(value) {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (err) {
      return String(value);
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

  async function makeInvoice(sponsor) {
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
    ctx.fillText('Talk Show Muslimah Preneur', W / 2, M + 106);

    ctx.strokeStyle = 'rgba(235,214,183,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, M + 132);
    ctx.lineTo(W / 2 + 60, M + 132);
    ctx.stroke();

    ctx.fillStyle = '#EBD6B7';
    ctx.font = '15px Lora, Georgia, serif';
    ctx.fillText('MQ AAMINAH  ×  DAARUL ILMIL KARIMI', W / 2, M + 170);

    var logo;
    try { logo = await loadImg('assets/logo.webp'); } catch (err) { logo = null; }
    var lw = 300;
    var lh = logo ? lw * logo.height / logo.width : 100;
    var logoY = M + 210 + 48;
    if (logo) ctx.drawImage(logo, (W - lw) / 2, logoY, lw, lh);

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
    ctx.fillText(sponsor.invoiceNo, 140, y + 270);

    ctx.font = '600 26px Lora, Georgia, serif';
    ctx.fillText(fmtDate(sponsor.verifiedAt), 620, y + 268);

    dashedLine(ctx, W / 2 - 380, y + 312, W / 2 + 380, y + 312);

    ctx.fillStyle = '#6E6857';
    ctx.font = '600 17px Lora, Georgia, serif';
    ctx.fillText('DITUJUKAN KEPADA', 140, y + 366);

    ctx.fillStyle = '#4A1521';
    fitFont(ctx, sponsor.company, 800, 44, '400 {s}px "Playfair Display", Georgia, serif', 24);
    ctx.fillText(sponsor.company, 140, y + 414);

    ctx.fillStyle = '#56582C';
    ctx.font = '600 26px Lora, Georgia, serif';
    ctx.fillText(sponsor.picName + (sponsor.position ? ' · ' + sponsor.position : ''), 140, y + 458);

    ctx.fillStyle = '#6E6857';
    var contact = sponsor.whatsapp + (sponsor.email ? ' · ' + sponsor.email : '');
    fitFont(ctx, contact, 800, 24, '400 {s}px Lora, Georgia, serif', 16);
    ctx.fillText(contact, 140, y + 496);

    dashedLine(ctx, W / 2 - 380, y + 540, W / 2 + 380, y + 540);

    ctx.fillStyle = '#6E6857';
    ctx.font = '600 17px Lora, Georgia, serif';
    ctx.fillText('PAKET SPONSORSHIP', 140, y + 594);

    ctx.fillStyle = '#4A1521';
    fitFont(ctx, sponsor.package, 800, 36, '600 {s}px "Playfair Display", Georgia, serif', 20);
    ctx.fillText(sponsor.package, 140, y + 638);

    ctx.fillStyle = '#56582C';
    ctx.font = '600 30px Lora, Georgia, serif';
    ctx.fillText('Nilai Transfer: Rp ' + formatRupiah(sponsor.amount), 140, y + 684);

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
    ctx.fillText('TERVERIFIKASI', 140, y + 916);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#6E6857';
    ctx.font = 'italic 21px Lora, Georgia, serif';
    ctx.fillText('Simpan invoice ini sebagai bukti pendaftaran sponsorship.', W / 2, y + 976);

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

  function showEmpty(status, message) {
    $('invoicePanel').hidden = true;
    $('invoiceEmpty').hidden = false;
    $('invoiceTitle').textContent = 'Invoice Sponsor';
    $('invoiceSub').textContent = 'Muslimah Preneur';
    var text = $('emptyText');
    if (status === 'pending') text.textContent = 'Pembayaran sponsor masih menunggu verifikasi admin. Invoice akan tersedia setelah diverifikasi.';
    else if (status === 'rejected') text.textContent = 'Pembayaran sponsor belum dapat diverifikasi. Silakan hubungi panitia.';
    else text.textContent = message || 'Invoice tidak ditemukan. Pastikan tautan yang Anda buka benar.';
  }

  async function boot() {
    var token = new URLSearchParams(location.search).get('token') || '';
    if (!token) {
      showEmpty('not_found', 'Token invoice tidak ditemukan.');
      return;
    }
    try {
      var res = await fetch('/api/invoice?token=' + encodeURIComponent(token), { cache: 'no-store' });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok || !body.ok) {
        showEmpty(body.status || 'not_found', body.error || '');
        return;
      }
      data = body;
      var sponsor = body.sponsor;
      $('invoiceTitle').textContent = 'Invoice ' + sponsor.invoiceNo;
      $('invoiceSub').textContent = sponsor.company + ' · ' + sponsor.package;
      var dataURL = await makeInvoice(sponsor);
      $('invoiceImg').src = dataURL;
      $('invoiceDownload').href = dataURL;
      $('invoiceDownload').setAttribute('download', 'Invoice-Sponsorship-' + sponsor.invoiceNo + '.png');
      $('invoicePanel').hidden = false;
      $('invoiceEmpty').hidden = true;
    } catch (err) {
      showEmpty('not_found', 'Invoice tidak dapat dimuat. Periksa koneksi lalu coba lagi.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
