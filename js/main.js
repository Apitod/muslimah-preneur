/* ═══════════════════════════════════════
   MUSLIMAH PRENEUR — main.js
   no deps · progressive enhancement
═══════════════════════════════════════ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── PROGRESS BAR ── */
  function initProgress() {
    var bar = document.getElementById('progress-bar');
    if (!bar) return;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? Math.min(window.scrollY / max, 1) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ── NAVBAR + ACTIVE LINK ── */
  function initNav() {
    var nav = document.getElementById('navbar');
    if (!nav) return;
    var sections = Array.prototype.slice.call(document.querySelectorAll('section[id]'));
    var links = nav.querySelectorAll('.nav-links a');

    function update() {
      nav.classList.toggle('scrolled', window.scrollY > 40);
      var current = '';
      sections.forEach(function (s) {
        if (window.scrollY >= s.offsetTop - 140) current = s.id;
      });
      links.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ── HAMBURGER ── */
  function initHamburger() {
    var btn = document.getElementById('hamburger');
    var menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;

    function setOpen(open) {
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    }
    btn.addEventListener('click', function () {
      setOpen(!menu.classList.contains('open'));
    });
    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) setOpen(false);
    });
  }

  /* ── SCROLL REVEAL ── */
  function initReveal() {
    var animEls = document.querySelectorAll('[data-animate]');
    var groups = document.querySelectorAll('[data-stagger]');
    var dividers = document.querySelectorAll('.divider');
    var rows = document.querySelectorAll('.rundown-item');
    var nums = document.querySelectorAll('.goal-num');
    var table = document.querySelector('.budget-table');

    if (!('IntersectionObserver' in window) || reduce) {
      Array.prototype.forEach.call(animEls, function (el) { el.classList.add('in'); });
      Array.prototype.forEach.call(groups, function (el) { el.classList.add('in'); });
      Array.prototype.forEach.call(dividers, function (el) { el.classList.add('in'); });
      Array.prototype.forEach.call(rows, function (el) { el.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });

    Array.prototype.forEach.call(animEls, function (el) { io.observe(el); });
    Array.prototype.forEach.call(groups, function (el) { io.observe(el); });
    Array.prototype.forEach.call(dividers, function (el) { io.observe(el); });

    /* rundown: cascade per baris */
    var ioRows = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var idx = Array.prototype.indexOf.call(e.target.parentElement.children, e.target);
        e.target.style.transitionDelay = (idx * 0.055) + 's';
        e.target.classList.add('in');
        ioRows.unobserve(e.target);
      });
    }, { threshold: 0.25 });
    Array.prototype.forEach.call(rows, function (el) { ioRows.observe(el); });

    /* angka tujuan: count-up */
    var ioNums = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var target = parseInt(e.target.textContent, 10) || 0;
        var i = 0;
        (function tick() {
          i++;
          e.target.textContent = (i < 10 ? '0' : '') + i;
          if (i < target) requestAnimationFrame(tick);
        })();
        ioNums.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(nums, function (el) { ioNums.observe(el); });

    /* tabel anggaran: baris muncul berurutan */
    if (table) {
      var trs = table.querySelectorAll('tbody tr');
      Array.prototype.forEach.call(trs, function (r) {
        r.style.opacity = '0';
        r.style.transform = 'translateY(10px)';
      });
      var ioTable = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          Array.prototype.forEach.call(trs, function (row, i) {
            setTimeout(function () {
              row.style.transition = 'opacity .45s ease, transform .45s ease';
              row.style.opacity = '1';
              row.style.transform = 'none';
            }, 80 + i * 50);
          });
          ioTable.unobserve(e.target);
        });
      }, { threshold: 0.12 });
      ioTable.observe(table);
    }
  }

  /* ── HERO PARALLAX (halus, desktop) ── */
  function initHeroParallax() {
    if (reduce || window.innerWidth < 860) return;
    var content = document.querySelector('.hero-content');
    if (!content) return;
    var raf = false;
    window.addEventListener('scroll', function () {
      if (raf) return;
      raf = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < window.innerHeight) {
          content.style.transform = 'translateY(' + (y * 0.16) + 'px)';
          content.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.75)));
        }
        raf = false;
      });
    }, { passive: true });
  }

  /* ── INIT ── */
  function boot() {
    initProgress();
    initNav();
    initHamburger();
    initReveal();
    initHeroParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
