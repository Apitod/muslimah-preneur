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
      { id: 'tgl_transfer',   msg: 'Wajib diisi.' },
    ].forEach(function (f) {
      if (!val(f.id)) { setError(f.id, f.msg); ok = false; }
    });
    // file
    var fi = document.getElementById('bukti_transfer');
    if (!fi || !fi.files || !fi.files[0]) {
      setError('bukti_transfer', 'Upload bukti transfer terlebih dahulu.'); ok = false;
    }
    return ok;
  }

  /* ── BUILD WA MESSAGE ── */
  function buildWA() {
    var paket = $('input[name="paket"]:checked');
    var msg =
      '🌸 *PENDAFTARAN SPONSOR – MUSLIMAH PRENEUR*\n\n' +
      '*Paket:* ' + (paket ? paket.value : '-') + '\n' +
      '*Perusahaan:* ' + val('nama_perusahaan') + '\n' +
      '*Bidang:* ' + val('bidang_usaha') + '\n' +
      (val('alamat') ? '*Alamat:* ' + val('alamat') + '\n' : '') +
      '\n*Penanggung Jawab*\n' +
      '*Nama:* ' + val('nama_pic') + '\n' +
      (val('jabatan') ? '*Jabatan:* ' + val('jabatan') + '\n' : '') +
      '*WhatsApp:* ' + val('no_wa') + '\n' +
      (val('email') ? '*Email:* ' + val('email') + '\n' : '') +
      '\n*Transfer*\n' +
      '*Pengirim:* ' + val('nama_transfer') + '\n' +
      '*Jumlah:* Rp ' + val('jumlah_transfer') + '\n' +
      '*Tanggal:* ' + val('tgl_transfer') + '\n' +
      (val('catatan') ? '\n*Catatan:* ' + val('catatan') : '') +
      '\n\n_Bukti transfer segera menyusul / sudah diupload_';
    return 'https://wa.me/6285398687711?text=' + encodeURIComponent(msg);
  }

  /* ── SUBMIT ── */
  function initForm() {
    var form    = document.getElementById('sponsorForm');
    var success = document.getElementById('successScreen');
    var submitBtn = document.getElementById('submitBtn');
    if (!form) return;

    // clear errors on input
    form.querySelectorAll('input, textarea, select').forEach(function (el) {
      el.addEventListener('input', function () { clearError(el.id); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // clear all errors first
      $$('.field-error').forEach(function (el) { el.classList.remove('show'); });
      $$('.field input,.field select,.field textarea').forEach(function (el) { el.classList.remove('error'); });

      if (!validate()) {
        // scroll to first error
        var firstErr = form.querySelector('.error, .field-error.show');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Mengirim...';

      // small delay for UX feel
      setTimeout(function () {
        var url = buildWA();
        // show success
        form.style.display = 'none';
        success.classList.add('show');
        success.querySelector('.success-wa').href = url;
        window.open(url, '_blank');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 800);
    });
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
