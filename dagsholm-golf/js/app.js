/* =============================================================
   Dagsholm Golfklubb — interaktion
   Ingen build, inga beroenden, inga externa bilder.

   Princip: en sektion som saknar data göms helt i stället för att
   visa platshållare. Inget påhittat innehåll kan därför nå sidan.
   ============================================================= */

import { CLUB, STATS, HOLES, COURSE, GREENFEE, GREENFEE_NOTE, EXTRAS,
         MEMBERSHIPS, MEMBERSHIP_NOTE, FACILITIES, RULES, FAQ, NEWS } from './data.js';
import { m, HERO_CLIPS, REEL_CLIP, BAND_CLIP } from './media.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse  = matchMedia('(pointer: coarse)').matches;

const ICONS = {
  flag:   '<path d="M6 21V4l13 4.5L6 13"/><circle cx="6" cy="21" r="1.6" fill="currentColor" stroke="none"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  circle: '<circle cx="12" cy="14" r="6.5"/><path d="M12 7.5V3M9 3h6"/>',
  fork:   '<path d="M6 3v7a2 2 0 0 0 4 0V3M8 12v9"/><path d="M17 3c-1.6 1.2-2.4 3-2.4 5.2 0 1.7.8 2.8 2.4 3.1V21"/>',
  bed:    '<path d="M3 18v-7h13a4 4 0 0 1 4 4v3"/><path d="M3 18h18M3 11V6"/><circle cx="7.5" cy="9.5" r="2"/>',
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

/* ---------- Film -------------------------------------------
   Alla klipp är stämningsbilder, inte dokumentation av banan.
   Om en URL saknas eller filen inte kan spelas lämnas ytan tom
   och bakgrundsgradienten i CSS får stå för intrycket.       */
function video(src, { loop = true, onFail } = {}) {
  const url = m(src);
  if (!url) return null;
  const v = document.createElement('video');
  v.src = url;
  v.muted = true;
  v.loop = loop;
  v.playsInline = true;
  v.setAttribute('muted', '');
  v.setAttribute('playsinline', '');
  v.preload = 'none';
  v.addEventListener('error', () => { v.remove(); onFail?.(v); }, { once: true });
  return v;
}

/* Spelar bara när ytan är i eller nära vyn – sparar batteri och data. */
function playInView(el, onFirstPlay) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) { el.pause(); return; }
      if (el.preload !== 'auto') { el.preload = 'auto'; el.load(); onFirstPlay?.(); }
      el.play().catch(() => {});
    });
  }, { rootMargin: '300px' });
  io.observe(el);
}

function heroVideo() {
  const box = $('#heroMedia'), btn = $('#vidctl');
  if (!box) return;

  /* Levande lista: ett klipp som inte går att spela plockas ut ur
     rotationen, annars skulle slingan stanna på ett borttaget
     element och hero bli tom. */
  const clips = [];
  let i = 0, paused = false;

  const current = () => clips[i];

  const showClip = (n) => {
    if (!clips.length) { btn?.remove(); return; }   /* inga klipp → bara gradienten */
    i = ((n % clips.length) + clips.length) % clips.length;
    clips.forEach((v, k) => {
      v.classList.toggle('is-on', k === i);
      if (k !== i) { v.pause(); return; }
      v.preload = 'auto';
      try { v.currentTime = 0; } catch { /* inte laddad än */ }
      if (!paused) v.play().catch(() => {});
    });
  };

  const drop = (v) => {
    const k = clips.indexOf(v);
    if (k < 0) return;
    const wasCurrent = k === i;
    clips.splice(k, 1);
    if (k < i) i -= 1;
    if (wasCurrent) showClip(i);      /* hoppa vidare till nästa som fungerar */
    else if (!clips.length) btn?.remove();
  };

  HERO_CLIPS.forEach((src) => {
    const v = video(src, { loop: false, onFail: drop });
    if (!v) return;
    v.addEventListener('ended', () => showClip(i + 1));
    clips.push(v);
    box.appendChild(v);
  });

  if (!clips.length) { btn?.remove(); return; }
  showClip(0);

  /* pausa när hero rullat ur bild */
  new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = current();
      if (!v) return;
      if (e.isIntersecting && !paused) v.play().catch(() => {});
      else v.pause();
    });
  }, { threshold: 0.05 }).observe($('#hero'));

  btn?.addEventListener('click', () => {
    paused = !paused;
    const v = current();
    if (v) paused ? v.pause() : v.play().catch(() => {});
    $('#vidctlText').textContent = paused ? 'Spela' : 'Paus';
    btn.setAttribute('aria-label', paused ? 'Spela bakgrundsfilm' : 'Pausa bakgrundsfilm');
    btn.querySelector('svg').innerHTML = paused
      ? '<path d="M3 1.5l7.5 4.5L3 10.5z"/>'
      : '<rect x="1.5" y="1" width="3" height="10" rx="1"/><rect x="7.5" y="1" width="3" height="10" rx="1"/>';
  });
}

