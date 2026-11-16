(function () {
  'use strict';

  var el = {};
  var sb = null;
  var state = { participants: [], sponsors: [] };
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

  function cache() {
    [
      'loginScreen', 'dashboard', 'loginForm', 'email', 'password', 'loginBtn', 'loginStatus',
      'adminEmail', 'logoutBtn', 'statPeserta', 'statSponsor', 'statNominalPeserta',
      'statNominalSponsor', 'countPeserta', 'countSponsor', 'pesertaBody', 'sponsorBody',
      'pesertaEmpty', 'sponsorEmpty', 'searchInput', 'refreshBtn', 'dashStatus'
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
    el.pesertaBody.innerHTML = '<tr><td colspan="9" class="muted">Memuat data peserta…</td></tr>';
    el.sponsorBody.innerHTML = '<tr><td colspan="9" class="muted">Memuat data sponsor…</td></tr>';

    var results = await Promise.all([
      sb.from('participants').select('*').order('created_at', { ascending: false }),
      sb.from('sponsors').select('*').order('created_at', { ascending: false })
    ]);

    if (results[0].error || results[1].error) {
      var msg = (results[0].error && results[0].error.message) || (results[1].error && results[1].error.message) || 'Gagal memuat data.';
      setStatus(el.dashStatus, msg, 'error');
      el.pesertaBody.innerHTML = '';
      el.sponsorBody.innerHTML = '';
      return;
    }

    state.participants = results[0].data || [];
    state.sponsors = results[1].data || [];
    render();
  }

  function matches(row, q) {
    if (!q) return true;
    var hay = [
      row.name, row.whatsapp, row.ticket_no, row.category, row.aaminah,
      row.company, row.pic_name, row.invoice_no, row.package, row.email, row.transfer_name
    ].join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function attachmentCell(row) {
    if (!row.attachment_path) return '<span class="muted">—</span>';
    return '<button type="button" class="attachment-btn" data-path="' +
      esc(row.attachment_path) + '" data-name="' + esc(row.attachment_name || '') +
      '">Lihat bukti</button>';
  }

  function deleteCell(type, row, name) {
    return '<button type="button" class="delete-btn" data-type="' + type +
      '" data-id="' + esc(row.id) + '" data-path="' + esc(row.attachment_path || '') +
      '" data-name="' + esc(name || '') + '">Hapus</button>';
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
      return '<tr>' +
        '<td>' + esc(row.ticket_no) + '</td>' +
        '<td>' + esc(row.name) + '</td>' +
        '<td>' + esc(row.whatsapp) + '</td>' +
        '<td>' + esc(row.category) + '</td>' +
        '<td>' + (row.aaminah ? esc(row.aaminah) : '<span class="muted">—</span>') + '</td>' +
        '<td>' + fmtMoney(row.nominal_transfer) + '</td>' +
        '<td>' + attachmentCell(row) + '</td>' +
        '<td>' + fmtDate(row.created_at) + '</td>' +
        '<td>' + deleteCell('participant', row, row.name) + '</td>' +
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
      return '<tr>' +
        '<td>' + esc(row.invoice_no) + '</td>' +
        '<td>' + esc(row.company) + '</td>' +
        '<td>' + esc(row.pic_name) + '</td>' +
        '<td>' + esc(row.whatsapp) + '</td>' +
        '<td>' + esc(row.package) + '</td>' +
        '<td>' + fmtMoney(row.amount) + '</td>' +
        '<td>' + attachmentCell(row) + '</td>' +
        '<td>' + fmtDate(row.created_at) + '</td>' +
        '<td>' + deleteCell('sponsor', row, row.company) + '</td>' +
        '</tr>';
    }).join('');
  }

  function render() {
    var q = (el.searchInput.value || '').trim().toLowerCase();
    var participants = state.participants.filter(function (row) { return matches(row, q); });
    var sponsors = state.sponsors.filter(function (row) { return matches(row, q); });

    el.statPeserta.textContent = state.participants.length;
    el.statSponsor.textContent = state.sponsors.length;

    var totalP = state.participants.reduce(function (sum, row) {
      return sum + (Number(row.nominal_transfer) || 0);
    }, 0);
    var totalS = state.sponsors.reduce(function (sum, row) {
      return sum + (Number(row.amount) || 0);
    }, 0);

    el.statNominalPeserta.textContent = fmtMoney(totalP);
    el.statNominalSponsor.textContent = fmtMoney(totalS);

    renderParticipants(participants);
    renderSponsors(sponsors);
  }

  async function openAttachment(path) {
    if (!path) return;
    var res = await sb.storage.from('bukti-transfer').createSignedUrl(path, 300);
    if (res.error) {
      alert('Gagal membuka lampiran: ' + res.error.message);
      return;
    }
    window.open(res.data.signedUrl, '_blank', 'noopener');
  }

  async function deleteRow(type, id, path, name) {
    if (!id) return;
    if (!confirm('Hapus data ' + (name || 'ini') + '?')) return;
    if (path) {
      var rm = await sb.storage.from('bukti-transfer').remove([path]);
      if (rm.error) console.warn('Gagal menghapus lampiran:', rm.error.message);
    }
    var table = type === 'sponsor' ? 'sponsors' : 'participants';
    var res = await sb.from(table).delete().eq('id', id);
    if (res.error) {
      alert('Gagal menghapus data: ' + res.error.message);
      return;
    }
    await loadData();
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
    el.searchInput.addEventListener('input', render);

    document.addEventListener('click', function (e) {
      var att = e.target.closest('.attachment-btn');
      if (att) { openAttachment(att.getAttribute('data-path')); return; }
      var del = e.target.closest('.delete-btn');
      if (del) {
        deleteRow(del.getAttribute('data-type'), del.getAttribute('data-id'), del.getAttribute('data-path'), del.getAttribute('data-name'));
      }
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
