(function () {
  'use strict';
  
    // ---------------------------------------------------------------------------
  // SVG placeholder generator
  // ---------------------------------------------------------------------------
  function makeSVG(evt) {
    const c = evt.color || '#1a6080';
    const t = evt.title.split(' ').slice(0, 3).join(' ');
    const mya = evt.mya >= 1000 ? (evt.mya / 1000).toFixed(1) + ' Ga' : evt.mya + ' Ma';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>
      <defs>
        <radialGradient id='g${evt.mya}' cx='50%' cy='50%' r='70%'>
          <stop offset='0%' stop-color='${c}' stop-opacity='0.35'/>
          <stop offset='100%' stop-color='#010810'/>
        </radialGradient>
      </defs>
      <rect width='400' height='300' fill='#020c18'/>
      <rect width='400' height='300' fill='url(#g${evt.mya})'/>
      <circle cx='200' cy='130' r='48' fill='none' stroke='${c}' stroke-width='1' opacity='0.5'/>
      <circle cx='200' cy='130' r='32' fill='${c}' opacity='0.18'/>
      <text x='200' y='136' font-family='Georgia,serif' font-size='13' fill='${c}' text-anchor='middle' opacity='0.9'>${mya}</text>
      <text x='200' y='210' font-family='Georgia,serif' font-size='14' fill='#b0ccd8' text-anchor='middle'>${t}</text>
      <text x='200' y='228' font-family='Georgia,serif' font-size='11' fill='#5a8a9a' text-anchor='middle' font-style='italic'>placeholder image</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // ---------------------------------------------------------------------------
  // Hero canvas: animated bioluminescent particles
  // ---------------------------------------------------------------------------
  function initCanvas() {
    const c = document.getElementById('hc');
    if (!c) return;
    const ctx = c.getContext('2d');
    let W, H, pts = [];

    function resize() { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; }
    function mkPt() {
      return {
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.4 + 0.2,
        vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
        a: Math.random() * 0.45 + 0.08, ph: Math.random() * Math.PI * 2
      };
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.ph += 0.018;
        const a = p.a * (0.55 + 0.45 * Math.sin(p.ph));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,200,224,${a})`; ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      });
      requestAnimationFrame(draw);
    }
    window.addEventListener('resize', resize);
    resize();
    pts = Array.from({ length: 160 }, mkPt);
    draw();
  }

  // ---------------------------------------------------------------------------
  // Build geological timescale sidebar
  // ---------------------------------------------------------------------------
  // Map period name → array of stage DOM elements, for fast open/close in updateSidebar
  const _stageEls = {};

  // Scroll to the event whose mya is closest to the midpoint of a timescale unit
  function scrollToMya(s, e) {
    const mid = (s + e) / 2;
    // Find the event with mya closest to mid
    let best = 0, bestDist = Infinity;
    EVENTS.filter(Boolean).forEach((ev, i) => {
      // Prefer events actually within the range; fall back to closest
      const inRange = ev.mya <= s && ev.mya >= e;
      const dist = inRange ? 0 : Math.abs(ev.mya - mid);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    scrollToEvent(best);
  }

  function makeSidebarClickable(el) {
    el.addEventListener('click', () => scrollToMya(+el.dataset.s, +el.dataset.e));
  }

  function buildSidebar() {
    const d = document.getElementById('gtd');
    if (!d) return;

    TS.eons.forEach(eon => {
      const el = document.createElement('div');
      el.className = 'gu eon';
      // Eon: solid colour background tint + solid left border
      el.style.cssText = `background:${eon.c}22;color:${eon.c};border-left-color:${eon.c}`;
      el.dataset.s = eon.s; el.dataset.e = eon.e;
      el.textContent = eon.n;
      d.appendChild(el);
      makeSidebarClickable(el);

      TS.eras.filter(r => r.s <= eon.s && r.e >= eon.e).forEach(era => {
        const e2 = document.createElement('div');
        e2.className = 'gu era';
        // Era: lighter tint, left border in era colour
        e2.style.cssText = `background:${era.c}14;color:${era.c};border-left-color:${era.c}`;
        e2.dataset.s = era.s; e2.dataset.e = era.e;
        e2.textContent = era.n;
        d.appendChild(e2);
        makeSidebarClickable(e2);

        TS.periods.filter(p => p.s <= era.s && p.e >= era.e).forEach(per => {
          const e3 = document.createElement('div');
          e3.className = 'gu per';
          // Period: very faint tint, period colour text
          e3.style.cssText = `background:${per.c}0a;color:${per.c}cc`;
          e3.dataset.s = per.s; e3.dataset.e = per.e;
          e3.textContent = per.n;
          d.appendChild(e3);
          makeSidebarClickable(e3);

          // Stages
          const stages = (TS.stages || {})[per.n] || [];
          _stageEls[per.n] = stages.map(st => {
            const e4 = document.createElement('div');
            e4.className = 'gu stg';
            e4.style.cssText = `color:${st.c}99`;
            e4.dataset.s = st.s; e4.dataset.e = st.e;
            e4.textContent = st.n;
            d.appendChild(e4);
            makeSidebarClickable(e4);
            return e4;
          });
        });
      });
    });
  }

  function updateSidebar(mya) {
    // Determine active period name (used to open/close stages)
    let activePer = null;
    document.querySelectorAll('.gu').forEach(el => {
      const active = mya <= +el.dataset.s && mya >= +el.dataset.e;
      el.classList.toggle('act', active);
      if (active && el.classList.contains('per')) activePer = el.textContent.trim();
    });

    // Open stages only for the currently active period; close all others
    Object.entries(_stageEls).forEach(([perName, els]) => {
      const open = perName === activePer;
      els.forEach(el => {
        el.classList.toggle('open', open);
        // Mark active stage within the open set
        if (open) el.classList.toggle('act', mya <= +el.dataset.s && mya >= +el.dataset.e);
        else el.classList.remove('act');
      });
    });

    // Value
    const sv = document.getElementById('sbmv');
    if (sv) {
      if      (mya >= 1000)       sv.textContent = (mya / 1000).toFixed(2);
      else if (mya >= 1)          sv.textContent = mya.toFixed(1);
      else if (mya >= 0.001)      sv.textContent = (mya * 1000).toFixed(0);
      else if (mya >= 0.000001)   sv.textContent = Math.round(mya * 1000000);
      else                        sv.textContent = '0';
    }
    // Unit label
    const sl = document.getElementById('sbml');
    if (sl) {
      if      (mya >= 1000)       sl.textContent = 'Ga ago';
      else if (mya >= 1)          sl.textContent = 'Ma ago';
      else if (mya >= 0.001)      sl.textContent = 'ka ago';
      else if (mya >= 0.000001)   sl.textContent = 'years ago';
      else                        sl.textContent = 'Present';
    }
  }

  // ---------------------------------------------------------------------------
  // Build event cards
  // ---------------------------------------------------------------------------
  function buildEvents() {
    const col = document.getElementById('evcol');
    if (!col) return;
    let lastEon = null;

    EVENTS.forEach((ev, i) => {
      // Insert eon divider whenever the eon changes
      if (ev.eon && ev.eon !== lastEon) {
        lastEon = ev.eon;
        const eonD = TS.eons.find(e => e.n === ev.eon);
        const c = eonD ? eonD.c : '#888';
        const div = document.createElement('div');
        div.className = 'ediv'; div.style.color = c;
        div.innerHTML = `<div class="edl" style="background:${c}"></div><div class="edlb">${ev.eon} Eon</div><div class="edl" style="background:${c}"></div>`;
        col.appendChild(div);
      }

      // Format age label
      const myaL = ev.mya >= 1000
        ? (ev.mya / 1000).toFixed(2) + ' Ga'
        : ev.mya >= 1
          ? ev.mya.toFixed(1) + ' Ma'
          : (ev.mya * 1000).toFixed(0) + ' ka';

      // Image: use provided path, fall back to generated SVG placeholder
      const imgSrc = ev.image ? ev.image : makeSVG(ev);

      const card = document.createElement('div');
      card.className = 'ec';
      card.id = 'ev' + i;
      card.dataset.i = i;
      card.dataset.mya = ev.mya;

      card.innerHTML = `
        <div class="eam">
          <div class="ead"></div>
          <span class="eat">${myaL}</span>
          <div class="eal"></div>
        </div>
        <div class="eiw" tabindex="0" role="button" aria-label="More about: ${ev.title}">
          <img src="${imgSrc}" alt="${ev.title}" loading="lazy">
          <div class="epop" role="tooltip">${ev.detail}</div>
        </div>
        <p class="ecap">${ev.cap}</p>`;

      // Card first, then connector — keeps IDs aligned with EVENTS indices
      col.appendChild(card);

      if (i < EVENTS.length - 1) {
        const cn = document.createElement('div');
        cn.className = 'econn';
        col.appendChild(cn);
      }

      // Touch popover toggle (mobile)
      const wrap = card.querySelector('.eiw');
      const pop  = card.querySelector('.epop');

      wrap.addEventListener('touchstart', e => {
        e.preventDefault();
        const open = pop.style.opacity === '1';
        document.querySelectorAll('.epop').forEach(p => {
          p.style.opacity = '0'; p.style.pointerEvents = 'none'; p.style.transform = '';
        });
        if (!open) {
          pop.style.opacity = '1';
          pop.style.pointerEvents = 'auto';
          pop.style.transform = 'translateX(0)';
        }
      }, { passive: false });

      wrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') wrap.dispatchEvent(new TouchEvent('touchstart'));
      });
    });

    document.querySelectorAll('.ec').forEach(el => obs.observe(el));
    document.getElementById('nct').textContent = `1/${EVENTS.length}`;
  }

  // Intersection observer — fades cards in as they scroll into view
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });

  // ---------------------------------------------------------------------------
  // Floating time indicator
  // ---------------------------------------------------------------------------
  function updateFloatingTime(mya) {
    const v  = document.getElementById('ftv');
    const u  = document.getElementById('ftu');
    const pn = document.getElementById('ftpn');
    if (!v) return;

    let val, unit;
    if (mya >= 1000)         { val = (mya / 1000).toFixed(2);          unit = 'Ga ago'; }
    else if (mya >= 1)       { val = mya.toFixed(1);                    unit = 'Ma ago'; }
    else if (mya >= 0.001)   { val = (mya * 1000).toFixed(0);           unit = 'ka ago'; }
    else if (mya >= 0.000001){ val = Math.round(mya * 1000000).toString(); unit = 'years ago'; }
    else                     { val = 'Present';                          unit = '';       }

    v.textContent = val;
    u.textContent = unit;

    const p   = TS.periods.find(p => mya <= p.s && mya >= p.e);
    const er  = TS.eras.find(r => mya <= r.s && mya >= r.e);
    const eon = TS.eons.find(e => mya <= e.s && mya >= e.e);
    if (pn) pn.textContent = p ? p.n : (er ? er.n : (eon ? eon.n : ''));
  }

  // ---------------------------------------------------------------------------
  // Get current MYA by interpolating between the two nearest event cards.
  // This is event-position-aware so it works correctly no matter how many
  // events you add or how unevenly they are spaced in geological time.
  // ---------------------------------------------------------------------------
  function getMyaFromScroll() {
    const cards = Array.from(document.querySelectorAll('.ec'));
    if (!cards.length) return EVENTS[0].mya;

    // Probe = vertical position of the dashed line (#tdl), which is fixed to the viewport.
    const tdl = document.getElementById('tdl');
    const probe = tdl ? tdl.getBoundingClientRect().top : window.innerHeight * 0.75;

    // Absolute document position of each card's image top.
    // Using scrollY + getBoundingClientRect().top gives a stable document-space coordinate
    // that does not change as the user scrolls, so we can compare across frames.
    const sy = window.scrollY;
    const imgDocTops = cards.map(c => {
      const img = c.querySelector('.eiw');
      return (img || c).getBoundingClientRect().top + sy;
    });

    // Probe in document space
    const probeDoc = probe + sy;

    // Find last card whose image top is at or above the probe (scrolled into view past the line)
    // and the next card below it.
    let above = -1;
    for (let i = 0; i < imgDocTops.length; i++) {
      if (imgDocTops[i] <= probeDoc) above = i;
      else break;
    }

    // above === -1: probe is above all cards (still in hero) → show oldest age
    if (above === -1) return EVENTS[0].mya;

    const below = above + 1;

    // below out of range: probe is past all cards (bottom of page) → show youngest age
    if (below >= cards.length) return EVENTS[EVENTS.length - 1].mya;

    // Smooth interpolation between the two surrounding events
    const t = (probeDoc - imgDocTops[above]) / (imgDocTops[below] - imgDocTops[above]);
    return EVENTS[above].mya + t * (EVENTS[below].mya - EVENTS[above].mya);
  }

  // ---------------------------------------------------------------------------
  // Get the index of the event card closest to the viewport centre
  // ---------------------------------------------------------------------------
  function getActiveIdx() {
    const mid = window.innerHeight * 0.45;
    let best = 0, bd = Infinity;
    document.querySelectorAll('.ec').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  // ---------------------------------------------------------------------------
  // Navigation buttons
  // ---------------------------------------------------------------------------
  let curIdx = 0;

  function updateNav(idx) {
    curIdx = idx;
    const prev = document.getElementById('nprev');
    const next = document.getElementById('nnext');
    const ctr  = document.getElementById('nct');
    if (prev) prev.disabled = idx <= 0;
    if (next) next.disabled = idx >= EVENTS.length - 1;
    if (ctr)  ctr.textContent = `${idx + 1}/${EVENTS.length}`;
  }

  function scrollToEvent(idx) {
    const el = document.getElementById('ev' + idx);
    if (!el) return;
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * 0.18, behavior: 'smooth' });
    updateNav(idx);
  }

  // ---------------------------------------------------------------------------
  // Scroll handler (throttled via rAF)
  // ---------------------------------------------------------------------------
  function onScroll() {
    const sy = window.scrollY;
    const hH = (document.getElementById('hero') || { offsetHeight: window.innerHeight }).offsetHeight;
    const ft   = document.getElementById('ftw');
    const tdl  = document.getElementById('tdl');
    const scue = document.getElementById('scue');

    // Hide scroll cue once user starts scrolling
    if (scue) scue.classList.toggle('hidden', sy > 40);

    // Detect footer proximity — hide ftw and tdl before they overlap the footer
    const footer = document.querySelector('footer.footer, div.nav-footer');
    let nearFooter = false;
    if (footer) {
      const footerTop = footer.getBoundingClientRect().top;
      const ftEl = document.getElementById('ftw');
      if (ftEl) {
        const ftBottom = ftEl.getBoundingClientRect().bottom;
        // Add 16px breathing room
        nearFooter = ftBottom + 16 >= footerTop;
      }
    }

    // Show floating time only after scrolling past hero, hide near footer
    const pastHero = sy >= hH * 0.6;
    if (ft)  ft.classList.toggle('hid',  !pastHero || nearFooter);
    if (tdl) tdl.classList.toggle('hid', !pastHero || nearFooter);

    const mya = getMyaFromScroll();
    updateFloatingTime(mya);
    updateSidebar(mya);
    updateNav(getActiveIdx());
    alignDashedLine();
  }

  // No rAF throttle — fire on every scroll event so reversal at page bottom
  // is never missed. Browsers already throttle scroll events to display rate.
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scrollend', onScroll, { passive: true });

  // Close popovers when tapping outside on mobile
  document.addEventListener('touchstart', e => {
    if (!e.target.closest('.eiw')) {
      document.querySelectorAll('.epop').forEach(p => {
        p.style.opacity = '0'; p.style.pointerEvents = 'none'; p.style.transform = '';
      });
    }
  }, { passive: true });

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
  // ---------------------------------------------------------------------------
  // Quarto navbar: add frost effect on scroll
  // ---------------------------------------------------------------------------
  const quartoHeader = document.getElementById('quarto-header');
  if (quartoHeader) {
    const frostNav = () => quartoHeader.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', frostNav, { passive: true });
    frostNav();
  }

    initCanvas();
    buildSidebar();
    buildEvents();

    const prev = document.getElementById('nprev');
    const next = document.getElementById('nnext');
    const scue = document.getElementById('scue');

    if (prev) prev.addEventListener('click', () => scrollToEvent(Math.max(0, curIdx - 1)));
    if (next) next.addEventListener('click', () => scrollToEvent(Math.min(EVENTS.length - 1, curIdx + 1)));
    if (scue) scue.addEventListener('click', () => {
      const h = document.getElementById('hero');
      window.scrollTo({ top: h ? h.offsetHeight : window.innerHeight, behavior: 'smooth' });
    });

    updateFloatingTime(EVENTS[0].mya);
    updateSidebar(EVENTS[0].mya);
    updateNav(0);
    alignDashedLine();
    window.addEventListener('resize', alignDashedLine);
  });

  // ---------------------------------------------------------------------------
  // Align dashed line to the vertical centre of the floating time pill
  // ---------------------------------------------------------------------------
  function alignDashedLine() {
    const pill = document.querySelector('.tpill');
    const tdl  = document.getElementById('tdl');
    if (!pill || !tdl) return;
    // getBoundingClientRect gives us the pill's position relative to viewport
    const r = pill.getBoundingClientRect();
    const pillCentreFromBottom = window.innerHeight - (r.top + r.height / 2);
    document.documentElement.style.setProperty('--tdl-bottom', pillCentreFromBottom + 'px');
  }

})();
