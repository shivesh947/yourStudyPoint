(function () {
  'use strict';

  const CONFIG_URL = 'data/appConfigNew.json';
  const REMOTE_CONFIG_URL =
    'https://raw.githubusercontent.com/shivesh947/yourStudyPoint/refs/heads/main/appConfigNew.json';

  let config = null;
  let allBooks = [];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Init ──
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    $('#year').textContent = new Date().getFullYear();
    setupNavbar();
    setupMobileMenu();
    setupScrollAnimations();
    setupViewer();
    setupFilters();

    try {
      config = await loadConfig();
      allBooks = config.book || [];
      renderPage();
    } catch (err) {
      console.error(err);
      $('#materials-loading').innerHTML =
        '<p class="text-red-500">Failed to load study materials. Please refresh the page.</p>';
    }
  }

  async function loadConfig() {
    const opts = { cache: 'no-store' };

    try {
      const res = await fetch(CONFIG_URL, opts);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.book)) return data;
      }
    } catch (_) { /* fall through */ }

    const res = await fetch(REMOTE_CONFIG_URL, opts);
    if (!res.ok) throw new Error('Config fetch failed');
    return res.json();
  }

  function renderPage() {
    $('#materials-loading').classList.add('hidden');
    $('#stat-books').textContent = allBooks.length;

    populateFilterOptions();
    renderClassSections();
    renderAbout();
    renderContact();
    applyFilters();

    if (location.hash.startsWith('#view/')) {
      const id = parseInt(location.hash.replace('#view/', ''), 10);
      const book = allBooks.find((b) => b.id === id);
      if (book) openViewer(book);
    }
  }

  // ── Navbar scroll effect ──
  function setupNavbar() {
    const navbar = $('#navbar');
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function setupMobileMenu() {
    const btn = $('#menu-btn');
    const menu = $('#mobile-menu');
    btn.addEventListener('click', () => menu.classList.toggle('hidden'));
    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => menu.classList.add('hidden'));
    });
  }

  // ── Scroll reveal ──
  function setupScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    $$('.animate-on-scroll').forEach((el) => observer.observe(el));
  }

  // ── Filters ──
  function setupFilters() {
    ['search-input', 'filter-class', 'filter-subject', 'filter-type'].forEach((id) => {
      const el = $('#' + id);
      el.addEventListener('input', applyFilters);
      el.addEventListener('change', applyFilters);
    });
    $('#clear-filters').addEventListener('click', clearFilters);
  }

  function populateFilterOptions() {
    const classes = new Set();
    const subjects = new Set();

    allBooks.forEach((book) => {
      subjects.add(book.subject);
      normalizeClass(book.class).forEach((c) => classes.add(c));
    });

    const classSelect = $('#filter-class');
    [...classes].sort((a, b) => a - b).forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = 'Class ' + c;
      classSelect.appendChild(opt);
    });

    const subjectSelect = $('#filter-subject');
    [...subjects].sort().forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      subjectSelect.appendChild(opt);
    });
  }

  function normalizeClass(cls) {
    if (cls == null) return [];
    return Array.isArray(cls) ? cls : [cls];
  }

  function getFilterValues() {
    return {
      search: $('#search-input').value.trim().toLowerCase(),
      classVal: $('#filter-class').value,
      subject: $('#filter-subject').value,
      type: $('#filter-type').value,
    };
  }

  function applyFilters() {
    const { search, classVal, subject, type } = getFilterValues();

    const filtered = allBooks.filter((book) => {
      if (search) {
        const hay = [book.title, book.subject, book.key, book.tag]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (subject && book.subject !== subject) return false;
      if (type && book.type !== type) return false;
      if (classVal) {
        const classes = normalizeClass(book.class);
        if (!classes.includes(parseInt(classVal, 10))) return false;
      }
      return true;
    });

    renderMaterials(filtered);
    renderActiveFilters({ search, classVal, subject, type });
  }

  function renderActiveFilters({ search, classVal, subject, type }) {
    const container = $('#active-filters');
    container.innerHTML = '';
    const tags = [];
    if (search) tags.push({ label: 'Search: ' + search, clear: () => ($('#search-input').value = '') });
    if (classVal) tags.push({ label: 'Class ' + classVal, clear: () => ($('#filter-class').value = '') });
    if (subject) tags.push({ label: subject, clear: () => ($('#filter-subject').value = '') });
    if (type) tags.push({ label: type.toUpperCase(), clear: () => ($('#filter-type').value = '') });

    tags.forEach((tag) => {
      const el = document.createElement('span');
      el.className = 'filter-tag';
      el.innerHTML =
        tag.label +
        ' <button class="ml-1 hover:text-red-800" aria-label="Remove filter">&times;</button>';
      el.querySelector('button').addEventListener('click', () => {
        tag.clear();
        applyFilters();
      });
      container.appendChild(el);
    });
  }

  function clearFilters() {
    $('#search-input').value = '';
    $('#filter-class').value = '';
    $('#filter-subject').value = '';
    $('#filter-type').value = '';
    applyFilters();
  }

  // ── Materials grid ──
  function renderMaterials(books) {
    const grid = $('#materials-grid');
    const empty = $('#materials-empty');
    grid.innerHTML = '';

    $('#materials-count').textContent =
      books.length + ' material' + (books.length !== 1 ? 's' : '') + ' found';

    if (books.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    books.forEach((book, i) => {
      grid.appendChild(createMaterialCard(book, i));
    });
  }

  function createMaterialCard(book, index) {
    const card = document.createElement('article');
    card.className = 'material-card material-card-animate';
    card.style.animationDelay = Math.min(index * 0.04, 0.6) + 's';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'Open ' + book.title);

    const color = book.color || '#C62828';
    const classes = normalizeClass(book.class);
    const classLabel =
      classes.length === 0
        ? 'All Classes'
        : classes.length > 3
          ? 'Classes ' + classes[0] + '–' + classes[classes.length - 1]
          : 'Class ' + classes.join(', ');

    const typeIcon =
      book.type === 'pptx'
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>';

    card.innerHTML =
      '<div class="material-card-accent" style="background:' +
      color +
      '"></div>' +
      '<div class="p-5">' +
      '<div class="flex items-start gap-4">' +
      '<div class="material-card-icon w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style="background:' +
      color +
      '18;color:' +
      color +
      '">' +
      '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
      typeIcon +
      '</svg></div>' +
      '<div class="min-w-0 flex-1">' +
      '<h3 class="font-semibold text-slate-900 truncate">' +
      escapeHtml(book.title) +
      '</h3>' +
      '<p class="text-sm text-slate-500 mt-0.5">' +
      escapeHtml(book.subject) +
      '</p>' +
      '</div></div>' +
      '<div class="flex items-center gap-2 mt-4 flex-wrap">' +
      '<span class="text-xs px-2.5 py-1 rounded-full font-medium" style="background:' +
      color +
      '15;color:' +
      color +
      '">' +
      escapeHtml(classLabel) +
      '</span>' +
      '<span class="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium uppercase">' +
      escapeHtml(book.type || 'pdf') +
      '</span>' +
      '</div></div>';

    const open = () => openViewer(book);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });

    return card;
  }

  // ── Class sections ──
  function renderClassSections() {
    const container = $('#class-sections');
    const sections = config.about?.classSections || [];
    const colors = ['#C62828', '#E65100', '#1565C0'];

    container.innerHTML = sections
      .map((section, i) => {
        const color = colors[i % colors.length];
        return (
          '<div class="class-card animate-on-scroll" style="transition-delay:' +
          i * 0.1 +
          's">' +
          '<div class="class-card-number w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-4" style="background:' +
          color +
          '">' +
          (i + 1) +
          '</div>' +
          '<h3 class="text-xl font-bold text-slate-900 mb-3">' +
          escapeHtml(section.title) +
          '</h3>' +
          '<ul class="space-y-2">' +
          section.subjects
            .map(
              (s) =>
                '<li class="flex items-center gap-2 text-sm text-slate-600">' +
                '<svg class="w-4 h-4 shrink-0" style="color:' +
                color +
                '" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' +
                escapeHtml(s) +
                '</li>'
            )
            .join('') +
          '</ul></div>'
        );
      })
      .join('');

    setupScrollAnimations();
  }

  // ── About & Contact ──
  function renderAbout() {
    const owner = config.about?.owner;
    if (!owner) return;

    $('#about-owner').innerHTML =
      '<div class="w-14 h-14 rounded-full bg-gradient-to-br from-ysp-red to-ysp-orange flex items-center justify-center text-white text-xl font-bold shrink-0">' +
      owner.name.charAt(0) +
      '</div>' +
      '<div>' +
      '<p class="font-semibold text-slate-900">' +
      escapeHtml(owner.name) +
      '</p>' +
      '<p class="text-sm text-slate-500">' +
      escapeHtml(owner.qualification) +
      '</p>' +
      '<p class="text-xs text-ysp-red font-medium mt-1">Founder &amp; Educator</p>' +
      '</div>';
  }

  function renderContact() {
    const contact = config.about?.contact;
    const location = config.about?.location;

    if (contact?.phone) {
      $('#contact-phone').innerHTML =
        '<div class="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-4">' +
        '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg></div>' +
        '<h3 class="font-semibold text-lg">Phone</h3>' +
        '<a href="tel:' +
        contact.phone +
        '" class="text-orange-100 mt-2 text-sm hover:text-white transition-colors block">' +
        contact.phone +
        '</a>';
    }

    if (location) {
      $('#contact-location').innerHTML =
        '<div class="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-4">' +
        '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>' +
        '<h3 class="font-semibold text-lg">Location</h3>' +
        '<a href="' +
        escapeHtml(location.mapsUrl) +
        '" target="_blank" rel="noopener" class="text-orange-100 mt-2 text-sm hover:text-white transition-colors block">' +
        escapeHtml(location.label) +
        '</a>';
    }
  }

  // ── Document Viewer ──
  function setupViewer() {
    $('#viewer-close').addEventListener('click', closeViewer);
    $('.viewer-backdrop').addEventListener('click', closeViewer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeViewer();
    });

    $('#viewer-iframe').addEventListener('load', () => {
      $('#viewer-loader').classList.add('hidden');
    });
  }

  function openViewer(book) {
    const modal = $('#viewer-modal');
    const iframe = $('#viewer-iframe');
    const loader = $('#viewer-loader');

    $('#viewer-title').textContent = book.title;
    const classes = normalizeClass(book.class);
    const meta = [book.subject, classes.length ? 'Class ' + classes.join(', ') : null, book.type?.toUpperCase()]
      .filter(Boolean)
      .join(' · ');
    $('#viewer-meta').textContent = meta;

    loader.classList.remove('hidden');
    iframe.src = book.driveURL || '';
    modal.classList.remove('hidden', 'closing');
    document.body.style.overflow = 'hidden';

    history.replaceState(null, '', '#view/' + book.id);
  }

  function closeViewer() {
    const modal = $('#viewer-modal');
    if (modal.classList.contains('hidden')) return;

    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('closing');
      $('#viewer-iframe').src = 'about:blank';
      document.body.style.overflow = '';
      if (location.hash.startsWith('#view/')) {
        history.replaceState(null, '', '#materials');
      }
    }, 250);
  }

  // ── Utils ──
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();