function bandVideos() {
  const reel = $('#reelFrame');
  if (reel) {
    const v = video(REEL_CLIP);
    if (v) { reel.prepend(v); playInView(v); }
  }
  const band = $('#bandFrame');
  if (band) {
    const v = video(BAND_CLIP);
    if (v) { band.prepend(v); playInView(v); }
    else band.remove();          /* inget klipp → inget tomt band */
  }
}

/* ---------- Navigation ------------------------------------ */
function nav() {
  const bar = $('#nav'), burger = $('#burger'), menu = $('#menu');
  let last = 0;

  const themed = $$('[data-theme]');
  const pickTheme = () => {
    const y = bar.getBoundingClientRect().bottom - 4;
    let light = false;
    for (const s of themed) {
      if (s.hidden) continue;
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

  /* Skyddsnät: element som hade höjd 0 när de började observeras
     triggar aldrig IO och skulle annars bli permanent osynliga. */
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

function ticker() {
  const el = $('#ticker');
  if (!el) return;
  const items = ['Par 72', '18 hål', 'Skogs- och parkbana', 'Ritad av Åke Persson',
                 'Invigd 1991', 'Driving range', 'Restaurang', 'Färgelanda · Dalsland'];
  const html = items.map((t) => `<span class="ticker__item">${esc(t)}</span>`).join('');
  el.innerHTML = html + html;
}

/* ---------- Banan ----------------------------------------- */
function course() {
  const body = $('#courseBody'), intro = $('#courseIntro');
  if (!body) return;
  if (intro) intro.textContent = COURSE.intro;
  HOLES.length ? courseGuide(body) : courseOverview(body);
}

function courseOverview(body) {
  body.innerHTML = `
    <dl class="keyvals keyvals--lg" data-reveal>
      ${COURSE.points.map((p) => `<div class="kv"><dt>${esc(p.k)}</dt><dd>${esc(p.v)}</dd></div>`).join('')}
    </dl>
    <p class="banner-note" data-reveal>
      Hålguide med längder, par och index publiceras här när klubbens
      scorekort är inläst. Fram till dess får du uppgifterna i receptionen
      eller på <a class="ulink" href="tel:+46768668910">076-866 89 10</a>.
    </p>`;
}

function courseGuide(body) {
  body.innerHTML = `
    <div class="course__viewer" data-reveal>
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
      ${HOLES.map((h, i) => `<button class="holes__btn" role="tab" data-i="${i}" aria-current="${i === 0}">${h.nr}</button>`).join('')}
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

  const btns = $('#holeBtns');
  let cur = 0;

  const render = (i) => {
    cur = (i + HOLES.length) % HOLES.length;
    const h = HOLES[cur];
    $('#holeNr').textContent = h.nr;
    $('#holeName').textContent = h.name || `Hål ${h.nr}`;
    $('#holeBlurb').textContent = h.blurb || '';
    $('#holePar').textContent = h.par ?? '–';
    $('#holeIdx').textContent = h.idx ?? '–';
    $('#holeGul').textContent = h.gul ?? '–';
    $('#holeRod').textContent = h.rod ?? '–';
    $$('.holes__btn', btns).forEach((b, k) => b.setAttribute('aria-current', String(k === cur)));
  };

  btns.addEventListener('click', (e) => {
    const b = e.target.closest('.holes__btn');
    if (b) render(+b.dataset.i);
  });
  $('#holePrev').addEventListener('click', () => render(cur - 1));
  $('#holeNext').addEventListener('click', () => render(cur + 1));
  addEventListener('keydown', (e) => {
    const box = $('#banan').getBoundingClientRect();
    if (box.top > innerHeight * 0.6 || box.bottom < innerHeight * 0.4) return;
    if (e.key === 'ArrowLeft') render(cur - 1);
    if (e.key === 'ArrowRight') render(cur + 1);
  });
  render(0);

  const num = (v) => (typeof v === 'number' ? v : 0);
  const sum = (a, k) => a.reduce((n, h) => n + num(h[k]), 0);
  const row = (h, i) => `<tr data-i="${i}">
      <td>${h.nr}</td><td style="text-align:left">${esc(h.name || '')}</td>
      <td>${h.par ?? '–'}</td><td>${h.idx ?? '–'}</td><td>${h.gul ?? '–'}</td><td>${h.rod ?? '–'}</td></tr>`;
  const total = (label, a) => `<tr class="sum">
      <td colspan="2" style="text-align:left">${label}</td>
      <td>${sum(a, 'par')}</td><td>—</td><td>${nok(sum(a, 'gul'))}</td><td>${nok(sum(a, 'rod'))}</td></tr>`;

  const out = HOLES.slice(0, 9), inn = HOLES.slice(9);
  $('#cardBody').innerHTML =
    out.map((h, i) => row(h, i)).join('') + (out.length ? total('Ut', out) : '') +
    inn.map((h, i) => row(h, i + 9)).join('') + (inn.length ? total('In', inn) : '') +
    total('Totalt', HOLES);

  $('#cardBody').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-i]');
    if (tr) render(+tr.dataset.i);
  });

  const toggle = $('#cardToggle'), card = $('#scorecard');
  toggle.addEventListener('click', () => {
    const open = card.hidden;
    card.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Dölj scorekortet' : 'Visa hela scorekortet';
  });
}

/* ---------- Spela hos oss --------------------------------- */
function greenfee() {
  const note = $('#greenfeeNote'), body = $('#greenfeeBody');
  if (note) note.textContent = GREENFEE_NOTE;
  if (!body) return;

  /* Ingen prislista inlagd → ingen tabell, bara hänvisning. */
  if (!GREENFEE.length) {
    body.innerHTML = `
      <div class="bigstate" data-reveal>
        <p class="bigstate__k">Greenfee</p>
        <p class="bigstate__v">Enligt<br>prislista</p>
        <p class="bigstate__t">
          Vi publicerar inga priser här som inte är bekräftade för säsongen.
          Ring receptionen så får du exakt pris för din dag.
        </p>
        <a class="btn" href="tel:+46768668910" data-magnet>076-866 89 10 <span class="btn__arrow" aria-hidden="true">→</span></a>
      </div>`;
    return;
  }

  body.innerHTML = `
    <div class="price__list">
      ${GREENFEE.map((r) => `
        <div class="price__row">
          <span class="price__name">${esc(r.name)}${r.sub ? `<span class="price__sub">${esc(r.sub)}</span>` : ''}</span>
          <span class="price__dots" aria-hidden="true"></span>
          <span class="price__amt">${nok(r.price)} <small>kr</small></span>
        </div>`).join('')}
    </div>
    ${EXTRAS.length ? `
      <p class="eyebrow" style="margin:2.5rem 0 1rem">Övrigt</p>
      <ul class="extras">${EXTRAS.map((x) => `<li><span>${esc(x.name)}</span><span>${esc(x.price)}</span></li>`).join('')}</ul>` : ''}`;
}

/* ---------- Övriga block ---------------------------------- */
function blocks() {
  $('#bento').innerHTML = FACILITIES.map((f, i) => `
    <article class="tile ${f.size === 'lg' ? 'tile--lg' : ''}" data-reveal style="--d:${(i % 4) * 0.07}s">
      ${icon(f.icon)}
      <h3 class="tile__title">${esc(f.title)}</h3>
      <p class="tile__text">${esc(f.text)}</p>
    </article>`).join('');

  $('#rules').innerHTML = RULES.map((r) =>
    `<div class="rule"><dt>${esc(r.k)}</dt><dd>${esc(r.v)}</dd></div>`).join('');

  $('#contactFacts').innerHTML = COURSE.points.slice(0, 6).map((p) =>
    `<div class="kv"><dt>${esc(p.k)}</dt><dd>${esc(p.v)}</dd></div>`).join('');

  const mNote = $('#memberNote');
  if (mNote) mNote.textContent = MEMBERSHIP_NOTE;

  $('#plans').innerHTML = MEMBERSHIPS.map((p, i) => `
    <article class="plan" data-reveal style="--d:${i * 0.07}s">
      <h3 class="plan__name">${esc(p.name)}</h3>
      ${p.price ? `<p class="plan__price"><b>${esc(p.price)}</b><span>${esc(p.unit || '')}</span></p>` : ''}
      ${p.note ? `<p class="plan__note">${esc(p.note)}</p>` : ''}
      ${Array.isArray(p.perks) && p.perks.length
        ? `<ul class="plan__perks">${p.perks.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}
      <a class="plan__link ulink" href="tel:+46768668910">Fråga om avgift</a>
    </article>`).join('');

  /* Nyheter: visas bara om det finns riktiga inlägg. */
  const newsSection = $('#nyheter');
  if (NEWS.length) {
    newsSection.hidden = false;
    $('#news').innerHTML = NEWS.map((n, i) => `
      <article class="post" data-reveal style="--d:${i * 0.07}s">
        <p class="post__meta">
          <span class="post__tag">${esc(n.tag)}</span>
          <time datetime="${esc(n.date)}">${new Date(n.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })}</time>
        </p>
        <h3 class="post__title">${esc(n.title)}</h3>
        <p class="post__text">${esc(n.text)}</p>
      </article>`).join('');
  }

  $('#faqList').innerHTML = FAQ.map((f) => `
    <div class="qa" data-reveal>
      <button class="qa__btn" aria-expanded="false"><span>${esc(f.q)}</span><span class="qa__sign" aria-hidden="true"></span></button>
      <div class="qa__body"><div><p>${esc(f.a)}</p></div></div>
    </div>`).join('');

  $('#faqList').addEventListener('click', (e) => {
    const btn = e.target.closest('.qa__btn');
    if (!btn) return;
    const qa = btn.closest('.qa');
    btn.setAttribute('aria-expanded', String(qa.classList.toggle('is-open')));
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
  const big = 'a, button, .holes__btn, [data-magnet]';
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

  safe('heroVideo', heroVideo);
  safe('bandVideos', bandVideos);
  safe('nav', nav);
  safe('ticker', ticker);
  safe('counters', counters);
  safe('blocks', blocks);
  safe('greenfee', greenfee);
  safe('course', course);
  safe('statement', statement);
  safe('anchors', anchors);
  safe('cursor', cursor);
  safe('magnets', magnets);
  safe('reveal', reveal);      /* efter att allt innehåll finns i DOM:en */
  safe('preloader', preloader);

  addEventListener('load', () => clearTimeout(failsafe), { once: true });
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
