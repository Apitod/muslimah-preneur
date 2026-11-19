(function () {
  'use strict';

  var GROUP_LINK = 'https://chat.whatsapp.com/CNjoFu56cYd4HU7vd50cnf?s=sw&p=i&iam=2';
  var data = null;
  var canvases = [];

  function $(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
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

  async function renderTicket(ticket, order) {
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

    var logo;
    try { logo = await loadImg('assets/logo.webp'); } catch (err) { logo = null; }
    if (logo) {
      var lw = 330;
      var lh = lw * logo.height / logo.width;
      var logoY = M + 250 + 54;
      ctx.drawImage(logo, (W - lw) / 2, logoY, lw, lh);
    }

    var y = M + 250 + 54 + (logo ? 330 * logo.height / logo.width : 100);

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
    fitFont(ctx, ticket.name || order.name, 880, 56, '400 {s}px "Playfair Display", Georgia, serif', 28);
    ctx.fillText(ticket.name || order.name, W / 2, y + 326);

    dashedLine(ctx, W / 2 - 380, y + 374, W / 2 + 380, y + 374);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#6E6857';
    ctx.font = '600 20px Lora, Georgia, serif';
    ctx.fillText('NO. TIKET', 140, y + 430);
    ctx.fillText('KATEGORI', 620, y + 430);

    ctx.fillStyle = '#4A1521';
    ctx.font = '700 50px Lora, Georgia, serif';
    ctx.fillText(ticket.ticketNo, 140, y + 484);

    var kategoriDisplay = (ticket.category || order.category) + (ticket.aaminah ? ' · ' + ticket.aaminah : '');
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

    return canvas;
  }

  function downloadCanvas(canvas, filename) {
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function renderCards() {
    var list = $('ticketList');
    list.innerHTML = '';
    canvases.forEach(function (canvas, index) {
      var ticket = data.tickets[index];
      var card = document.createElement('article');
      card.className = 'ticket-card';
      var img = document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      img.alt = 'Tiket peserta ' + ticket.ticketNo;
      var bar = document.createElement('div');
      bar.className = 'ticket-card-bar';
      bar.innerHTML = '<strong>No. ' + esc(ticket.ticketNo) + '</strong>' +
        '<span>' + esc(ticket.name) + '</span>' +
        '<a href="' + img.src + '" download="Tiket-MuslimahPreneur-' + esc(ticket.ticketNo) + '.png">Download</a>';
      card.appendChild(img);
      card.appendChild(bar);
      list.appendChild(card);
    });
  }

  function setDownloadAll() {
    var btn = $('downloadAll');
    if (!btn || !canvases.length) return;
    if (canvases.length === 1) {
      btn.href = canvases[0].toDataURL('image/png');
      btn.download = 'Tiket-MuslimahPreneur-' + data.tickets[0].ticketNo + '.png';
      return;
    }
    var gap = 24;
    var w = canvases[0].width;
    var h = canvases[0].height;
    var all = document.createElement('canvas');
    all.width = w;
    all.height = canvases.length * h + (canvases.length - 1) * gap;
    var ctx = all.getContext('2d');
    ctx.fillStyle = '#EFEDE3';
    ctx.fillRect(0, 0, all.width, all.height);
    canvases.forEach(function (canvas, i) {
      ctx.drawImage(canvas, 0, i * (h + gap));
    });
    btn.href = all.toDataURL('image/png');
    btn.download = 'Tiket-MuslimahPreneur-' + data.order.orderNo + '.png';
  }

  async function boot() {
    var group = $('groupLink');
    if (group) group.href = GROUP_LINK;

    var token = new URLSearchParams(location.search).get('token') || '';
    if (!token) {
      showEmpty('not_found', 'Token tiket tidak ditemukan.');
      return;
    }

    try {
      var res = await fetch('/api/ticket?token=' + encodeURIComponent(token), { cache: 'no-store' });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok || !body.ok) {
        showEmpty(body.status || 'not_found', body.error || '');
        return;
      }
      data = body;
      $('ticketTitle').textContent = 'Tiket ' + data.order.name;
      $('ticketSub').textContent = 'Order ' + data.order.orderNo + ' · ' + data.tickets.length + ' tiket';
      $('ticketPanel').hidden = false;
      $('ticketEmpty').hidden = true;

      for (var i = 0; i < data.tickets.length; i++) {
        canvases.push(await renderTicket(data.tickets[i], data.order));
      }
      renderCards();
      setDownloadAll();
    } catch (err) {
      showEmpty('not_found', 'Tiket tidak dapat dimuat. Periksa koneksi lalu coba lagi.');
    }
  }

  function showEmpty(status, message) {
    $('ticketPanel').hidden = true;
    $('ticketEmpty').hidden = false;
    $('ticketTitle').textContent = 'Tiket Peserta';
    $('ticketSub').textContent = 'Muslimah Preneur';
    var text = $('emptyText');
    if (status === 'pending') text.textContent = 'Pembayaran Anda masih menunggu verifikasi admin. Tiket akan tersedia setelah diverifikasi.';
    else if (status === 'rejected') text.textContent = 'Pembayaran belum dapat diverifikasi. Silakan hubungi Frista untuk informasi lebih lanjut.';
    else text.textContent = message || 'Tiket tidak ditemukan. Pastikan tautan yang Anda buka benar.';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
