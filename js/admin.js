(function () {
  'use strict';

  var GROUP_LINK = 'https://chat.whatsapp.com/CNjoFu56cYd4HU7vd50cnf?s=sw&p=i&iam=2';
  var el = {};
  var sb = null;
  var state = { orders: [], tickets: [], sponsors: [], code: null };
  var proofContext = null;
  var money = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  });

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtMoney(value) {
    var n = Number(value);
    return money.format(Number.isFinite(n) ? n : 0);
  }

  function fmtDate(value) {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (err) {
      return String(value);
    }
  }

  function setStatus(node, message, type) {
    if (!node) return;
    node.textContent = message || '';
    node.className = 'form-status' + (message ? ' show ' + (type || 'error') : '');
  }

  function normalizePhone(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.indexOf('0062') === 0) digits = digits.slice(2);
    if (digits.indexOf('620') === 0) digits = '62' + digits.slice(3);
    if (digits.charAt(0) === '0') digits = '62' + digits.slice(1);
    else if (digits.indexOf('62') !== 0 && digits.charAt(0) === '8') digits = '62' + digits;
    return digits;
  }

  function formatPhone(value) {
    var n = normalizePhone(value);
    if (!n) return '';
    if (n.indexOf('62') === 0) {
      var rest = n.slice(2);
      if (rest.length > 8) return '+62 ' + rest.slice(0, 3) + '-' + rest.slice(3, 7) + '-' + rest.slice(7);
      return '+62 ' + rest;
    }
    return '+' + n;
  }

  function cache() {
    [
      'loginScreen', 'dashboard', 'loginForm', 'email', 'password', 'loginBtn', 'loginStatus',
      'adminEmail', 'logoutBtn', 'statEarly', 'statEarlySub', 'statCode', 'statCodeSub',
      'statRegular', 'statRegularSub', 'statTotal', 'statTotalSub', 'copyCode',
      'countPeserta', 'countSponsor', 'pesertaBody', 'sponsorBody',
      'pesertaEmpty', 'sponsorEmpty', 'searchInput', 'refreshBtn', 'printBtn', 'printSheet', 'dashStatus',
      'proofModal', 'proofTitle', 'proofImage', 'proofFrame', 'proofOpenLink', 'closeProof', 'proofVerify'
    ].forEach(function (id) { el[id] = $(id); });
  }

  function showLogin() {
    el.loginScreen.hidden = false;
    el.dashboard.hidden = true;
    el.logoutBtn.hidden = true;
    el.adminEmail.textContent = '';
  }

  function showDashboard(user) {
    el.loginScreen.hidden = true;
    el.dashboard.hidden = false;
    el.logoutBtn.hidden = false;
    el.adminEmail.textContent = user && user.email ? user.email : '';
  }

  async function verifyAdmin(user) {
    var res = await sb.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    if (res.error) return false;
    return !!res.data;
  }

  async function handleUser(user) {
    if (!user) { showLogin(); return; }
    if (!(await verifyAdmin(user))) {
      await sb.auth.signOut();
      showLogin();
      setStatus(el.loginStatus, 'Akun ini bukan admin.', 'error');
      return;
    }
    showDashboard(user);
    await loadData();
  }

  async function loadData() {
    setStatus(el.dashStatus, '', '');
    el.pesertaEmpty.hidden = true;
    el.sponsorEmpty.hidden = true;
    el.pesertaBody.innerHTML = '<tr><td colspan="11" class="muted">Memuat data peserta…</td></tr>';
    el.sponsorBody.innerHTML = '<tr><td colspan="10" class="muted">Memuat data sponsor…</td></tr>';

    var results = await Promise.all([
      sb.from('participant_orders').select('*').order('created_at', { ascending: false }),
      sb.from('participant_tickets').select('*').order('ticket_no', { ascending: true }),
      sb.from('sponsors').select('*').order('created_at', { ascending: false }),
      sb.from('discount_codes').select('*').eq('active', true).order('created_at', { ascending: false }).limit(1)
    ]);

    if (results[0].error || results[1].error || results[2].error || results[3].error) {
      var msg = (results[0].error && results[0].error.message) ||
        (results[1].error && results[1].error.message) ||
        (results[2].error && results[2].error.message) ||
        (results[3].error && results[3].error.message) ||
        'Gagal memuat data.';
      setStatus(el.dashStatus, msg, 'error');
      el.pesertaBody.innerHTML = '';
      el.sponsorBody.innerHTML = '';
      return;
    }

    state.orders = results[0].data || [];
    state.tickets = results[1].data || [];
    state.sponsors = results[2].data || [];
    state.code = (results[3].data && results[3].data[0]) || null;
    render();
  }

  function ticketsFor(orderId) {
    return state.tickets.filter(function (t) { return t.order_id === orderId; });
  }

  function matches(row, q) {
    if (!q) return true;
    var ticketText = row.id ? ticketsFor(row.id).map(function (t) { return t.ticket_no; }).join(' ') : '';
    var hay = [
      row.order_no, row.name, row.whatsapp, row.category, row.aaminah,
      row.company, row.pic_name, row.invoice_no, row.package, row.email,
      row.transfer_name, ticketText
    ].join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function statusBadge(status) {
    var label = status === 'verified' ? 'Verified' : status === 'rejected' ? 'Rejected' : 'Pending';
    return '<span class="status-badge status-' + esc(status) + '">' + label + '</span>';
  }

  function attachmentCell(row, kind) {
    if (!row.attachment_path) return '<span class="muted">—</span>';
    return '<button type="button" class="attachment-btn' + (row.proof_viewed_at ? ' viewed' : '') + '"' +
      ' data-kind="' + kind + '"' +
      ' data-id="' + esc(row.id) + '"' +
      ' data-path="' + esc(row.attachment_path) + '"' +
      ' data-name="' + esc(row.attachment_name || '') + '">' +
      (row.proof_viewed_at ? '✓ ' : '') + 'Lihat bukti</button>';
  }

  function actionButtons(type, row) {
    var html = '';
    if (row.status === 'pending') {
      var disabled = row.proof_viewed_at ? '' : ' disabled title="Buka bukti transfer terlebih dahulu"';
      html += '<button type="button" class="action-btn verify-btn" data-type="' + type +
        '" data-id="' + esc(row.id) + '"' + disabled + '>Verifikasi</button>';
      html += '<button type="button" class="action-btn reject-btn" data-type="' + type +
        '" data-id="' + esc(row.id) + '"' + disabled + '>Tolak</button>';
    }
    if (row.status === 'verified') {
      html += '<button type="button" class="action-btn wa-btn" data-type="' + type +
        '" data-id="' + esc(row.id) + '">WhatsApp</button>';
    }
    html += '<button type="button" class="delete-btn" data-type="' + type +
      '" data-id="' + esc(row.id) + '" data-path="' + esc(row.attachment_path || '') +
      '" data-name="' + esc(type === 'sponsor' ? row.company : row.name) + '">Hapus</button>';
    return '<div class="action-group">' + html + '</div>';
  }

  function ticketCell(order) {
    var tickets = ticketsFor(order.id);
    if (!tickets.length) return '<span class="muted">—</span>';
    return '<div class="ticket-pills">' + tickets.map(function (t) {
      return '<span class="ticket-pill">' + esc(t.ticket_no) + '</span>';
    }).join('') + '</div>';
  }

  function renderParticipants(list) {
    el.countPeserta.textContent = list.length;
    if (!list.length) {
      el.pesertaBody.innerHTML = '';
      el.pesertaEmpty.hidden = false;
      return;
    }
    el.pesertaEmpty.hidden = true;
    el.pesertaBody.innerHTML = list.map(function (row) {
      var category = row.category + (row.aaminah ? ' · ' + row.aaminah : '');
      return '<tr>' +
        '<td>' + esc(row.order_no) + '</td>' +
        '<td>' + esc(row.name) + '</td>' +
        '<td>' + esc(formatPhone(row.whatsapp)) + '</td>' +
        '<td>' + esc(category) + '</td>' +
        '<td>' + esc(row.quantity) + '</td>' +
        '<td>' + fmtMoney(row.total_amount) + '</td>' +
        '<td>' + attachmentCell(row, 'participant') + '</td>' +
        '<td>' + statusBadge(row.status) + '</td>' +
        '<td>' + ticketCell(row) + '</td>' +
        '<td>' + fmtDate(row.created_at) + '</td>' +
        '<td>' + actionButtons('participant', row) + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderSponsors(list) {
    el.countSponsor.textContent = list.length;
    if (!list.length) {
      el.sponsorBody.innerHTML = '';
      el.sponsorEmpty.hidden = false;
      return;
    }
    el.sponsorEmpty.hidden = true;
    el.sponsorBody.innerHTML = list.map(function (row) {
      var invoice = row.status === 'verified' && row.invoice_no ? row.invoice_no : '—';
      return '<tr>' +
        '<td>' + esc(invoice) + '</td>' +
        '<td>' + esc(row.company) + '</td>' +
        '<td>' + esc(row.pic_name) + '</td>' +
        '<td>' + esc(formatPhone(row.whatsapp)) + '</td>' +
        '<td>' + esc(row.package) + '</td>' +
        '<td>' + fmtMoney(row.amount) + '</td>' +
        '<td>' + attachmentCell(row, 'sponsor') + '</td>' +
        '<td>' + statusBadge(row.status) + '</td>' +
        '<td>' + fmtDate(row.created_at) + '</td>' +
        '<td>' + actionButtons('sponsor', row) + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderQuota() {
    var earlyVerified = 0;
    var earlyReserved = 0;
    var regularVerified = 0;
    var regularReserved = 0;
    var codeVerified = 0;
    var codeReserved = 0;
    var totalVerified = 0;
    var totalReserved = 0;

    state.orders.forEach(function (row) {
      var active = row.status === 'pending' || row.status === 'verified';
      if (active) {
        earlyReserved += Number(row.early_bird_qty) || 0;
        regularReserved += Number(row.regular_qty) || 0;
        totalReserved += Number(row.quantity) || 0;
        if (row.discount_code) codeReserved += 1;
      }
      if (row.status === 'verified') {
        earlyVerified += Number(row.early_bird_qty) || 0;
        regularVerified += Number(row.regular_qty) || 0;
        totalVerified += Number(row.quantity) || 0;
        if (row.discount_code) codeVerified += 1;
      }
    });

    el.statEarly.textContent = earlyVerified + ' / 200';
    el.statEarlySub.textContent = earlyReserved + ' tiket terpakai/reserved';
    el.statRegular.textContent = regularVerified + ' / 300';
    el.statRegularSub.textContent = regularReserved + ' tiket terpakai/reserved';
    el.statTotal.textContent = totalVerified + ' / 500';
    el.statTotalSub.textContent = totalReserved + ' tiket terpakai/reserved';

    if (state.code) {
      el.statCode.textContent = state.code.code;
      el.statCodeSub.textContent = codeVerified + ' / ' + state.code.quota_total +
        ' terverifikasi · ' + Math.max(0, state.code.quota_total - codeReserved) + ' sisa';
      el.copyCode.hidden = false;
    } else {
      el.statCode.textContent = '—';
      el.statCodeSub.textContent = 'Belum ada kode aktif';
      el.copyCode.hidden = true;
    }
  }

  function render() {
    var q = (el.searchInput.value || '').trim().toLowerCase();
    var orders = state.orders.filter(function (row) { return matches(row, q); });
    var sponsors = state.sponsors.filter(function (row) { return matches(row, q); });
    renderQuota();
    renderParticipants(orders);
    renderSponsors(sponsors);
  }

  async function openAttachment(kind, id, path) {
    if (!path) return;
    var rpc = kind === 'sponsor'
      ? sb.rpc('admin_mark_sponsor_proof_viewed', { p_sponsor_id: id })
      : sb.rpc('admin_mark_participant_proof_viewed', { p_order_id: id });
    var mark = await rpc;
    if (mark.error) {
      alert('Gagal menandai bukti: ' + mark.error.message);
      return;
    }
    var row = kind === 'sponsor'
      ? state.sponsors.find(function (r) { return r.id === id; })
      : state.orders.find(function (r) { return r.id === id; });
    if (row) row.proof_viewed_at = row.proof_viewed_at || new Date().toISOString();
    render();

    var res = await sb.storage.from('bukti-transfer').createSignedUrl(path, 300);
    if (res.error) {
      alert('Gagal membuka lampiran: ' + res.error.message);
      return;
    }
    showProof(path, res.data.signedUrl, row && row.attachment_name, kind, id, row && row.status);
  }

  function showProof(path, url, name, kind, id, status) {
    if (!el.proofModal) return;
    proofContext = { kind: kind, id: id };
    el.proofTitle.textContent = name || 'Bukti Transfer';
    el.proofOpenLink.href = url;
    if (el.proofVerify) {
      el.proofVerify.hidden = status !== 'pending';
      el.proofVerify.disabled = false;
      el.proofVerify.textContent = 'Verifikasi';
    }
    var isPdf = /\.pdf($|\?)/i.test(path || '');
    if (isPdf) {
      el.proofImage.hidden = true;
      el.proofImage.removeAttribute('src');
      el.proofFrame.hidden = false;
      el.proofFrame.src = url;
    } else {
      el.proofFrame.hidden = true;
      el.proofFrame.removeAttribute('src');
      el.proofImage.hidden = false;
      el.proofImage.src = url;
    }
    el.proofModal.hidden = false;
    document.body.classList.add('proof-open');
  }

  function closeProof() {
    if (!el.proofModal) return;
    el.proofModal.hidden = true;
    document.body.classList.remove('proof-open');
    if (el.proofFrame) el.proofFrame.removeAttribute('src');
    if (el.proofImage) el.proofImage.removeAttribute('src');
    proofContext = null;
  }

  async function verifyRow(type, id) {
    var rpc = type === 'sponsor'
      ? sb.rpc('admin_verify_sponsor', { p_sponsor_id: id })
      : sb.rpc('admin_verify_participant', { p_order_id: id });
    var res = await rpc;
    if (res.error) {
      alert('Gagal memverifikasi: ' + res.error.message);
      return false;
    }
    if (!res.data || res.data.ok !== true) {
      alert((res.data && res.data.error) || 'Gagal memverifikasi.');
      return false;
    }
    await loadData();
    return true;
  }

  async function rejectRow(type, id) {
    if (!confirm('Tolak data ini? Kuota yang direservasi akan dikembalikan.')) return;
    var rpc = type === 'sponsor'
      ? sb.rpc('admin_reject_sponsor', { p_sponsor_id: id })
      : sb.rpc('admin_reject_participant', { p_order_id: id });
    var res = await rpc;
    if (res.error) {
      alert('Gagal menolak: ' + res.error.message);
      return;
    }
    if (res.data !== true) {
      alert('Data tidak dapat ditolak. Mungkin sudah diproses.');
      return;
    }
    await loadData();
  }

  function participantMessage(order) {
    var link = location.origin + '/tiket?token=' + encodeURIComponent(order.ticket_token);
    return 'Bismillah.\n\n' +
      'Assalamu’alaikum warahmatullahi wabarakatuh.\n\n' +
      'Halo, Kak ' + order.name + '.\n\n' +
      'Terima kasih telah menyelesaikan proses registrasi dan pembayaran untuk kegiatan “Muslimah Preneur” bersama Muri Handayani, yang insyaAllah akan dilaksanakan pada:\n\n' +
      '📅 25 Desember 2026\n\n' +
      'Pembayaran Kakak telah kami terima. Berikut kami lampirkan tiket sebagai bukti registrasi.\n\n' +
      'Silakan unduh dan simpan nomor peserta melalui tautan berikut:\n\n' +
      '🔗 Download Nomor Peserta: ' + link + '\n\n' +
      'Nomor peserta tersebut harap ditunjukkan kepada panitia saat registrasi ulang di lokasi acara.\n\n' +
      'Untuk mendapatkan informasi lebih lanjut mengenai kegiatan dan teknis pelaksanaan, silakan bergabung melalui grup WhatsApp peserta berikut:\n\n' +
      '🔗 Grup WhatsApp: ' + GROUP_LINK + '\n\n' +
      'Sampai bertemu di kegiatan Muslimah Preneur.\n\n' +
      'Terima kasih atas partisipasi Kakak.\n\n' +
      'Wassalamu’alaikum warahmatullahi wabarakatuh.';
  }

  function sponsorMessage(sponsor) {
    var link = location.origin + '/invoice?token=' + encodeURIComponent(sponsor.invoice_token);
    return 'Assalamualaikum Warahmatullahi Wabarakatuh\n\n' +
      'Atas nama panitia "Muslimah Preneur" kami menyampaikan terima kasih yang sebesar-besarnya kepada ' + sponsor.company + ' atas dukungan, kontribusi, dan kepercayaan yang telah diberikan sebagai sponsor kegiatan kami. Dukungan Anda sangat berarti bagi kelancaran dan kesuksesan acara ini. Semoga kerja sama baik ini dapat terus terjalin dan membawa manfaat bagi kita semua di kesempatan mendatang.\n\n' +
      'Berikut link invoice Anda:\n' + link + '\n\n' +
      'jazakumullah khairan wa barakallahu fiikum';
  }

  function openWhatsApp(type, id) {
    var row = type === 'sponsor'
      ? state.sponsors.find(function (r) { return r.id === id; })
      : state.orders.find(function (r) { return r.id === id; });
    if (!row) return;
    var message = type === 'sponsor' ? sponsorMessage(row) : participantMessage(row);
    var phone = normalizePhone(row.whatsapp);
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(message), '_blank', 'noopener');
  }

  async function deleteRow(type, id, path, name) {
    if (!id) return;
    if (!confirm('Hapus data ' + (name || 'ini') + '?')) return;
    if (path) {
      var rm = await sb.storage.from('bukti-transfer').remove([path]);
      if (rm.error) console.warn('Gagal menghapus lampiran:', rm.error.message);
    }
    var table = type === 'sponsor' ? 'sponsors' : 'participant_orders';
    var res = await sb.from(table).delete().eq('id', id);
    if (res.error) {
      alert('Gagal menghapus data: ' + res.error.message);
      return;
    }
    await loadData();
  }

  function printAttendance() {
    if (!state.tickets.length) {
      alert('Belum ada tiket terverifikasi untuk dicetak.');
      return;
    }
    var ordersById = {};
    state.orders.forEach(function (row) { ordersById[row.id] = row; });
    var rows = state.tickets.slice().sort(function (a, b) {
      return Number(a.ticket_no) - Number(b.ticket_no);
    }).map(function (ticket) {
      var order = ordersById[ticket.order_id] || {};
      var category = (ticket.category || order.category || '') +
        (ticket.aaminah ? ' · ' + ticket.aaminah : '');
      return '<tr>' +
        '<td class="ticket-no">' + esc(ticket.ticket_no) + '</td>' +
        '<td>' + esc(ticket.name) + '</td>' +
        '<td>' + esc(formatPhone(order.whatsapp)) + '</td>' +
        '<td>' + esc(category) + '</td>' +
        '<td class="attendance-cell"><span class="attendance-box" aria-label="Kolom hadir"></span></td>' +
        '</tr>';
    }).join('');

    var printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    el.printSheet.innerHTML =
      '<div class="print-head">' +
        '<img src="assets/logo.webp" alt="MQ Aaminah">' +
        '<div>' +
          '<p class="print-kicker">Daftar Hadir Peserta</p>' +
          '<h1>Muslimah Preneur</h1>' +
          '<p>Jum\'at, 25 Desember 2026 · Max Ballroom Hotel Maxone Makassar</p>' +
        '</div>' +
      '</div>' +
      '<div class="print-meta">' +
        '<span>Total tiket terverifikasi: <strong>' + state.tickets.length + '</strong></span>' +
        '<span>Dicetak: ' + esc(printedAt) + '</span>' +
      '</div>' +
      '<table class="print-table">' +
        '<colgroup><col style="width:12%"><col style="width:30%"><col style="width:21%"><col style="width:23%"><col style="width:14%"></colgroup>' +
        '<thead><tr><th>No. Tiket</th><th>Nama</th><th>Nomor WhatsApp</th><th>Kategori</th><th>Hadir</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
      '<p class="print-foot">Tanda centang pada kolom Hadir diisi panitia saat registrasi ulang.</p>';

    var oldTitle = document.title;
    document.title = 'Daftar Hadir Muslimah Preneur';
    window.print();
    setTimeout(function () { document.title = oldTitle; }, 800);
  }

  function bind() {
    el.loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = el.email.value.trim();
      var password = el.password.value;
      if (!email || !password) {
        setStatus(el.loginStatus, 'Email dan password wajib diisi.', 'error');
        return;
      }
      el.loginBtn.disabled = true;
      setStatus(el.loginStatus, 'Memproses login…', 'info');
      var res = await sb.auth.signInWithPassword({ email: email, password: password });
      el.loginBtn.disabled = false;
      if (res.error) {
        setStatus(el.loginStatus, res.error.message, 'error');
        return;
      }
      setStatus(el.loginStatus, '', '');
      await handleUser(res.data.user);
    });

    el.logoutBtn.addEventListener('click', async function () {
      await sb.auth.signOut();
      location.reload();
    });

    el.refreshBtn.addEventListener('click', loadData);
    el.printBtn.addEventListener('click', printAttendance);
    el.searchInput.addEventListener('input', render);

    el.copyCode.addEventListener('click', function () {
      if (!state.code || !navigator.clipboard) return;
      navigator.clipboard.writeText(state.code.code).then(function () {
        el.copyCode.textContent = '✓ Tersalin';
        setTimeout(function () { el.copyCode.textContent = 'Salin kode'; }, 1800);
      });
    });

    document.addEventListener('click', function (e) {
      var att = e.target.closest('.attachment-btn');
      if (att) {
        openAttachment(att.getAttribute('data-kind'), att.getAttribute('data-id'), att.getAttribute('data-path'));
        return;
      }
      var verify = e.target.closest('.verify-btn');
      if (verify) {
        verifyRow(verify.getAttribute('data-type'), verify.getAttribute('data-id'));
        return;
      }
      var reject = e.target.closest('.reject-btn');
      if (reject) {
        rejectRow(reject.getAttribute('data-type'), reject.getAttribute('data-id'));
        return;
      }
      var wa = e.target.closest('.wa-btn');
      if (wa) {
        openWhatsApp(wa.getAttribute('data-type'), wa.getAttribute('data-id'));
        return;
      }
      var del = e.target.closest('.delete-btn');
      if (del) {
        deleteRow(del.getAttribute('data-type'), del.getAttribute('data-id'), del.getAttribute('data-path'), del.getAttribute('data-name'));
      }
    });

    if (el.closeProof) el.closeProof.addEventListener('click', closeProof);
    if (el.proofVerify) {
      el.proofVerify.addEventListener('click', async function () {
        if (!proofContext) return;
        var ctx = proofContext;
        el.proofVerify.disabled = true;
        el.proofVerify.textContent = 'Memverifikasi...';
        var ok = await verifyRow(ctx.kind, ctx.id);
        if (ok) closeProof();
        else if (el.proofVerify) {
          el.proofVerify.disabled = false;
          el.proofVerify.textContent = 'Verifikasi';
        }
      });
    }
    if (el.proofModal) {
      el.proofModal.addEventListener('click', function (e) {
        if (e.target.hasAttribute('data-close-proof')) closeProof();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.proofModal && !el.proofModal.hidden) closeProof();
    });
  }

  async function boot() {
    cache();
    var url = window.SUPABASE_URL || '';
    var key = window.SUPABASE_ANON_KEY || '';
    if (!window.supabase || !url || !key || /YOUR-PROJECT/i.test(url) || /YOUR-ANON-KEY/i.test(key)) {
      setStatus(el.loginStatus, 'Supabase belum dikonfigurasi. Isi js/supabase-config.js terlebih dahulu.', 'error');
      return;
    }
    sb = window.supabase.createClient(url, key);
    bind();
    var session = await sb.auth.getSession();
    if (session.data && session.data.session) {
      await handleUser(session.data.session.user);
    } else {
      showLogin();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
