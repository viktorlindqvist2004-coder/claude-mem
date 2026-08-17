/* =============================================================
   Dagsholm Golfklubb — interaktion
   Ingen build, inga beroenden. Bara moduler.
   ============================================================= */

import { CLUB, STATS, HOLES, COURSE, GREENFEE, EXTRAS, MEMBERSHIPS,
         FACILITIES, SEASONS, NEWS, FAQ } from './data.js';
import { m, GALLERY } from './media.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse  = matchMedia('(pointer: coarse)').matches;

const ICONS = {
  flag:   '<path d="M6 21V4l13 4.5L6 13"/><circle cx="6" cy="21" r="1.6" fill="currentColor" stroke="none"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  circle: '<circle cx="12" cy="14" r="6.5"/><path d="M12 7.5V3M9 3h6"/>',
  fork:   '<path d="M6 3v7a2 2 0 0 0 4 0V3M8 12v9"/><path d="M17 3c-1.6 1.2-2.4 3-2.4 5.2 0 1.7.8 2.8 2.4 3.1V21"/>',
  cart:   '<circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M3 5h2.2l2 11h9.6l1.9-7.5H6"/>',
  bed:    '<path d="M3 18v-7h13a4 4 0 0 1 4 4v3"/><path d="M3 18h18M3 11V6"/><circle cx="7.5" cy="9.5" r="2"/>',
  van:    '<path d="M3 16V7h11v9"/><path d="M14 10h3.5L21 13.5V16"/><circle cx="7" cy="18" r="1.9"/><circle cx="17" cy="18" r="1.9"/>',
  play:   '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/>',
};
const icon = (n) => `<svg class="tile__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nok = (n) => n.toLocaleString('sv-SE');

/* ---------- Preloader ------------------------------------- */
function preloader() {
  const el = $('#loader'), bar = $('#loaderBar'), pct = $('#loaderPct');
  if (!el) return;
  if (reduced) { el.hidden = true; document.body.classList.remove('is-locked'); $('#hero')?.classList.add('is-in'); return; }

  document.body.classList.add('is-locked');
  let p = 0;
  const tick = setInterval(() => {
    p = Math.min(100, p + Math.random() * 16 + 5);
    bar.style.width = p + '%';
    pct.textContent = Math.round(p);
    if (p >= 100) {
      clearInterval(tick);
      setTimeout(() => {
        el.hidden = true;
        document.body.classList.remove('is-locked');
        $('#hero')?.classList.add('is-in');
      }, 380);
    }
  }, 130);
}

/* ---------- Media ----------------------------------------- */
function media() {
  const hero = $('#heroVideo');
  if (hero) {
    hero.src = m('video/hero.mp4');
    hero.poster = m('img/golden.png');
    hero.load();
    hero.addEventListener('error', () => { hero.style.display = 'none'; }, { once: true });
  }

  const intro = $('#introImg');
  if (intro) intro.src = m('img/parkland.png');

  const strip = $('#stripImg');
  if (strip) strip.src = m('img/aerial.png');

  const reel = $('#reelVideo');
  if (reel) {
    reel.poster = m('img/tee.png');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) { reel.pause(); return; }
        if (!reel.src) { reel.src = m('video/dusk.mp4'); reel.load(); }
        reel.play().catch(() => {});
      });
    }, { rootMargin: '200px' });
    io.observe(reel);
    reel.addEventListener('error', () => { reel.style.display = 'none'; }, { once: true });
  }

  const btn = $('#vidctl'), label = $('#vidctlText');
  btn?.addEventListener('click', () => {
    if (!hero) return;
    const playing = !hero.paused;
    playing ? hero.pause() : hero.play().catch(() => {});
    label.textContent = playing ? 'Spela' : 'Paus';
    btn.setAttribute('aria-label', playing ? 'Spela bakgrundsvideo' : 'Pausa bakgrundsvideo');
    btn.querySelector('svg').innerHTML = playing
      ? '<path d="M3 1.5l7.5 4.5L3 10.5z"/>'
      : '<rect x="1.5" y="1" width="3" height="10" rx="1"/><rect x="7.5" y="1" width="3" height="10" rx="1"/>';
  });
}

/* ---------- Navigation ------------------------------------ */
function nav() {
  const bar = $('#nav'), burger = $('#burger'), menu = $('#menu');
  let last = 0;

  /* Navigeringens färg följer sektionen bakom den */
  const themed = $$('[data-theme]');
  const pickTheme = () => {
    const y = bar.getBoundingClientRect().bottom - 4;
    let light = false;
    for (const s of themed) {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom >= y) light = s.dataset.theme === 'light';
    }
    bar.classList.toggle('on-light', light);
  };

  const onScroll = () => {
    const y = scrollY;
    bar.classList.toggle('is-stuck', y > 40);
    bar.classList.toggle('is-hidden', y > 420 && y > last && !menu.classList.contains('is-open'));
    last = y;
    pickTheme();
    $('#progress').style.transform =
      `scaleX(${y / Math.max(1, document.body.scrollHeight - innerHeight)})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Stäng meny' : 'Öppna meny');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('is-locked', open);
    $$('.menu__link', menu).forEach((l, i) => { l.style.transitionDelay = open ? `${0.12 + i * 0.055}s` : '0s'; });
  };
  burger?.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('.menu__link').forEach((l) => l.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  const links = $$('.nav__link');
  const map = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const link = map.get(e.target.id);
      if (link && e.isIntersecting) {
        links.forEach((l) => l.classList.remove('is-active'));
        link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}

/* ---------- Reveal ---------------------------------------- */
function reveal() {
  const els = $$('[data-reveal]');
  const show = (el) => el.classList.add('is-in');
  if (!('IntersectionObserver' in window)) { els.forEach(show); return; }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      show(e.target);
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
  els.forEach((el) => io.observe(el));

  /* Skyddsnät: ett element som hade höjd 0 när det började observeras
     triggar aldrig IO och skulle annars bli permanent osynligt. */
  const backstop = () => {
    els.forEach((el) => {
      if (el.classList.contains('is-in')) return;
      if (el.getBoundingClientRect().top < innerHeight * 0.94) { show(el); io.unobserve(el); }
    });
  };
  addEventListener('scroll', backstop, { passive: true });
  addEventListener('resize', backstop, { passive: true });
  addEventListener('load', backstop);
  setTimeout(backstop, 1400);
}

function counters() {
  const wrap = $('#stats');
  if (!wrap) return;
  wrap.style.gridTemplateColumns = `repeat(${Math.min(STATS.length, 4)}, 1fr)`;
  wrap.innerHTML = STATS.map((s) => `
    <div class="stat" data-reveal>
      <dt class="sr">${esc(s.label)}</dt>
      <dd class="stat__num" data-to="${s.value}" data-suffix="${esc(s.suffix)}">0</dd>
      <dd class="stat__label">${esc(s.label)}</dd>
    </div>`).join('');

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, to = +el.dataset.to, sfx = el.dataset.suffix || '';
      obs.unobserve(el);
      if (reduced) { el.textContent = nok(to) + sfx; return; }
      const dur = 1500, t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = nok(Math.round(to * (1 - Math.pow(1 - k, 4)))) + sfx;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  $$('.stat__num', wrap).forEach((el) => io.observe(el));
}

function statement() {
  const el = $('#statement');
  if (!el || reduced) return;
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="w" style="color:var(--faint)">${esc(w)}</span>`).join(' ');
  const spans = $$('.w', el);
  const onScroll = () => {
    const r = el.getBoundingClientRect();
    const p = (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.25);
    const n = Math.round(Math.max(0, Math.min(1, p)) * spans.length);
    spans.forEach((s, i) => { s.style.color = i < n ? 'var(--fg)' : 'var(--faint)'; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------- Parallax -------------------------------------- */
function parallax() {
  if (reduced) return;
  const items = [
    ...$$('[data-parallax] img').map((el) => ({ el, k: 0.18 })),
    ...$$('.course__figure img').map((el) => ({ el, k: 0.10 })),
  ];
  if (!items.length) return;

  let ticking = false;
  const run = () => {
    ticking = false;
    const vh = innerHeight;
    items.forEach(({ el, k }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const centre = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${(-centre * k).toFixed(1)}px, 0) scale(1.12)`;
    });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  run();
}

/* ---------- Ticker ---------------------------------------- */
function ticker() {
  const el = $('#ticker');
  if (!el) return;
  const items = ['Par 72', '18 hål', 'Heldagsgreenfee', 'Ritad av Åke Persson', 'Invigd 1991',
                 'Driving range', 'Restaurang & terrass', 'Boende på anläggningen', 'Färgelanda · Dalsland'];
  const html = items.map((t) => `<span class="ticker__item">${esc(t)}</span>`).join('');
  el.innerHTML = html + html;
}

/* ---------- Banan ----------------------------------------- */
/* HOLES tom  → banöversikt utan hålspecifika uppgifter.
   HOLES ifylld → interaktiv hålguide + scorekort.               */
function course() {
  const body = $('#courseBody');
  const intro = $('#courseIntro');
  if (!body) return;
  if (intro) intro.textContent = COURSE.intro;

  if (!HOLES.length) { courseOverview(body); return; }
  courseGuide(body);
}

function courseOverview(body) {
  body.innerHTML = `
    <div class="course__split">
      <figure class="course__figure" data-reveal="mask">
        <img src="${m('img/mist.png')}" alt="Dimma över fairway i gryningen" loading="lazy">
        <figcaption>Gryning över banan</figcaption>
      </figure>
      <div>
        <dl class="keyvals" data-reveal>
          ${COURSE.points.map((p) => `<div class="kv"><dt>${esc(p.k)}</dt><dd>${esc(p.v)}</dd></div>`).join('')}
        </dl>
      </div>
    </div>
    <div class="notes">
      ${COURSE.notes.map((n, i) => `
        <article class="note-card" data-reveal style="--d:${i * 0.08}s">
          <span class="note-card__n">${String(i + 1).padStart(2, '0')}</span>
          <h3>${esc(n.title)}</h3>
          <p>${esc(n.text)}</p>
        </article>`).join('')}
    </div>
    <p class="banner-note" data-reveal>
      Hålguide med längder, par och index publiceras här när scorekortet är
      inläst. Fram till dess får du uppgifterna i receptionen eller på
      <a class="ulink" href="tel:+46768668910">076-866 89 10</a>.
    </p>`;
}

function courseGuide(body) {
  const pool = ['img/parkland.png', 'img/tee.png', 'img/green-sun.png',
                'img/bunker.png', 'img/mist.png', 'img/autumn.png'];

  body.innerHTML = `
    <div class="course__viewer" data-reveal="mask">
      <div class="hole__visual" id="holeVisual">
        ${pool.map((s) => `<img src="${m(s)}" alt="" loading="lazy">`).join('')}
        <span class="hole__nr" id="holeNrBig">01</span>
      </div>
      <div class="hole__panel">
        <p class="eyebrow" style="margin:0">Hål <span id="holeNr">1</span> av ${HOLES.length}</p>
        <h3 class="hole__name" id="holeName"></h3>
        <p class="hole__blurb" id="holeBlurb"></p>
        <dl class="hole__facts">
          <div class="fact"><dt>Par</dt><dd id="holePar"></dd></div>
          <div class="fact"><dt>Index</dt><dd id="holeIdx"></dd></div>
          <div class="fact"><dt>Gul</dt><dd id="holeGul"></dd></div>
          <div class="fact"><dt>Röd</dt><dd id="holeRod"></dd></div>
        </dl>
      </div>
    </div>

    <div class="holes" id="holeBtns" role="tablist" aria-label="Välj hål">
      ${HOLES.map((h) => `<button class="holes__btn" role="tab" data-nr="${h.nr}" aria-current="${h.nr === HOLES[0].nr}">${h.nr}</button>`).join('')}
    </div>

    <div class="course__nav">
      <p class="note" style="margin:0">Använd piltangenterna för att bläddra.</p>
      <div class="course__arrows">
        <button class="arrow" id="holePrev" aria-label="Föregående hål"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 3L5 8l5 5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="arrow" id="holeNext" aria-label="Nästa hål"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3l5 5-5 5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
    </div>

    <div class="card__toggle">
      <button class="btn btn--ghost" id="cardToggle" aria-expanded="false" aria-controls="scorecard" data-magnet>Visa hela scorekortet</button>
    </div>

    <div class="scorecard" id="scorecard" hidden>
      <table>
        <caption class="sr">Scorekort, Dagsholm Golfklubb</caption>
        <thead><tr><th scope="col">Hål</th><th scope="col">Namn</th><th scope="col">Par</th><th scope="col">Index</th><th scope="col">Gul (m)</th><th scope="col">Röd (m)</th></tr></thead>
        <tbody id="cardBody"></tbody>
      </table>
    </div>`;

  const visual = $('#holeVisual');
  const imgs = $$('img', visual);
  const btns = $('#holeBtns');
  let cur = 0;

  const render = (i) => {
    cur = (i + HOLES.length) % HOLES.length;
    const h = HOLES[cur];
    $('#holeNr').textContent = h.nr;
    $('#holeNrBig').textContent = String(h.nr).padStart(2, '0');
    $('#holeName').textContent = h.name || `Hål ${h.nr}`;
    $('#holeBlurb').textContent = h.blurb || '';
    $('#holePar').textContent = h.par ?? '–';
    $('#holeIdx').textContent = h.idx ?? '–';
    $('#holeGul').textContent = h.gul ?? '–';
    $('#holeRod').textContent = h.rod ?? '–';
    imgs.forEach((im, k) => im.classList.toggle('is-on', k === cur % imgs.length));
    $$('.holes__btn', btns).forEach((b, k) => b.setAttribute('aria-current', String(k === cur)));
  };

  btns.addEventListener('click', (e) => {
    const b = e.target.closest('.holes__btn');
    if (b) render(HOLES.findIndex((h) => h.nr === +b.dataset.nr));
  });
  $('#holePrev').addEventListener('click', () => render(cur - 1));
  $('#holeNext').addEventListener('click', () => render(cur + 1));

  addEventListener('keydown', (e) => {
    if ($('#lightbox')?.classList.contains('is-open')) return;
    const box = $('#banan').getBoundingClientRect();
    if (box.top > innerHeight * 0.6 || box.bottom < innerHeight * 0.4) return;
    if (e.key === 'ArrowLeft') render(cur - 1);
    if (e.key === 'ArrowRight') render(cur + 1);
  });

  render(0);

  /* scorekort */
  const num = (v) => (typeof v === 'number' ? v : 0);
  const sum = (a, k) => a.reduce((n, h) => n + num(h[k]), 0);
  const row = (h) => `<tr data-nr="${h.nr}">
      <td>${h.nr}</td><td style="text-align:left">${esc(h.name || '')}</td>
      <td>${h.par ?? '–'}</td><td>${h.idx ?? '–'}</td><td>${h.gul ?? '–'}</td><td>${h.rod ?? '–'}</td></tr>`;
  const total = (label, a) => `<tr class="sum">
      <td colspan="2" style="text-align:left">${label}</td>
      <td>${sum(a, 'par')}</td><td>—</td><td>${nok(sum(a, 'gul'))}</td><td>${nok(sum(a, 'rod'))}</td></tr>`;

  const out = HOLES.slice(0, 9), inn = HOLES.slice(9);
  $('#cardBody').innerHTML =
    out.map(row).join('') + (out.length ? total('Ut', out) : '') +
    inn.map(row).join('') + (inn.length ? total('In', inn) : '') +
    total('Totalt', HOLES);

  $('#cardBody').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-nr]');
    if (!tr) return;
    render(HOLES.findIndex((h) => h.nr === +tr.dataset.nr));
    $('#banan').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });

  const toggle = $('#cardToggle'), card = $('#scorecard');
  toggle.addEventListener('click', () => {
    const open = card.hidden;
    card.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Dölj scorekortet' : 'Visa hela scorekortet';
  });
}

/* ---------- Övriga block ---------------------------------- */
function blocks() {
  $('#bento').innerHTML = FACILITIES.map((f, i) => `
    <article class="tile ${f.size === 'lg' ? 'tile--lg' : ''}" data-reveal style="--d:${(i % 4) * 0.07}s">
      ${icon(f.icon)}
      <h3 class="tile__title">${esc(f.title)}</h3>
      <p class="tile__text">${esc(f.text)}</p>
    </article>`).join('');

  $('#seasons').innerHTML = SEASONS.map((s, i) => `
    <article class="season" data-reveal style="--d:${i * 0.07}s; --sc:${esc(s.color)}">
      <span class="season__months">${esc(s.months)}</span>
      <div>
        <h3 class="season__name">${esc(s.name)}</h3>
        <p class="season__text">${esc(s.text)}</p>
      </div>
    </article>`).join('');

  $('#plans').innerHTML = MEMBERSHIPS.map((p, i) => `
    <article class="plan ${p.featured ? 'is-featured' : ''}" data-reveal style="--d:${i * 0.07}s">
      <span class="plan__tag">${p.featured ? 'Populärast' : ''}</span>
      <h3 class="plan__name">${esc(p.name)}</h3>
      <p class="plan__price"><b>${esc(p.price)}</b><span>${esc(p.unit)}</span></p>
      <p class="plan__note">${esc(p.note)}</p>
      <ul class="plan__perks">${p.perks.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
    </article>`).join('');

  $('#news').innerHTML = NEWS.map((n, i) => `
    <article class="post" data-reveal style="--d:${i * 0.07}s">
      <p class="post__meta">
        <span class="post__tag">${esc(n.tag)}</span>
        <time datetime="${esc(n.date)}">${new Date(n.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })}</time>
      </p>
      <h3 class="post__title">${esc(n.title)}</h3>
      <p class="post__text">${esc(n.text)}</p>
    </article>`).join('');

  $('#faq').innerHTML = FAQ.map((f) => `
    <div class="qa" data-reveal>
      <button class="qa__btn" aria-expanded="false"><span>${esc(f.q)}</span><span class="qa__sign" aria-hidden="true"></span></button>
      <div class="qa__body"><div><p>${esc(f.a)}</p></div></div>
    </div>`).join('');

  $('#faq').addEventListener('click', (e) => {
    const btn = e.target.closest('.qa__btn');
    if (!btn) return;
    const qa = btn.closest('.qa');
    const open = qa.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
}

/* ---------- Priser ---------------------------------------- */
function pricing() {
  const list = $('#priceList'), period = $('#seasonPeriod');
  const sw = $('#seasonSwitch'), thumb = $('#switchThumb');
  if (!list) return;

  $('#extras').innerHTML = EXTRAS.map((x) =>
    `<li><span>${esc(x.name)}</span><span>${esc(x.price)}</span></li>`).join('');

  const render = (key) => {
    const s = GREENFEE[key];
    period.textContent = s.period;
    list.innerHTML = s.rows.map((r) => `
      <div class="price__row">
        <span class="price__name">${esc(r.name)}<span class="price__sub">${esc(r.sub)}</span></span>
        <span class="price__dots" aria-hidden="true"></span>
        <span class="price__amt">${nok(r.price)} <small>kr</small></span>
      </div>`).join('');
  };

  const moveThumb = (btn) => {
    thumb.style.width = btn.offsetWidth + 'px';
    thumb.style.transform = `translateX(${btn.offsetLeft - 4}px)`;
  };

  const btns = $$('.switch__btn', sw);
  sw.addEventListener('click', (e) => {
    const b = e.target.closest('.switch__btn');
    if (!b) return;
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render(b.dataset.season);
    moveThumb(b);
  });

  render('low');
  requestAnimationFrame(() => moveThumb(btns[0]));
  addEventListener('resize', () => moveThumb(btns.find((b) => b.getAttribute('aria-pressed') === 'true') || btns[0]));
}

/* ---------- Galleri + lightbox ---------------------------- */
function gallery() {
  const grid = $('#gallery');
  if (!grid) return;

  grid.innerHTML = GALLERY.map((g, i) => `
    <button class="shot" data-i="${i}" aria-label="Visa: ${esc(g.cap)}">
      <img src="${m(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async">
      <span class="shot__cap">${esc(g.cap)}</span>
    </button>`).join('');

  const lb = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap');
  let i = 0, lastFocus = null;

  const show = (n) => {
    i = (n + GALLERY.length) % GALLERY.length;
    const g = GALLERY[i];
    img.src = m(g.src);
    img.alt = g.alt;
    cap.textContent = `${g.cap} — ${i + 1} / ${GALLERY.length}`;
  };
  const open = (n) => {
    lastFocus = document.activeElement;
    show(n);
    lb.classList.add('is-open');
    document.body.classList.add('is-locked');
    $('#lbClose').focus();
  };
  const close = () => {
    lb.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    lastFocus?.focus();
  };

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.shot');
    if (b) open(+b.dataset.i);
  });
  $('#lbClose').addEventListener('click', close);
  $('#lbPrev').addEventListener('click', () => show(i - 1));
  $('#lbNext').addEventListener('click', () => show(i + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });

  addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
    if (e.key === 'Tab') {
      const f = [$('#lbClose'), $('#lbPrev'), $('#lbNext')];
      const k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
}

/* ---------- Markör + magneter ----------------------------- */
function cursor() {
  const el = $('#cursor');
  if (!el || reduced || coarse) return;
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
  const loop = () => {
    cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
    el.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  };
  loop();
  const big = 'a, button, .shot, .holes__btn, [data-magnet]';
  document.addEventListener('pointerover', (e) => { if (e.target.closest(big)) el.classList.add('is-big'); });
  document.addEventListener('pointerout',  (e) => { if (e.target.closest(big)) el.classList.remove('is-big'); });
}

function magnets() {
  if (reduced || coarse) return;
  $$('[data-magnet]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.22}px, ${(e.clientY - (r.top + r.height / 2)) * 0.35}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ---------- Diverse --------------------------------------- */
function status() {
  const el = $('#statusText');
  if (!el) return;
  const mth = new Date().getMonth() + 1;
  el.textContent = mth >= 4 && mth <= 10
    ? 'Banan öppen · ordinarie greener'
    : 'Vinterspel · provisoriska greener';
}

function anchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const t = id && document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + id);
  });
}

/* ---------- Start ----------------------------------------- */
function safe(name, fn) {
  try { fn(); } catch (err) { console.error(`[dagsholm] ${name} misslyckades:`, err); }
}

function init() {
  const failsafe = setTimeout(() => {
    const l = $('#loader');
    if (l && !l.hidden) { l.hidden = true; document.body.classList.remove('is-locked'); }
    $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));
  }, 5000);

  safe('meta', () => {
    $('#year').textContent = new Date().getFullYear();
    document.title = `${CLUB.name} — ${CLUB.tagline}`;
  });

  safe('media', media);
  safe('nav', nav);
  safe('ticker', ticker);
  safe('counters', counters);
  safe('blocks', blocks);
  safe('pricing', pricing);
  safe('course', course);
  safe('gallery', gallery);
  safe('statement', statement);
  safe('parallax', parallax);
  safe('anchors', anchors);
  safe('cursor', cursor);
  safe('magnets', magnets);
  safe('status', status);
  safe('reveal', reveal);      /* efter att allt innehåll finns i DOM:en */
  safe('preloader', preloader);

  addEventListener('load', () => clearTimeout(failsafe), { once: true });
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
