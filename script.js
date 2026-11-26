gsap.registerPlugin(ScrollTrigger, Observer, ScrollToPlugin);

//fix reload issue
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
ScrollTrigger.clearScrollMemory?.("manual");  
window.scrollTo(0, 0);

//pin at end on second curtain
const pinEl = document.querySelector(".pin-at-end");
if (pinEl) {
  const setH = () => pinEl.style.setProperty("--pin-h", pinEl.offsetHeight + "px");
  setH();
  new ResizeObserver(setH).observe(pinEl);
}

//image runway so things arent skipped
function addImageRunway() {
  const introSection = document
    .querySelector(".graphic-stage")
    ?.closest(".centered-on-white, .narration-no-image");

  gsap.utils.toArray(".centered-on-white, .narration-no-image").forEach((section) => {
    gsap.utils.toArray(".step-line", section).forEach((s) => {
      const introSteps = introSection ? [...introSection.querySelectorAll(".step-line[data-scrub]")] : [];
const lastIntro = introSteps[introSteps.length - 1];
if (lastIntro) lastIntro.style.minHeight = "62svh";   // 22 + 40 of hold on the final image
      if (!(s.dataset.svg && !s.textContent.trim())) return;
      if (section === introSection) {
        s.dataset.scrub = "1";
        s.style.minHeight = "22svh";   // scroll distance per image
        s.style.margin = "0";
        s.style.padding = "0";
      } else {
        s.style.minHeight = "55svh";
      }
    });
  });
}

function initIntroScrub() {
  const stage = document.querySelector(".graphic-stage");
  const section = stage?.closest(".centered-on-white, .narration-no-image");
  if (!section) return;

  const kids = graphicKids(stage);
  if (kids.length < 2) return;

  gsap.set(kids, { autoAlpha: 0, y: 0 });
  gsap.set(kids[0], { autoAlpha: 1 });
  stage.dataset.current = "intro-scrub";   // stops other triggers swapping this stage

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
  trigger: section,
  start: 0,
  end: () => {
    const first = document.querySelector(".photo_fade_bg_steps .step-line");
    const textStart = first.getBoundingClientRect().top + window.scrollY - innerHeight * 0.75;
    return Math.max(100, textStart);   // absolute scroll position
  },
  scrub: 0.4,
  invalidateOnRefresh: true,
},
  });

  // each step = 1 unit: 0.6 crossfade, 0.4 hold
  kids.slice(1).forEach((k, i) => {
    tl.to(kids[i], { autoAlpha: 0, duration: 0.6 }, i)
      .to(k,       { autoAlpha: 1, duration: 0.6 }, i);
  });
  tl.to({}, { duration: 0.4 });   // hold on the last image
}

const smooth = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

//conditions bar

const MARKS = {
  yes: { color: '#509464', width: 2.6, paths: [{ d: 'M9.5 9.5 L13 15 L22.5 3.5', len: 24, delay: 0 }] },
  no:      { color: '#b25a3f', width: 2.6, paths: [{ d: 'M7.5 7.5 L16.5 16.5', len: 13, delay: 0 },
                                                   { d: 'M16.5 7.5 L7.5 16.5', len: 13, delay: 0.25 }] },
  partial: { color: '#d5861e', width: 2.6, paths: [{ d: 'M8.5 13.5 L22.5 8.5', len: 12, delay: 0 }] }
};

function buildMarks(box) {
  box.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"
      stroke-linecap="round" stroke-linejoin="round">` +
    Object.entries(MARKS).map(([k, m]) =>
      m.paths.map(p => `<path class="m-${k}" d="${p.d}" style="opacity:0"/>`).join('')
    ).join('') + `</svg>`;
}

function drawMark(box, v) {
  console.log('drawMark', v);   // proves this version of the script is the one running
  Object.entries(MARKS).forEach(([k, m]) => {
    box.querySelectorAll('.m-' + k).forEach((p, i) => {
      gsap.killTweensOf(p);
      if (k === v) {
        const len = m.paths[i].len;
        gsap.set(p, { stroke: m.color, strokeWidth: m.width, strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
        gsap.to(p, { strokeDashoffset: 0, duration: 0.35, delay: m.paths[i].delay, ease: 'power2.out' });
      } else {
        gsap.to(p, { opacity: 0, duration: 0.15 });
      }
    });
  });
}

function initConditionsBar() {
  const bar = document.getElementById('conditions-bar');
  const labels = {
    yes: 'meets the condition',
    no: 'does not meet the condition',
    partial: 'partly meets the condition',
    pending: 'not yet assessed'
  };
  const toEnd = () => ScrollTrigger.maxScroll(window);
  

  // 1. build the SVG marks inside each box
  bar.querySelectorAll('.box').forEach(buildMarks);
   const LOGO_VH = 1.41;  

  const logo = document.createElement('a');
  logo.className = 'bar-logo';
  logo.href = '#top';
  logo.setAttribute('aria-label', 'Back to the title screen');
  logo.innerHTML = '<img src="media/images/logo.png" alt="The Death and Life of Greenwich Village">';
  logo.addEventListener('click', e => {
    e.preventDefault();
    const y = LOGO_VH * window.innerHeight;
    console.log('logo click, jumping to', y);

    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    root.style.scrollBehavior = prev;
  });
  bar.prepend(logo);

  // 1c. number each condition and wrap its contents in a link
  bar.querySelectorAll('li').forEach((li, i) => {
    const a = document.createElement('a');
    a.className = 'cond-link';
    a.href = '#section-' + li.dataset.condition;
    while (li.firstChild) a.appendChild(li.firstChild);
    li.appendChild(a);

    const num = document.createElement('span');
    num.className = 'cond-num';
    num.textContent = (i + 1) + '.';
    a.querySelector('.box').after(num);   // number sits between the box and the label
  });

  // 2. swap marker paragraphs for invisible anchors
  const anchors = [];
  const re = /^@(bar|condition|verdict)(?:\s+([\w-]+))?(?:\s+(yes|no|partial))?$/i;

  document.querySelectorAll('.step-line p').forEach(p => {
    const lines = p.innerHTML
      .split(/<br\s*\/?>|\n/i)
      .map(s => s.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);
    if (!lines.length || !lines.every(l => re.test(l))) return;

    const frag = document.createDocumentFragment();
    lines.forEach(l => {
      const m = l.match(re);
      const a = document.createElement('div');
      a.className = 'cond-anchor';
      a.dataset.type = m[1].toLowerCase();
      if (m[2]) a.dataset.condition = m[2].toLowerCase();
      if (m[3]) a.dataset.verdict = m[3].toLowerCase();
      frag.appendChild(a);
      anchors.push(a);
    });
    p.replaceWith(frag);
  });

  // 2b. wire the links to the first anchor of each condition
  bar.querySelectorAll('.cond-link').forEach(a => {
    const c = a.parentElement.dataset.condition;
    const target = anchors.find(x => x.dataset.type === 'condition' && x.dataset.condition === c);
    if (!target) return;
    target.id = 'section-' + c;
    a.addEventListener('click', e => {
      e.preventDefault();
      // land the anchor at ~35% down the viewport so its ScrollTrigger (top 40%) fires
      const y = target.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.35;
      window.scrollTo({ top: y, behavior: smooth() });
    });
  });


  console.log('conditions-bar anchors found:', anchors.length);

  // 3. bar slides in at @bar
  gsap.set(bar, { yPercent: -100 });
  const barAnchor = anchors.find(a => a.dataset.type === 'bar');
  if (barAnchor) {
    ScrollTrigger.create({
      trigger: barAnchor,
      start: 'top 40%',
      end: toEnd,
      onToggle: self => gsap.to(bar, {
        yPercent: self.isActive ? 0 : -100,
        duration: 0.35, ease: 'power2.out', overwrite: true
      })
    });
  }

  // 4. one trigger per condition/verdict anchor
  const reached = new Set();
  anchors.filter(a => a.dataset.type !== 'bar').forEach(a => {
    ScrollTrigger.create({
      trigger: a,
      start: 'top 40%',
      end: toEnd,
      onToggle: self => {
        self.isActive ? reached.add(a) : reached.delete(a);
        update();
      }
    });
  });

  // 5. derive the bar's state from the reached anchors
  function update() {
    const state = {};
    let current = null;
    anchors.forEach(a => {
      if (!reached.has(a)) return;
      if (a.dataset.type === 'condition') current = a.dataset.condition;
      if (a.dataset.type === 'verdict') state[a.dataset.condition] = a.dataset.verdict;
    });

    bar.querySelectorAll('li').forEach(li => {
      const c = li.dataset.condition;
      const box = li.querySelector('.box');
      const v = state[c] || 'pending';

      if (box.dataset.state !== v) {
        box.dataset.state = v;
        box.setAttribute('role', 'img');
        box.setAttribute('aria-label', labels[v]);
        drawMark(box, v);
      }

      li.classList.toggle('is-active', c === current);
    });
  }

  // 6. recalc trigger positions after layout settles
  ScrollTrigger.refresh();
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
}

//checkboxes on flyers

// FLYER CHECKBOXES (both flyers)
// Reuses MARKS, buildMarks() and drawMark() from the conditions bar script,
// so this must load after it (or be pasted below it).

const FLYER_LABELS = {
  yes: 'meets the condition',
  no: 'does not meet the condition',
  partial: 'partly meets the condition',
  blank: 'not yet assessed'
};

const FLYERS = [
  {
    // flyer #1: every h3 gets an empty box, no marks
    selector: 'article.step.flyer:not([data-section="Conditions Scorecard"])',
    blank: true
  },
  {
    // flyer #2: marks drawn in order, one per h3
    selector: 'article.step.flyer[data-section="Conditions Scorecard"]',
    verdicts: ['yes', 'partial', 'partial', 'partial']
  }
];

function initFlyerChecks() {
  FLYERS.forEach(setupFlyer);
}

function setupFlyer(cfg) {
  const root = document.querySelector(cfg.selector);
  if (!root) { console.warn('flyer-checks: article not found', cfg.selector); return; }

  // returns true once the h3s exist and the boxes are added
  const addBoxes = () => {
    const heads = root.querySelectorAll('h3');
    if (!heads.length) return false;
    if (root.dataset.checksDone) return true;
    root.dataset.checksDone = '1';

    const boxes = [];
    heads.forEach((h, i) => {
      const v = cfg.blank ? 'blank' : cfg.verdicts[i];
      if (!v) return;
      const box = document.createElement('span');
      box.className = 'flyer-box';
      box.setAttribute('role', 'img');
      box.setAttribute('aria-label', FLYER_LABELS[v]);
      buildMarks(box);              // marks stay hidden (opacity 0) until drawMark runs
      h.prepend(box);
      if (!cfg.blank) boxes.push({ box, v });
    });

    console.log('flyer-checks: boxes added', heads.length, cfg.blank ? '(blank)' : '');

    // blank flyer: nothing to draw
    if (cfg.blank) { ScrollTrigger.refresh(); return true; }

    // draw the marks in one after another when the first h3 scrolls into view
    ScrollTrigger.create({
      trigger: heads[0],
      start: 'top 80%',
      once: true,
      onEnter: () => boxes.forEach(({ box, v }, i) =>
        gsap.delayedCall(i * 0.3, () => drawMark(box, v)))
    });
    ScrollTrigger.refresh();
    return true;
  };

  // the md is injected after load, so wait for the h3s if they aren't there yet
  if (addBoxes()) return;
  const mo = new MutationObserver(() => { if (addBoxes()) mo.disconnect(); });
  mo.observe(root, { childList: true, subtree: true });
}

//end checkboxes on flyers

// this is the parser

async function loadSections(mdPath) {
  const res = await fetch(mdPath);
  let raw = (await res.text()).replace(/\r\n/g, "\n");

  const chunks = raw.split(/\n(?=##### )/).filter(Boolean);
  const sections = {};

  chunks.forEach((chunk) => {
    const match = chunk.match(/^#####\s+(.*)\n/);
    if (!match) return;
    const key = match[1].trim();
    const body = chunk.slice(match[0].length).trim();

    const rawSteps = body.split(/\n(?=<!--\s*svg:)/).filter(Boolean);

    sections[key] = rawSteps.map((stepChunk) => {
      const svgMatch = stepChunk.match(/^<!--\s*svg:\s*(.*?)\s*-->(?:\n|$)/);
      const parts = svgMatch ? svgMatch[1].trim().split(/\s+/) : [];
      const svgName = parts[0] || null;
      const svgState = parts[1] || null;          // optional, e.g. "e2"
      const text = svgMatch ? stepChunk.slice(svgMatch[0].length) : stepChunk;
      return { svg: svgName, state: svgState, html: marked.parse(text.trim()) };
    });
  });

  return sections;
}

async function renderSteps() {
  const sections = await loadSections("media/text/content.md");

  document.querySelectorAll(".step[data-section]").forEach((el) => {
    const key = el.dataset.section;
    const steps = sections[key];
    if (!steps) {
      console.warn(`No markdown section found for "${key}"`);
      return;
    }

    el.innerHTML = "";
    steps.forEach((step, i) => {
      const line = document.createElement("div");
      line.className = "step-line";
      line.dataset.svg = step.svg || "";
      line.dataset.state = step.state || "";
      line.dataset.index = i;
      line.innerHTML = step.html;
      el.appendChild(line);
    });
  });
  initConditionsBar();
  initFlyerChecks();
}



// THIS IS THE MAIN SCROLLY ENGINE

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// text fades
const CURTAIN_FADE_ZONE = 0.15;

// graphic crossfades
const FADE_OUT  = .5;
const FADE_IN   = .5;
const FADE_EASE = "power1.inOut";

// photo fade (time-based)
const PHOTO_FADE_DURATION = .9;

// scroll stops
const DEBUG_STOPS   = false;  // true: logs + trigger markers
const CARD_HOLD_MS  = 500;   // brief hold on each curtain / photo_fade card

// register plugins (skips any whose script tag is missing, and says so)
const plugins = [window.ScrollTrigger, window.Observer, window.ScrollToPlugin];
if (plugins.some((p) => !p)) {
  console.warn("[gsap] a plugin script is missing (ScrollTrigger / Observer / ScrollToPlugin)");
}
gsap.registerPlugin(...plugins.filter(Boolean));

const log = (...a) => DEBUG_STOPS && console.log("[stops]", ...a);


/* =========================================================
   CURTAIN TEXT FADES
   ========================================================= */
function updateCurtainFades() {
  const vh = window.innerHeight;
  const zone = vh * CURTAIN_FADE_ZONE;

  document.querySelectorAll(".curtain .step-line").forEach((box) => {
    if (reduceMotion.matches) { box.style.opacity = 1; return; }
    const b = box.getBoundingClientRect();
    const fadeIn  = Math.max(0, Math.min(1, (vh - b.top) / zone));
    const fadeOut = Math.max(0, Math.min(1, b.bottom / zone));
    box.style.opacity = Math.min(fadeIn, fadeOut).toFixed(3);
  });
}

window.addEventListener("scroll", () => requestAnimationFrame(updateCurtainFades), { passive: true });
window.addEventListener("resize", updateCurtainFades);


/* =========================================================
   GRAPHICS (swap / crossfade)
   ========================================================= */
const zoomHandlers = {};

// children of a stage that are graphics (not the scroll cue)
const graphicKids = (stage) =>
  gsap.utils.toArray(stage.children).filter((c) => !c.classList.contains("scroll-cue"));

function updateGraphic(id) {
  let zoomIn = null;
  const m = id && id.match(/^(.*)-zoom-(in|out)$/);
  if (m) { zoomIn = m[2] === "in"; id = m[1]; }

  const target = id ? document.getElementById(id) : null;
  const stage = target?.closest(".graphic-stage");
  if (!stage) return;

  const panel = graphicKids(stage).find((c) => c === target || c.contains(target));
  if (!panel) return;

  if (zoomIn !== null && zoomHandlers[id]) zoomHandlers[id](zoomIn);

  if (stage.dataset.current === id) return;
  stage.dataset.current = id;
  updateCue(stage, id);   

  const FADE_ONLY = ["chart-h1"];
const isFlat = (g) => FADE_ONLY.some((id) => g.id === id || g.querySelector("#" + id));

graphicKids(stage).forEach((g) => {
  if (g === panel) {
    if (isFlat(g)) gsap.to(g, { autoAlpha: 1, y: 0, duration: 1.2, ease: FADE_EASE, overwrite: true });
    else gsap.fromTo(g, { y: 20 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: FADE_EASE, overwrite: true });
  } else {
    gsap.to(g, { autoAlpha: 0, y: isFlat(g) ? 0 : -20, duration: 0.8, ease: FADE_EASE, overwrite: true });
  }
});
}

const CUE_GRAPHICS = 2;   // cue shows on this many graphics, counting from the first

function updateCue(stage, id = stage.dataset.current, instant = false) {
  const cue = stage.querySelector(".scroll-cue");
  if (!cue) return;

  const target = id ? stage.querySelector("#" + CSS.escape(id)) : null;
  const idx = graphicKids(stage).findIndex((c) => c === target || c.contains(target));
  const show = !stage.closest(".photo_fade") && idx > -1 && idx < CUE_GRAPHICS;

  if (instant) gsap.set(cue, { autoAlpha: show ? 1 : 0 });
  else gsap.to(cue, { autoAlpha: show ? 1 : 0, duration: 0.4, ease: FADE_EASE, overwrite: true });
}

const panelOf = (stage, id) => {
  const el = id ? stage.querySelector("#" + CSS.escape(id)) : null;
  return el ? graphicKids(stage).find((c) => c === el || c.contains(el)) : null;
};

const MIN_SHOW_MS = 700;   // minimum time each image stays up
const fadeQ = new WeakMap();

function crossfadeOnly(stage, rawId) {
  if (!rawId) return;   // text-only step-lines don't swap anything
  if (!fadeQ.has(stage)) fadeQ.set(stage, { items: [], last: 0, timer: null });
  const q = fadeQ.get(stage);
  if (q.items[q.items.length - 1] === rawId) return;   // ignore repeats
  q.items.push(rawId);
  pump(stage, q);
}

function pump(stage, q) {
  if (q.timer || !q.items.length) return;
  const wait = q.last + MIN_SHOW_MS - Date.now();
  if (wait > 0) {
    q.timer = setTimeout(() => { q.timer = null; pump(stage, q); }, wait);
    return;
  }
  q.last = Date.now();
  showNow(stage, q.items.shift());
  if (q.items.length) {
    q.timer = setTimeout(() => { q.timer = null; pump(stage, q); }, MIN_SHOW_MS);
  }
}


function showNow(stage, rawId) {
  const m = rawId && rawId.match(/^(.*)-zoom-(in|out)$/);
  const id = m ? m[1] : rawId;
  if (m && zoomHandlers[id]) zoomHandlers[id](m[2] === "in");

  if (!id || stage.dataset.current === id) return;
  const next = panelOf(stage, id);
  if (!next) { console.warn("[graphic] no panel found for", id); return; }

  graphicKids(stage).forEach((g) => {
    if (g === next) {
      gsap.fromTo(g, { y: 0 }, { autoAlpha: 1, y: 0, duration: FADE_IN, ease: FADE_EASE, delay: 0.15, overwrite: true });
    } else {
      gsap.to(g, { autoAlpha: 0, y: 0, duration: FADE_OUT, ease: FADE_EASE, overwrite: true });
    }
  });

  stage.dataset.current = id;
  updateCue(stage, id);
}

// each step-line swaps its graphic as it crosses mid-screen (CSS sticky holds the stage; no pin)
function initGraphicTriggers() {
  gsap.utils.toArray(".step-line").forEach((line) => {
    if (line.dataset.scrub) return;
    const go = () => {
      console.log("[step]", line.dataset.svg, "stage.current =", line.closest(".centered-on-white, .narration-no-image")?.querySelector(".graphic-stage")?.dataset.current);
      const stage = line
        .closest(".centered-on-white, .narration-no-image")
        ?.querySelector(".graphic-stage");

      if (stage) return crossfadeOnly(stage, line.dataset.svg);
      updateGraphic(line.dataset.svg);
    };

    ScrollTrigger.create({
      trigger: line,
      start: "top 50%",
      end: "bottom 50%",
      onEnter: go,
      onEnterBack: go,
    });
  });
}


/* =========================================================
   PHOTO FADE
   ========================================================= */
function initPhotoFade() {
  const section = document.querySelector(".photo_fade");
  const bg = section?.querySelector(".photo_fade_bg");
  if (!bg) return;

  gsap.set(bg, { autoAlpha: 0 });

  gsap.to(bg, {
    autoAlpha: 1,
    duration: PHOTO_FADE_DURATION,
    ease: "power1.inOut",
    paused: true,
    scrollTrigger: {
      trigger: section,
      start: "top 60%",
      toggleActions: "play none none reverse",
    },
  });
}

// photo_fade intro steps: fade/slide in as they enter (scrubbed)
function initPhotoFadeSteps() {
  gsap.utils.toArray(".photo_fade_bg_steps .step-line").forEach((step) => {
    gsap.set(step, { autoAlpha: 0, y: 30 });
    gsap.to(step, {
      autoAlpha: 1, y: 0, ease: "power2.out",
      scrollTrigger: { trigger: step, start: "top 75%", end: "top 45%", scrub: true },
    });
  });
}


/* =========================================================
   SCROLL STOPS
   1) initCardPauses: curtain / photo_fade cards hold scrolling briefly
   2) initImageGate:  image section moves exactly one image per gesture
   Neither one moves the page except the gate's own scrollTo.
   ========================================================= */




/* =========================================================
   CHART STATE SWITCHES
   ========================================================= */

// chart-e: each step that names a state switches the plot (e1 / e2 / e3)
function initChartE() {
  document.querySelectorAll('.step-line[data-svg="chart-e"]').forEach((el) => {
    if (!el.dataset.state) return;
    ScrollTrigger.create({
      trigger: el,
      start: "top 60%",
      onEnter:     () => window.chartE?.show(el.dataset.state),
      onEnterBack: () => window.chartE?.show(el.dataset.state),
    });
  });
}

// chart-h: steps switch the plot AND its title/subtitle/source (population / density / household)
function initChartH() {
  const hStates = ["population", "density", "household"]; // step 1, 2, 3

 const hText = {
  population: {
    title: "Greenwich Village's population shrank, while Manhattan's grew",
    subtitle: "Percent change in residents, 1970-2020",
    source: "Source: U.S. Census Bureau via NHGIS",
  },
  density: {
    title: "Manhattan became more dense; Greenwich Village less",
    subtitle: "Percent change in residents per acre of land, 1970-2020",
    source: "Source: U.S. Census Bureau via NHGIS",
  },
  household: {
    title: "Household size shrank in Greenwich Village and Manhattan",
    subtitle: "Percent change in average household size, 1970-2020",
    source: "Source: U.S. Census Bureau via NHGIS",
  },
};

  const block = document.querySelector("#block-chart-h");
  if (!block) return;

  const els = {
    title:    block.querySelector(".hdc-title"),
    subtitle: block.querySelector(".hdc-subtitle"),
    source:   block.querySelector(".hdc-source"),
  };
  let current = "population";   // matches the text already in the HTML

  function showH(state) {
    window.chartH1?.show(state);
    if (state === current || !hText[state]) return;
    current = state;

    const all = Object.values(els);
    gsap.killTweensOf(all);
    gsap.timeline()
      .to(all, { opacity: 0, duration: 0.2, ease: "power1.out" })
      .add(() => {
        els.title.textContent    = hText[state].title;
        els.subtitle.textContent = hText[state].subtitle;
        els.source.textContent   = hText[state].source;
      })
      .to(all, { opacity: 1, duration: 0.3, ease: "power1.in" });
  }

  document.querySelectorAll('.step-line[data-svg="chart-h1"]').forEach((el, i) => {
    const state = el.dataset.state || hStates[i];
    if (!state) return;
    ScrollTrigger.create({
      trigger: el,
      start: "top 60%",
      onEnter:     () => showH(state),
      onEnterBack: () => showH(state),
    });
  });
}

// chart-l: each step that names a state (l1 ... l6) reveals the timeline up to that entry
function initChartL() {
  document.querySelectorAll('.step-line[data-svg="chart-l"]').forEach((el, i) => {
    if (!el.dataset.state) return;
    ScrollTrigger.create({
      trigger: el,
      start: "top 60%",
      onEnter:     () => window.chartL?.show(el.dataset.state),
      onEnterBack: () => window.chartL?.show(el.dataset.state),
      // scrolling back above the first step empties the timeline again
      onLeaveBack: i === 0 ? () => window.chartL?.show("none") : undefined,
    });
  });
}
/* =========================================================
   INIT
   ========================================================= */
renderSteps().then(() => {
  window.scrollTo(0,0);
  // each stage starts showing only its first graphic (cue stays visible)
  document.querySelectorAll(".graphic-stage").forEach((stage) => {
    const kids = graphicKids(stage);
    if (!kids.length) return;
    gsap.set(kids, { autoAlpha: 0 });
    gsap.set(kids[0], { autoAlpha: 1 });

    const cue = stage.querySelector(".scroll-cue");
    if (cue) gsap.set(cue, { autoAlpha: 1 });

    stage.dataset.current = kids[0].querySelector("[id]:not([id^='block-'])")?.id ?? kids[0].id;
  });

  addImageRunway();
  initGraphicTriggers();
  initIntroScrub();
  initPhotoFade();
  initPhotoFadeSteps();
  
  initChartE();
  initChartH();
  initChartL();

  updateCurtainFades();
  window.scrollTo(0,0);
  ScrollTrigger.refresh();
});

window.addEventListener("load", () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());

//START HAND DRAWN CHART GENERATOR 

/**
 * Hand-inked D3 line chart — reusable, multi-instance safe.
 *
 * Every DOM id, SVG filter id, and CSS class this creates is namespaced
 * with the chart's own instanceId, so you can call createHandDrawnChart()
 * as many times as you want on one page without any collisions.
 *
 * Usage:
 *   <div id="chart-1"></div>
 *   <script>
 *     createHandDrawnChart({
 *       container: "#chart-1",
 *       categories: [
 *         { key:"restaurants", label:"Restaurants & Bars", color:"#f27966" },
 *         { key:"retail",      label:"Independent Retail", color:"#e0a638" },
 *       ],
 *       data: rawData, // see buildDemoData() below for shape
 *     });
 *   </script>
 */
 
let __handDrawnChartCounter = 0;
 
function seededNoise(i, salt) {
  // deterministic pseudo-random in [-1,1], stable across redraws
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}
 
/**
 * Builds a hand-wavered line generator. Each sample point gets a small
 * per-index offset seeded from (index, salt), so redraws stay stable
 * instead of flickering on every interaction.
 */
function makeHandLine(xScale, yScale, seedSalt) {
  return (values) => {
    const pts = values.map((v, i) => {
      const jitterY = seededNoise(i, seedSalt) * 3.5;
      const jitterX = seededNoise(i, seedSalt + 50) * 1.5;
      return [xScale(v.x) + jitterX, yScale(v.y) + jitterY];
    });
    const gen = d3.line().curve(d3.curveCatmullRom.alpha(0.7));
    return gen(pts);
  };
}


/**
 * Creates one hand-inked, interactive line chart (main view + brushable
 * mini timeline + toggleable legend) inside the given container.
 *
 * @param {Object} opts
 * @param {string|HTMLElement} opts.container   CSS selector or element to render into
 * @param {Array}  opts.categories              [{ key, label, color }]
 * @param {Array}  opts.data                    [{ key, values:[{x,y}, ...] }] — one entry per category
 * @param {string} [opts.title]                 optional heading text
 * @param {string} [opts.subtitle]              optional subheading text
 * @param {number} [opts.width=860]
 * @param {number} [opts.mainHeight=380]
 * @param {number} [opts.brushHeight=70]
 * @param {Function} [opts.xFormat]             d3 format fn for x-axis ticks (default: d3.format("d"))
 * @returns {Object} instance handle with { id, redraw(), destroy() }
 */
function createHandDrawnChart(opts) {
  const {
    container,
    categories,
    data,
    title = "",
    subtitle = "",
    width = 860,
    mainHeight = 380,
    brushHeight = 70,
    xFormat = d3.format("d"),
  } = opts;
 
  // ---------- namespacing ----------
  const instanceId = `hdc-${++__handDrawnChartCounter}`;
  const filterId = `${instanceId}-inkwobble`;
  const filterBoldId = `${instanceId}-inkwobble-bold`;
 
  const root = d3.select(
    typeof container === "string" ? container : container
  );
  root.classed("hand-drawn-chart", true).attr("data-instance", instanceId);
 
  // ---------- markup (scoped to this instance) ----------
  root.html(""); // clear in case of re-render
 
  if (title) {
    root.append("h2").attr("class", "hdc-title").text(title);
  }
  if (subtitle) {
    root.append("p").attr("class", "hdc-subtitle").text(subtitle);
  }
 
  const legend = root.append("div").attr("class", "hdc-legend");
  root
    .append("p")
    .attr("class", "hdc-hint")
    .text(
      "click a legend dot to toggle a category · drag on the timeline below to zoom"
    );
 
  const mainSvg = root
    .append("svg")
    .attr("class", "hdc-main")
    .attr("width", width)
    .attr("height", mainHeight);
 
  const brushSvg = root
    .append("svg")
    .attr("class", "hdc-brush")
    .attr("width", width)
    .attr("height", brushHeight);
 
  // ---------- filters (unique ids per instance) ----------
  const defs = mainSvg.append("defs");
 
  defs
    .append("filter")
    .attr("id", filterId)
    .attr("x", "-20%")
    .attr("y", "-20%")
    .attr("width", "140%")
    .attr("height", "140%")
    .html(`
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="7" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
    `);
 
  defs
    .append("filter")
    .attr("id", filterBoldId)
    .attr("x", "-20%")
    .attr("y", "-20%")
    .attr("width", "140%")
    .attr("height", "140%")
    .html(`
      <feTurbulence type="fractalNoise" baseFrequency="0.02 0.09" numOctaves="2" seed="3" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.5" xChannelSelector="R" yChannelSelector="G"/>
    `);
 
  // ---------- state ----------
  let activeKeys = new Set(categories.map((c) => c.key));
  const allX = data[0].values.map((v) => v.x);
  let currentDomain = [allX[0], allX[allX.length - 1]];
 
  // ---------- legend ----------
  legend
    .selectAll("button")
    .data(categories)
    .join("button")
    .attr("class", "hdc-legend-btn")
    .html(
      (d) => `<span class="hdc-swatch" style="background:${d.color}"></span>${d.label}`
    )
    .on("click", function (event, d) {
      if (activeKeys.has(d.key) && activeKeys.size === 1) return; // keep at least one on
      activeKeys.has(d.key) ? activeKeys.delete(d.key) : activeKeys.add(d.key);
      d3.select(this).classed("off", !activeKeys.has(d.key));
      draw(currentDomain);
    });
 
  // ---------- main chart ----------
  const margin = { top: 20, right: 24, bottom: 30, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = mainHeight - margin.top - margin.bottom;
 
  const g = mainSvg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
 
  const x = d3.scaleLinear().range([0, innerWidth]);
  const y = d3.scaleLinear().range([innerHeight, 0]);
 
  const gx = g
    .append("g")
    .attr("class", "hdc-axis")
    .attr("transform", `translate(0,${innerHeight})`);
  const gy = g.append("g").attr("class", "hdc-axis");
 
  const linesLayer = g.append("g");
 
  function draw(domain) {
    currentDomain = domain;
    const visible = data.filter((d) => activeKeys.has(d.key));
 
    x.domain(domain);
    const maxY =
      d3.max(visible, (d) =>
        d3.max(
          d.values.filter((v) => v.x >= domain[0] && v.x <= domain[1]),
          (v) => v.y
        )
      ) || 1;
    y.domain([0, maxY * 1.15]);
 
    const tickCount = Math.max(
      2,
      allX.filter((v) => v >= domain[0] && v <= domain[1]).length
    );
 
    gx.transition()
      .duration(300)
      .call(d3.axisBottom(x).tickFormat(xFormat).ticks(tickCount));
    gy.transition().duration(300).call(d3.axisLeft(y).ticks(5));
 
    const catByKey = Object.fromEntries(categories.map((c) => [c.key, c]));
    const paths = linesLayer
      .selectAll("path.hdc-series")
      .data(visible, (d) => d.key);
 
    paths.join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "hdc-series")
          .attr("fill", "none")
          .attr("stroke", (d) => catByKey[d.key].color)
          .attr("stroke-width", 3)
          .attr("stroke-linecap", "round")
          .attr("filter", `url(#${filterId})`)
          .attr("d", (d) =>
            makeHandLine(x, y, d.key.length)(
              d.values.filter((v) => v.x >= domain[0] && v.x <= domain[1])
            )
          )
          .style("opacity", 0)
          .transition()
          .duration(300)
          .style("opacity", 0.9),
      (update) =>
        update.transition().duration(300).attr("d", (d) =>
          makeHandLine(x, y, d.key.length)(
            d.values.filter((v) => v.x >= domain[0] && v.x <= domain[1])
          )
        ),
      (exit) => exit.transition().duration(200).style("opacity", 0).remove()
    );
  }
 
  // ---------- brush timeline (mini overview) ----------
  const bMargin = { top: 6, right: 24, bottom: 22, left: 40 };
  const bInnerWidth = width - bMargin.left - bMargin.right;
  const bInnerHeight = brushHeight - bMargin.top - bMargin.bottom;
 
  const bg = brushSvg
    .append("g")
    .attr("transform", `translate(${bMargin.left},${bMargin.top})`);
 
  const bx = d3.scaleLinear().domain(currentDomain).range([0, bInnerWidth]);
  const by = d3.scaleLinear().range([bInnerHeight, 0]);
  by.domain([0, d3.max(data, (d) => d3.max(d.values, (v) => v.y)) * 1.1]);
 
  const catByKey2 = Object.fromEntries(categories.map((c) => [c.key, c]));
  data.forEach((d) => {
    bg.append("path")
      .datum(d.values)
      .attr("fill", "none")
      .attr("stroke", catByKey2[d.key].color)
      .attr("stroke-width", 1.6)
      .attr("stroke-opacity", 0.65)
      .attr("filter", `url(#${filterBoldId})`)
      .attr("d", makeHandLine(bx, by, d.key.length + 20));
  });
 
  bg.append("g")
    .attr("class", "hdc-axis")
    .attr("transform", `translate(0,${bInnerHeight})`)
    .call(d3.axisBottom(bx).tickFormat(xFormat).ticks(8));
 
  // step between x values, used to snap the brush selection
  const step = allX.length > 1 ? Math.abs(allX[1] - allX[0]) : 1;
 
  const brush = d3
    .brushX()
    .extent([
      [0, 0],
      [bInnerWidth, bInnerHeight],
    ])
    .on("brush end", (event) => {
      if (!event.selection) return;
      const [x0, x1] = event.selection.map(bx.invert);
      draw([Math.round(x0 / step) * step, Math.round(x1 / step) * step]);
    });
 
  const brushG = bg.append("g").attr("class", "hdc-brush-g").call(brush);
  brushG.call(brush.move, [bx(currentDomain[0]), bx(currentDomain[1])]);
 
  draw(currentDomain);
 
  // ---------- public handle ----------
  return {
    id: instanceId,
    redraw: () => draw(currentDomain),
    destroy: () => root.html(""),
  };
}
 
/**
 * Helper for demo/testing: builds the same shape of fake data as the
 * original prototype, in the generic {key, values:[{x,y}]} format that
 * createHandDrawnChart expects.
 */
function buildDemoData(categories) {
  const years = d3.range(1950, 2021, 5);
  return categories.map((c, ci) => ({
    key: c.key,
    values: years.map((yr, i) => {
      const base = { restaurants: 8, retail: 22, chains: 2, vacant: 3 }[c.key] ?? 5;
      const trend =
        { restaurants: 0.35, retail: -0.28, chains: 0.45, vacant: 0.12 }[c.key] ?? 0;
      const wobble = Math.sin(i * 0.7 + ci) * 2.2;
      return { x: yr, y: Math.max(0, base + trend * i + wobble) };
    }),
  }));
}
 
// Expose on window for plain <script> usage (no bundler required).
if (typeof window !== "undefined") {
  window.createHandDrawnChart = createHandDrawnChart;
  window.buildDemoData = buildDemoData;
}


//END HAND DRAWN CHART GENERATOR

//HELPER FOR CHART TITLES

function addChartHeader(selector, title, subtitle) {
  const root = d3.select(selector);
  root.selectAll(".hdc-head-auto").remove();
  const head = root.insert("div", ":first-child")
    .attr("class", "hdc-head hdc-head-auto");
  head.append("h2").attr("class", "hdc-title").text(title);
  if (subtitle) head.append("p").attr("class", "hdc-subtitle").text(subtitle);
  return head;
}

function addChartSource(selector, text) {
  return d3.select(selector).append("p").attr("class", "hdc-source").text(text);
}

//END HELPER FOR CHART TITLES



//CHARTS

//CHART A: MAP SHORT BLOCKS

function createLegend({ container, title, colors, thresholds, unit = "ft" }) {
  const fmt = (v) => Math.round(v);

  const items = colors.map((color, i) => {
    let label;
    if (i === 0) label = `Under ${fmt(thresholds[0])} ${unit}`;
    else if (i === colors.length - 1) label = `${fmt(thresholds[i - 1])} ${unit} +`;
    else label = `${fmt(thresholds[i - 1])}–${fmt(thresholds[i])} ${unit}`;
    return { color, label };
  });

  const legend = d3.select(container)
    .append("div")
    .attr("class", "hdc-legend");

  legend.append("div")
    .attr("class", "hdc-legend-title")
    .text(title);

  const row = legend.selectAll(".hdc-legend-row")
    .data(items)
    .join("div")
    .attr("class", "hdc-legend-row");

  row.append("span")
    .attr("class", "hdc-legend-swatch")
    .style("background", (d) => d.color);

  row.append("span").text((d) => d.label);

  return legend;
}

Promise.all([
  fetch("data/manhattan_ntas.geojson").then((r) => r.json()),
  fetch("data/block_stats.json").then((r) => r.json()),
  fetch("data/manhattan_segments.geojson").then((r) => r.json()),
]).then(([neighborhoods, medianData, segments]) => {

  // legend bins: <250, 250–300, 300–350, 350–400, 400+
  const thresholds = [275, 300, 325, 350, 375, 400];

  const medianLookup = {};
  medianData.forEach((d) => { medianLookup[d.ntaname] = d; });

  neighborhoods.features.forEach((f) => {
    const stats = medianLookup[f.properties.ntaname];
    f.properties.mean_length_ft   = stats ? stats.mean_length_ft : null;
    f.properties.median_length_ft = stats ? stats.median_length_ft : null;
    // use the json flag, but fall back to matching the name directly
    f.properties.is_gv = (stats && stats.is_gv) ||
      /Greenwich Village|West Village/i.test(f.properties.ntaname || "");
  });

  const nGroups = thresholds.length + 1;

  const colorDark  = "#6a2238";
  const colorMid   = "#e08558";
  const colorLight = "#f9eac0";

  const ramp = d3.scaleLinear()
    .domain([0, 0.5, 1])
    .range([colorDark, colorMid, colorLight])
    .interpolate(d3.interpolateLab);

  const groupColors = d3.range(nGroups).map((i) =>
    ramp(nGroups === 1 ? 0 : i / (nGroups - 1))
  );

  const neighborhoodColorScale = d3.scaleThreshold()
    .domain(thresholds)
    .range(groupColors);




  // 1. neighborhoods
  const neighborhoodMap = createHandDrawnMap({
    container: "#map-a",
    geojson: neighborhoods,
    zoomScale: 3,
    zoomCenter: [0.3, 1],
    valueByFeature: (d) => d.properties.mean_length_ft,
    colorScale: neighborhoodColorScale,
    strokeOnly: false,
  });




  createLegend({
    container: "#map-a",
    title: "Average block length",
    colors: groupColors,
    thresholds: thresholds,
  });

  const inkFilter = `url(#${neighborhoodMap.filterId})`;

//add in Central Park

  const centralPark = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-73.9825, 40.7676], // SW: 59th St & Columbus Circle
        [-73.9585, 40.8012], // NW: 110th St & Central Park West
        [-73.9490, 40.7972], // NE: 110th St & 5th Ave
        [-73.9727, 40.7637], // SE: 59th St & 5th Ave
        [-73.9825, 40.7676]  // back to SW
      ]]
    }
  };

  neighborhoodMap.g
    .insert("path", ":first-child")
    .datum(centralPark)
    .attr("class", "hdc-park")
    .attr("d", neighborhoodMap.path)
    .attr("fill", "#f9eac0")
    .attr("stroke", "none")
    .style("pointer-events", "none");


   // 2. street segments
  neighborhoodMap.g
    .append("g")
    .attr("class", "hdc-streets")
    .attr("filter", inkFilter)
    .style("pointer-events", "none")
    .selectAll("path.hdc-street")
    .data(segments.features.filter((f) => f.geometry != null))
    .join("path")
    .attr("class", "hdc-street")
    .attr("d", neighborhoodMap.path)
    .attr("fill", "none")
    .attr("stroke", "#33302a")
    .attr("stroke-opacity", 0.1)
    .attr("stroke-width", 1.5)
    .attr("stroke-linecap", "round")
    .attr("vector-effect", "non-scaling-stroke");

  // 3. GV border + labels
  const labelFeatures = neighborhoods.features.filter((f) => f.properties.is_gv);


  neighborhoodMap.g
    .append("g")
    .attr("class", "hdc-gv-borders")
    .attr("filter", inkFilter)
    .style("pointer-events", "none")
    .selectAll("path.hdc-gv-border")
    .data(labelFeatures)
    .join("path")
    .attr("class", "hdc-gv-border")
    .attr("d", neighborhoodMap.path)
    .attr("fill", "none")
    .attr("stroke", "#b25a3f")
    .attr("stroke-width", 6)
    .attr("stroke-opacity", 0.7)
    .attr("stroke-linejoin", "round")
    .attr("vector-effect", "non-scaling-stroke");

  neighborhoodMap.g
    .selectAll("text.hdc-label")
    .data(labelFeatures)
    .join("text")
    .attr("class", "hdc-label")
    .style("opacity", 0)
    .attr("x", (d) => neighborhoodMap.path.centroid(d)[0] + 3)
    .attr("y", (d) => neighborhoodMap.path.centroid(d)[1] + 0)
    .attr("text-anchor", "middle")
    .attr("font-size", 10)
    .attr("font-family", "'Jost', sans-serif")
    .attr("font-style", "italic")
    .attr("font-weight", 500)
    .attr("fill", "#ffffff")
    .style("pointer-events", "none")
    .text((d) => d.properties.ntaname);

    //tooltips

      const tooltip = d3.select("body")
    .append("div")
    .attr("class", "hdc-tooltip")
    .style("opacity", 0);

  function moveTooltip(event) {
    const pad = 14;
    const node = tooltip.node();
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    let left = event.clientX + pad;
    let top = event.clientY + pad;
    // keep it on screen
    if (left + w > window.innerWidth - 8) left = event.clientX - w - pad;
    if (top + h > window.innerHeight - 8) top = event.clientY - h - pad;
    tooltip.style("left", `${left}px`).style("top", `${top}px`);
  }

  neighborhoodMap.g
    .selectAll("path.hdc-feature")
    .style("cursor", "pointer")
    .on("mouseenter", function (event, d) {
      const len = d.properties.mean_length_ft;
      tooltip
        .html(
          `<strong>${d.properties.ntaname}</strong><br>` +
          (len != null ? `Average block length: ${Math.round(len)} ft` : "No data")
        )
        .style("opacity", 1);
      moveTooltip(event);
      d3.select(this).attr("stroke-width", 2.4);   // thicker outline on hover
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function () {
      tooltip.style("opacity", 0);
      d3.select(this).attr("stroke-width", 1.2);
    });



    // zoom (triggered by updateGraphic when a map-a-zoom-in / map-a-zoom-out step is reached)
  let zoomed = false;

  zoomHandlers["map-a"] = function (next) {
    if (next === zoomed) return;
    zoomed = next;

    neighborhoodMap.zoomTo(zoomed);

    neighborhoodMap.g.selectAll("text.hdc-label")
      .interrupt()
      .transition()
      .delay(zoomed ? 900 : 0)
      .duration(600)
      .style("opacity", zoomed ? 1 : 0);
  };

}).catch((err) => console.error("Chart A failed:", err));

//CHART B: BAR CHART OF AVERAGE BLOCK LENGTH

Promise.all([
  fetch("data/block_stats.json").then((r) => r.json()),
  fetch("data/manhattan_ntas.geojson").then((r) => r.json()),
]).then(([stats, ntas]) => {

  // only neighborhoods that appear on the map in Chart A
  const onMap = new Set(ntas.features.map((f) => f.properties.ntaname));

  const data = stats
    .filter((d) => onMap.has(d.ntaname) && d.mean_length_ft != null)
    .map((d) => ({
      name: /Greenwich Village/i.test(d.ntaname) ? "Greenwich Village" : d.ntaname,
      value: d.mean_length_ft,
      isGV: !!d.is_gv,
    }))
    .sort((a, b) => a.value - b.value);          // shortest at the top

  const COLOR_GV    = "#b25a3f";
  const COLOR_OTHER = "#d89064";

  // the bar chart colours by series, so Greenwich Village and everything else
  // are two series; each neighborhood has a value in exactly one of them
  const seriesFor = (isGV) => ({
    key: isGV ? "gv" : "other",
    values: data.map((d) => ({ x: d.name, y: d.isGV === isGV ? d.value : null })),
  });

   const barH = 30;   // was 22; more room per row now that bars are spaced further apart
  const margin = { top: 15, right: 50, bottom: 60, left: 350 };

  createHandDrawnBarChart({
    container: "#chart-b",
    categories: [
      { key: "other", label: "Other neighborhoods", color: COLOR_OTHER },
      { key: "gv",    label: "Greenwich Village",   color: COLOR_GV },
    ],
    data: [seriesFor(false), seriesFor(true)],
    width: 1100,
    mainHeight: margin.top + margin.bottom + data.length * barH,
    margin,
    horizontal: true,
    stacked: true,
    responsive: true,
    showLegend: false,
    gridlines: false,
    categoryAxisLine: false,   
    barPadding: 0.4,          
    strokeDarken: 0.4,         
    valueAxisLabel: "Average block length (feet)",
    valueAxisLabelOffset:8,
    valueLabels: (v) => `${Math.round(v)} ft`,
    yFormat: d3.format(",.0f"),
    boldKeys: ["gv"],
  });

}).catch((err) => console.error("Chart B failed:", err));
//END CHART B

//CHART C: MAP OF BUILDING AGE IN GREENWICH VILLAGE

Promise.all([
  fetch("data/gv_buildingsage.geojson").then((r) => r.json()),
  fetch("data/gv_boundary.geojson").then((r) => r.json()),
]).then(([lots, boundary]) => {

  const isOdd14th = (f) => {
    const a = String(f.properties?.address ?? "").trim();
    const m = a.match(/^(\d+)/);
    return !!m && /\b14(th)?\s+(st|street)/i.test(a) && Number(m[1]) % 2 === 1;
  };

  const cut = (f) =>
  EXCLUDE.has(f.properties._idx) ||
  /pier[\s_-]*50/i.test(JSON.stringify(f.properties ?? {})) ||
  isOdd14th(f);

  // --- clip to boundary (winding-proof, planar) ---
  const polys = [];
  (boundary.type === "FeatureCollection" ? boundary.features : [boundary]).forEach((b) => {
    const g = b.geometry || b;
    if (g.type === "Polygon") polys.push(g.coordinates);
    if (g.type === "MultiPolygon") g.coordinates.forEach((p) => polys.push(p));
  });

lots.features.forEach((f, i) => {
  f.properties = f.properties || {};
  f.properties._idx = i;
});

const OPEN_SPACE_IDX = new Set([1197]); // replace with the _idx from the tooltip

  const isOpenSpace = (p) =>
    OPEN_SPACE_IDX.has(p._idx) ||
    String(p.landuse).padStart(2, "0") === "09";

    const LABELS = {
    yearbuilt: "Year Built",
    address: "Address",
    // add others as needed, e.g. address: "Address", landuse: "Land use"
  };





const EXCLUDE = new Set([2954,861,884,883,859,878,879,2963,2962,887,2964,886,2961,2960,940,2957]);

  const inBoundary = (f) => {
    if (!f.geometry) return false;
    const pt = d3.geoCentroid(f);
    return polys.some(
      (rings) => rings.filter((r) => d3.polygonContains(r, pt)).length % 2 === 1
    );
  };

  console.log("lots before:", lots.features.length);
  lots.features = lots.features.filter((f) => inBoundary(f) && !cut(f));
  console.log("lots after:", lots.features.length);
  // --- end clip ---

  const thresholds = [1830, 1860, 1900, 1930, 1960, 2000];
  const eras = [
{ label: "Before 1830", color: "#6a2238" },
{ label: "1830–1859",   color: "#a03640" },
{ label: "1860–1899",   color: "#d05c4a" },
{ label: "1900–1929",   color: "#e08558" },
{ label: "1930–1959",   color: "#eba762" },
{ label: "1960–1999",   color: "#f6d995" },
{ label: "2000 +",      color: "#f9eac0" },
];
  const NO_DATA = "#666666";

  const colorFor = (y) =>
    (y == null || !isFinite(y) || y <= 0) ? NO_DATA : eras[d3.bisect(thresholds, y)].color;

  const width = 700, height = 820;

  const svg = d3.select("#map-c")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .style("height", "auto");

  const projection = d3.geoMercator()
    .fitExtent([[10, 10], [width - 10, height - 10]], boundary);
  const path = d3.geoPath(projection);
  const [[bx0, by0], [bx1, by1]] = path.bounds(boundary);
svg.attr("viewBox", `${bx0 - 10} ${by0 - 10} ${bx1 - bx0 + 20} ${by1 - by0 + 20}`);

   console.log("chart C v3 loaded");

  const tip = d3.select("body").append("div")
    .style("position", "fixed")
    .style("pointer-events", "none")
    .style("display", "none")
    .style("z-index", 9999)
    .style("background", "#fff")
    .style("border", "1px solid #33302a")
    .style("padding", "6px 8px")
    .style("font", "11px/1.35 'Jost', sans-serif")
    .style("max-width", "280px");

  const g = svg.append("g");

const OPEN_SPACE = "#dbc398"; // or your "open space" color

 function moveTip(event) {
    const pad = 12;
    const node = tip.node();
    const w = node.offsetWidth, h = node.offsetHeight;
    let left = event.clientX + pad;
    let top = event.clientY + pad;
    if (left + w > window.innerWidth - 8) left = event.clientX - w - pad;
    if (top + h > window.innerHeight - 8) top = Math.max(8, event.clientY - h - pad);
    tip.style("left", left + "px").style("top", top + "px");
  }

  g.selectAll("path.hdc-lot")
    .data(lots.features.filter((f) => f.geometry != null))
    .join("path")
    .attr("class", "hdc-lot")
    .attr("d", path)
    .attr("fill", (d) => {
      const p = d.properties;
      if (isOpenSpace(p)) return OPEN_SPACE;
      return colorFor(+p.yearbuilt);
    })
    .attr("stroke", "#33302a")
    .attr("stroke-width", 0.3)
    .style("pointer-events", "all")
    .on("mousemove", (event, d) => {
      if (isOpenSpace(d.properties)) { tip.style("display", "none"); return; }
      tip.style("display", "block")
        .html(Object.entries(d.properties)
          .filter(([k]) => k !== "_idx")
          .map(([k, v]) => `<b>${LABELS[k] ?? k}</b>: ${v}`)
          .join("<br>"));
      moveTip(event);
    })
    .on("mouseleave", () => tip.style("display", "none"))
    
    .on("click", (event, d) => {
})

  // Greenwich Village boundary, same style as Chart A
  // g.selectAll("path.hdc-gv-border")
  //   .data(boundary.type === "FeatureCollection" ? boundary.features : [boundary])
  //   .join("path")
  //   .attr("class", "hdc-gv-border")
  //   .attr("d", path)
  //   .attr("fill", "none")
  //   .attr("stroke", "#4e976e")
  //   .attr("stroke-width", 4)
  //   .attr("stroke-opacity", 0.7)
  //   .attr("stroke-linejoin", "round")
  //   .style("pointer-events", "none");

  // legend (reuses the .hdc-legend styles from Chart A)
  const legend = d3.select("#map-c").append("div").attr("class", "hdc-legend");
  legend.append("div").attr("class", "hdc-legend-title").text("Year built");

  const items = [...eras,
     {label: "Open space", color: OPEN_SPACE }, 
      {label: "No data", color: NO_DATA }];
  const row = legend.selectAll(".hdc-legend-row")
    .data(items)
    .join("div")
    .attr("class", "hdc-legend-row");
  row.append("span").attr("class", "hdc-legend-swatch").style("background", (d) => d.color);
  row.append("span").text((d) => d.label);

}).catch((err) => console.error("Chart C failed:", err));
// END CHART C

//CHART D: BAR CHART OF BUILDING AGE IN GREENWICH VILLAGE

//CHART D: BAR CHART OF BUILDING AGE IN GREENWICH VILLAGE

fetch("data/gv_buildingsage.geojson")
  .then((r) => r.json())
  .then((lots) => {

    // same eras and colors as Chart C
    const thresholds = [1830, 1860, 1900, 1930, 1960, 2000];
    const eras = [
      { key: "e0", label: "Before 1830", color: "#6a2238" },
      { key: "e1", label: "1830–1859",   color: "#a03640" },
      { key: "e2", label: "1860–1899",   color: "#d05c4a" },
      { key: "e3", label: "1900–1929",   color: "#e08558" },
      { key: "e4", label: "1930–1959",   color: "#eba762" },
      { key: "e5", label: "1960–1999",   color: "#f6d995" },
      { key: "e6", label: "2000 +",      color: "#f9eac0" },
    ];

    // count lots per era (lots with no year are left out)
    const counts = new Array(eras.length).fill(0);
    let known = 0;

    lots.features.forEach((f) => {
      const y = f.properties.yearbuilt;
      if (y == null || !isFinite(y) || y <= 0) return;
      counts[d3.bisect(thresholds, y)]++;
      known++;
    });

    // one series per era; each has a value only at its own label
    const series = eras.map((e, i) => ({
      key: e.key,
      values: eras.map((e2, j) => ({ x: e2.label, y: i === j ? counts[i] : null })),
    }));

    // label above each bar: "count (percent%)"
    // looked up by count, which is safe because equal counts have equal shares
    const labelByCount = new Map(
      counts.map((c) => [c, `${c.toLocaleString()} (${Math.round((known ? c / known : 0) * 100)}%)`])
    );

    const margin = { top: 80, right: 20, bottom: 70, left: 55 };

    createHandDrawnBarChart({
      container: "#chart-d",
      categories: eras.map((e) => ({ key: e.key, label: e.label, color: e.color })),
      data: series,
      width: 720,
      mainHeight: 460,
      margin,
      horizontal: false,
      stacked: true,
      responsive: true,
      showLegend: false,
      gridlines: false,
      barPadding: 0.2,
      strokeDarken: 0.4,
      handScale: .5,
      denseWobble: true,
      tooltipUnit: "buildings",
      valueAxisLabel: "Number of buildings",
      valueLabels: (v) => labelByCount.get(v) ?? `${v.toLocaleString()}`,
      yFormat: d3.format(",.0f"),
    });

    ScrollTrigger.refresh();   // moved inside, so it runs after the chart exists

  }).catch((err) => console.error("Chart D failed:", err));


//CHART E
//CHART E (E1 -> E2 crossfade)

// public handle for the scroll code; calls made before the data loads are remembered
window.chartE = window.chartE || {
  requested: "e1",
  show(name) { this.requested = name; },
};

Promise.all([
  fetch("data/chart-e-1.json").then((r) => r.json()),
  fetch("data/chart-e-2.json").then((r) => r.json()),
]).then(([raw1, raw2]) => {

  const clean = (arr) => arr
    .map((d) => ({
      year: +(d.year ?? d.Year),
      series: d.series,
      value: +d.value,
      source: d.source,
    }))
    .filter((d) => isFinite(d.year) && isFinite(d.value) && d.series != null);

  const rows1 = clean(raw1);
  const rows2 = clean(raw2);
  const nytRows2 = rows2.filter((d) => d.source === "nyt");
  const rebnyRows2 = rows2.filter((d) => d.source === "rebny");

  // ---------- colors (edit keys to match your series names) ----------
    const colorByName = {
    "Manhattan (NYT)":          "#52889b",
    "Greenwich Village":        "#b25a3f",
    "Manhattan (REBNY)":        "#52889b",
    "Bleecker (NYT)": "#8a9a4f",
    "Bleecker (REBNY)": "#8a9a4f",
  };
  
  const legendLabelByName = {
    "Manhattan (NYT)":          "Manhattan (New York Times)",
    "Greenwich Village":        "Greenwich Village (New York Times)",
    "Manhattan (REBNY)":        "Manhattan (REBNY)",
    "Bleecker (NYT)":           "Bleecker Street (New York Times)",
    "Bleecker (REBNY)":         "Bleecker Street (REBNY)",
  };
  const legendLabelOf = (name) => legendLabelByName[name] || name;

  const fallback = d3.scaleOrdinal(d3.schemeTableau10);
  const colorOf = (name) => colorByName[name] || fallback(name);
  

  // rows -> [{key, color, values}] sorted by year
  const toSeries = (rows) =>
    Array.from(d3.group(rows, (d) => d.series), ([name, v]) => ({
      key: name,
      color: colorOf(name),
      values: v.slice().sort((a, b) => a.year - b.year),
    }));

  const s1 = toSeries(rows1);
  const sNyt = toSeries(nytRows2);
  const sRebny = toSeries(rebnyRows2);
  const sRebnyMan = sRebny.filter((s) => /manhattan/i.test(s.key));
  const sRebnyBlk = sRebny.filter((s) => !/manhattan/i.test(s.key));

  // ---------- fixed scales shared by both states ----------
  const allRows = [...rows1, ...rows2];
  const [minYear, maxYear] = d3.extent(allRows, (d) => d.year);
  const yMax = d3.max(allRows, (d) => d.value) || 1;

  const width = 860;
  const height = 760;
  const margin = { top: 34, right: 24, bottom: 30, left: 48 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain([d3.min(rows1, (d) => d.year), 2001]).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, yMax * 1.15]).nice().range([innerHeight, 0]);
  const fullDomain = [minYear, maxYear];
  const e1Domain = [d3.min(rows1, (d) => d.year), 2001];
  const view = { d0: e1Domain[0], d1: e1Domain[1] };   // what's currently on screen

  // ---------- DOM ----------
  const instanceId = typeof inkNextId === "function" ? inkNextId("hdc-chart-e") : "hdc-chart-e";
  const root = d3.select("#chart-e");
  root.html("")
    .classed("hand-drawn-chart", true)
    .attr("data-instance", instanceId)
    .style("position", "relative");

    const tooltip = root.append("div")
    .attr("class", "hdc-tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("padding", "6px 10px")
    .style("font-family", "'Jost', sans-serif")
    .style("font-size", "13px")
    .style("line-height", "1.35")
    .style("color", "#33302a")
    .style("box-shadow", "0 2px 8px rgba(0,0,0,0.08)")
    .style("z-index", "10");

  const fmtRent = d3.format("$,.0f"); // e.g. $145 (change to "$,.2f" if you want cents)


  // legend: union of series; entries not in the current state are dimmed
  const legendNames = Array.from(new Set([...s1, ...sNyt, ...sRebny].map((s) => s.key)));
  const legendSpans = root.append("div").attr("class", "hdc-legend")
    .selectAll("span")
    .data(legendNames)
    .join("span")
    .attr("class", "hdc-legend-btn")
    .style("cursor", "default")
    .style("pointer-events", "none")
    .html((n) => {
      const c = colorOf(n);
      const label = legendLabelOf(n);
      const bg = /rebny/i.test(n)
        ? c
        : `repeating-linear-gradient(90deg, ${c} 0 7px, transparent 7px 11px)`;
      return `<span class="hdc-swatch" style="display:inline-block;width:29px;height:3px;margin-right:0.4rem;vertical-align:middle;background:${bg}"></span>${label}`;
    });

  const svg = root.append("svg")
    .attr("class", "hdc-main")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .style("height", "auto");

  const captionEl = root.append("p").attr("class", "hdc-caption")
    .style("white-space", "pre-line");

  const defs = svg.append("defs");
  const ink = typeof installInkFilters === "function" ? installInkFilters(defs, instanceId) : null;
  const inkFilter = ink ? `url(#${ink.filterId})` : null;
  const inkPath = (pts, seed) => (typeof inkLinePath === "function" ? inkLinePath(pts, seed) : d3.line()(pts));

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const clipId = instanceId + "-plotclip";
  defs.append("clipPath").attr("id", clipId)
    .append("rect")
    .attr("x", -6).attr("y", -6)
    .attr("width", innerWidth + 12).attr("height", innerHeight + 12);

  // ---------- light overlays on left & right of 2001 (behind data lines) ----------
  const overlayGroup = g.append("g")
    .attr("class", "chart-e-2001-overlays")
    .attr("clip-path", `url(#${clipId})`);

  const rightBg = overlayGroup.append("rect")
    .attr("y", 0)
    .attr("height", innerHeight)
    .attr("fill", "#eef0fc")   // change right tint color here
    .style("opacity", 0);

  const leftSource = overlayGroup.append("text")
    .attr("y", innerHeight - 10)
    .attr("text-anchor", "end")
    .attr("font-family", "'Jost', sans-serif")
    .attr("font-size", 14)
    .attr("fill", "#33302a")
    .style("opacity", 1)
    .text("data source: The New York Times classified ads");
    
  const rightSource = overlayGroup.append("text")
    .attr("y", innerHeight - 10)
    .attr("font-family", "'Jost', sans-serif")
    .attr("font-size", 14)
    .attr("fill", "#33302a") 
    .style("opacity", 0)
    .text("data source: REBNY Retail Report, 2001-2026");

  const xAxisG = g.append("g").attr("class", "hdc-axis")
    .attr("transform", `translate(0,${innerHeight})`);

  function drawAxis() {
    const start = Math.ceil(view.d0 / 5) * 5;
    xAxisG.call(d3.axisBottom(x)
      .tickValues(d3.range(start, view.d1 + 0.01, 5))
      .tickFormat(d3.format("d")));
  }

  g.append("g").attr("class", "hdc-axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat((d) => "$" + d3.format(",.0f")(d)));

  g.append("text")
    .attr("x", 0).attr("y", -14)
    .attr("font-size", 16).attr("fill", "#33302a").attr("font-family", "'Jost', sans-serif")
    .text("Average annual rent per square foot, adjusted for inflation");

  // ---------- layers: one lines group + one points group per dataset ----------
  function makeLayer(seriesList, cls, dashed = false) {
    const lines = g.append("g").attr("class", `${cls}-lines`)
      .attr("clip-path", `url(#${clipId})`).style("opacity", 0);
    const pts = g.append("g").attr("class", `${cls}-pts`)
      .attr("clip-path", `url(#${clipId})`).style("opacity", 0);

    const paths = lines.selectAll("path")
      .data(seriesList, (d) => d.key)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", 3)
      .attr("stroke-linecap", dashed ? "butt" : "round")
      .attr("pathLength", dashed ? 1000 : null)
      .attr("stroke-dasharray", dashed ? "12 9" : null)
      .attr("filter", dashed ? null : inkFilter);

    const groups = pts.selectAll("g")
      .data(seriesList, (d) => d.key)
      .join("g")
      .style("fill", (d) => d.color);

    groups.each(function (s) {
      d3.select(this).selectAll("circle")
        .data(s.values)
        .join("circle")
        .attr("r", 4.5)
        .attr("filter", inkFilter)
        .style("cursor", "pointer")
        .on("mouseenter", function (event, v) {
          // Ignore hover if this layer is hidden in the current scrollytelling state
          if (parseFloat(pts.style("opacity")) < 0.2) return;

          d3.select(this).attr("r", 6.5);
          const [mx, my] = d3.pointer(event, root.node());

          tooltip
            .style("opacity", 1)
            .html(
              `<div style="font-weight:600;color:${s.color};">${legendLabelOf(s.key)}</div>` +
              `<div>${v.year}: <strong>${fmtRent(v.value)}</strong> / sq ft</div>`
            )
            .style("left", `${mx + 12}px`)
            .style("top", `${my - 28}px`);
        })
        .on("mousemove", function (event) {
          if (parseFloat(pts.style("opacity")) < 0.2) return;
          const [mx, my] = d3.pointer(event, root.node());
          tooltip
            .style("left", `${mx + 12}px`)
            .style("top", `${my - 28}px`);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("r", 4.5);
          tooltip.style("opacity", 0);
        });
    });

    function update() {
      paths.attr("d", (d) => inkPath(d.values.map((v) => [x(v.year), y(v.value)]), d.key.length));
      groups.each(function () {
        d3.select(this).selectAll("circle")
          .attr("cx", (v) => x(v.year))
          .attr("cy", (v) => y(v.value));
      });
    }

    return { lines: lines.node(), pts: pts.node(), update };
  }

  // draw order: faded NYT underneath, REBNY on top, e1 version separate
  const L = {
    nyt:      makeLayer(sNyt, "chart-e-nyt", true),
    rebnyMan: makeLayer(sRebnyMan, "chart-e-rebny-man"),
    rebnyBlk: makeLayer(sRebnyBlk, "chart-e-rebny-blk"),
    e1:       makeLayer(s1, "chart-e-e1", true),
  };

  // ---------- 2001 line + annotations (hidden until their state) ----------
  const refLine = g.append("line")
    .attr("x1", x(2001)).attr("x2", x(2001))
    .attr("y1", 0).attr("y2", innerHeight)
    .attr("stroke", "#000").attr("stroke-width", 1)
    .style("opacity", 0);

  function makeNote(lines, px, py, anchor) {
    const t = g.append("text")
      .attr("x", px).attr("y", py)
      .attr("text-anchor", anchor)
      .attr("font-family", "'Jost', sans-serif")
      .attr("font-size", 14).attr("fill", "#33302a")
      .style("opacity", 0);
    lines.forEach((ln, i) => {
      t.append("tspan").attr("x", px).attr("dy", i ? "1.25em" : 0).text(ln);
    });
    return t.node();
  }

    // ---- note placement: nudge these numbers ----
  const NOTE_PAD = 10;         // gap to the right of the 2001 line
  const NOTE_2001_LIFT = 110;   // px above the Manhattan (REBNY) line at 2001
  const NOTE_BLK_DROP = 30;    // px below the Bleecker (REBNY) line at 2001
  const NOTE_NYT_LIFT = 100;    // px above the NYT cluster

  const valueAtOrAfter = (s, yr) =>
    (s.values.find((v) => v.year >= yr) || s.values[s.values.length - 1]).value;
  const nearestValue = (s, yr) =>
    s.values.reduce((a, b) => (Math.abs(b.year - yr) < Math.abs(a.year - yr) ? b : a)).value;

  // right of the 2001 line, above the Manhattan (REBNY) line
  const note2001 = makeNote(
    ["Manhattan rents as a whole kept climbing",
     "after 2001 at about the same pace",
     "as in the decades before."],
    x(2001) + NOTE_PAD,
    sRebnyMan.length ? y(valueAtOrAfter(sRebnyMan[0], 2001)) - NOTE_2001_LIFT : 114,
    "start");

  // right of the 2001 line, below the Bleecker (REBNY) line
  let noteBleecker = null;
  if (sRebnyBlk.length) {
    noteBleecker = makeNote(
      ["Meanwhile, rents on", "Bleecker Street surged."],
      x(2001) + NOTE_PAD,
      y(valueAtOrAfter(sRebnyBlk[0], 2001)) + NOTE_BLK_DROP,
      "start");
  }

  // centered over the three NYT lines (midpoint of the pre-2001 span)
  const midYear = (e1Domain[0] + 2001) / 2;
  const noteNyt = makeNote(
    ["Until 2001, rents in Manhattan, Greenwich Village",
     "and on Bleecker Street tracked each other closely."],
    x(midYear),
    y(d3.max(s1, (s) => nearestValue(s, midYear))) - NOTE_NYT_LIFT,
    "middle");

  const noteTargets = (a, b, c, d) => [
    [refLine.node(), a],
    [note2001, a],
    [noteNyt, d],
    ...(noteBleecker ? [[noteBleecker, c]] : []),
  ];

  const overlayTargets = (rightOp) => [
    [rightBg.node(), rightOp],
    [rightSource.node(), rightOp ? .8 : 0],
    [leftSource.node(), 1],
  ];

  const states = {
    e1: {
      targets: [
        [L.e1.lines, 1], [L.e1.pts, 1],
        [L.nyt.lines, 0], [L.nyt.pts, 0],
        [L.rebnyMan.lines, 0], [L.rebnyMan.pts, 0],
        [L.rebnyBlk.lines, 0], [L.rebnyBlk.pts, 0],
        ...noteTargets(0, 0, 0, 1),
        ...overlayTargets(0),
      ],
      legend: new Set(s1.map((s) => s.key)),
    },
    e1a: {
      targets: [
        [L.e1.lines, 0.15], [L.e1.pts, 0.25],
        [L.nyt.lines, 0], [L.nyt.pts, 0],
        [L.rebnyMan.lines, 0.5], [L.rebnyMan.pts, 0.8],
        [L.rebnyBlk.lines, 0], [L.rebnyBlk.pts, 0],
        ...noteTargets(1, 1, 0, 1),
        ...overlayTargets(0.3),
      ],
      legend: new Set(sRebnyMan.map((s) => s.key)),
    },
    e2: {
      targets: [
        [L.e1.lines, 0], [L.e1.pts, 0],
        [L.nyt.lines, 0.15], [L.nyt.pts, 0.25],
        [L.rebnyMan.lines, 0.5], [L.rebnyMan.pts, 0.8],
        [L.rebnyBlk.lines, 0.5], [L.rebnyBlk.pts, 0.8],
        ...noteTargets(1, 1, 1, 1),
        ...overlayTargets(0.3),
      ],
      legend: new Set([...sNyt, ...sRebny].map((s) => s.key)),
    },
  };

  // fade a text element out, swap its text, fade back in
  const subtitleEl = root.insert("p", "svg").attr("class", "hdc-subtitle");
  const texts = {
    e1:  { subtitle: "", caption: "" },
    e1a: { subtitle: "", caption: "" },
    e2:  { subtitle: "", caption: "" },
  };

  function swapText(el, text, dur, instant) {
    const node = el.node();
    gsap.killTweensOf(node);
    if (instant) { el.text(text); gsap.set(node, { opacity: 1 }); return; }
    gsap.timeline()
      .to(node, { opacity: 0, duration: dur * 0.3, ease: "power1.out" })
      .add(() => el.text(text))
      .to(node, { opacity: 1, duration: dur * 0.5, ease: "power1.in" });
  }

  let current = null;

  function show(name, instant) {
    const st = states[name];
    if (!st) { console.warn(`Chart E: unknown state "${name}"`); return; }
    if (name === current && !instant) return;
    current = name;

    const dur = instant ? 0 : 0.9;
    const target = name === "e1" ? e1Domain : fullDomain;
    if (instant) {
      view.d0 = target[0]; view.d1 = target[1];
      render();
    } else {
      gsap.to(view, {
        d0: target[0], d1: target[1],
        duration: dur, ease: "power1.inOut",
        overwrite: true, onUpdate: render,
      });
    }

    st.targets.forEach(([el, op]) => {
      gsap.to(el, { opacity: op, duration: dur, ease: "power1.inOut", overwrite: true });
      d3.select(el).style("pointer-events", op > 0.2 ? "auto" : "none");
    });
    tooltip.style("opacity", 0);

    legendSpans.each(function (n) {
      const hidden = name === "e1" && /rebny/i.test(n);
      const op = st.legend.has(n) ? 1 : hidden ? 0 : 0.3;
      gsap.to(this, { opacity: op, duration: dur, overwrite: true });
    });

    swapText(subtitleEl, texts[name].subtitle, dur, instant);
    swapText(captionEl, texts[name].caption, dur, instant);
  }

  function moveNote(node, px, py) {
    const t = d3.select(node).attr("x", px);
    if (py != null) t.attr("y", py);
    t.selectAll("tspan").attr("x", px);
  }

  function render() {
    x.domain([view.d0, view.d1]);
    drawAxis();
    Object.values(L).forEach((l) => l.update());

    const raw2001 = x(2001);
    const clamped2001 = Math.max(0, Math.min(innerWidth, raw2001));

    rightBg.attr("x", clamped2001).attr("width", Math.max(0, innerWidth - clamped2001));

    rightSource.attr("x", clamped2001 + 10);
    leftSource.attr("x", clamped2001 - 10);

    refLine.attr("x1", raw2001).attr("x2", raw2001);
    moveNote(note2001, x(2001) + NOTE_PAD);
    if (noteBleecker) moveNote(noteBleecker, x(2001) + NOTE_PAD);
    moveNote(noteNyt, x(midYear));
  }
  render();   // draws the initial e1 view

  // hand the real function to the public handle and draw whatever was requested
  window.chartE.show = show;
  show("e1", true);

}).catch((err) => console.error("Chart E failed:", err));

//END CHART E


//START CHART G VACANCIES 2026

Promise.all([
  fetch("data/vacancy_lots_2026.geojson").then((r) => r.json()),
  fetch("data/vacancy_outlines_2026.geojson").then((r) => r.json()),
  fetch("data/street_labels.geojson").then((r) => r.json()),
]).then(([lots, outlines, labels]) => {

  const TAN   = "#dbc398";
  const FILL_OPACITY = 0.6;
  const OTHER = "residential, open space, or other";

  const statuses = [
    { key: "vacant",     label: "Has a vacant storefront",           color: "#33302a" },
    { key: "occupied",   label: "Occupied",                          color: "#b25a3f" },
    { key: "demolished", label: "Demolished",                        color: "#636363" },
    { key: OTHER,        label: "Residential, open space, or other", color: TAN },
  ];

  const colorScale = d3.scaleOrdinal()
    .domain(statuses.map((s) => s.key))
    .range(statuses.map((s) => s.color))
    .unknown(TAN);

  // one layer: every lot in the area, so the map draws and fits them together.
  // surveyed lots go last so they sit on top
  const surveyed = new Set(lots.features.map((f) => f.properties.bbl));
  const rest = outlines.features
    .filter((f) => !surveyed.has(f.properties.bbl))
    .map((f) => ({ ...f, properties: { ...f.properties, category: OTHER } }));
  const allLots = { type: "FeatureCollection", features: [...rest, ...lots.features] };

  d3.select("#map-g").style("background", TAN);

  const vacancyMap = createHandDrawnMap({
    container: "#map-g",
    geojson: allLots,
    valueByFeature: (d) => d.properties.category,
    colorScale: colorScale,
    strokeOnly: false,
  });

// zoom in: crop the viewBox to the surveyed lots
const [[x0, y0], [x1, y1]] = vacancyMap.path.bounds(lots);   // bounds in the svg's own coordinates
const pad = 12;                                              // smaller = tighter
d3.select("#map-g svg").attr(
  "viewBox",
  `${x0 - pad} ${y0 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}`
);


  // thinner lot outlines than the neighborhood map
  vacancyMap.g.selectAll("path.hdc-feature")
  .attr("stroke-width", 0.5)
  .style("fill-opacity", FILL_OPACITY);

  // street names: same italic serif as the Chart A labels
   const LABEL_DROP = 0.01;                        // fraction of the map's height; raise for more
  const [[bx0, by0], [bx1, by1]] = vacancyMap.path.bounds(lots);
  const dy = (by1 - by0) * LABEL_DROP;

 const BASE_SIZE = 13;

  // hand overrides by label text; check real names with
  // console.log(labels.features.map((d) => d.properties.label))
  const nudge = {
    "7th Ave South": [-20,60],
    "Ave of the Americas":[60,-125],
    "Christopher St":[20,-8],
    "Grove St":[120,-55],
    "Barrow St": [0,-4],
    "Commerce St": [0,-4],
    "Morton St": [0,-4],
    "Leroy St": [0,-4],
    "Carmine St": [0,-4],
    "Downing St": [0, -4],
    "Bedford St": [-83, -180],
    "Jones St": [0,-4],
    "Cornelia St": [0,-2],
    "Minetta Lane": [20,10],
    "Bleecker St": [40,23],
    "Mac Dougal St": [103,-160],
    "Bleecker St 2": [-115,-200]
  };

  const tilt = {
    "Ave of the Americas":4,
    "Bleecker St 2": 33.5,
  };

  const nudgeFor = (d) => nudge[d.properties.key] ?? [0, 0];




  const sizeOverride = {
    "Ave of the Americas": 24,
    "7th Ave South": 24,
  };
 const fontSize = (d) => sizeOverride[d.properties.label] ?? BASE_SIZE;




const displayName = {
  "Ave of the Americas" : "Avenue of the Americas",
  "7th Ave South" : "7th Avenue South",
  "Mac Dougal St" : "MacDougal St",
};

// give each label a key; Bleecker gets two copies
const labelData = labels.features.flatMap((f) => {
  const label = f.properties.label;
  const make = (key) => ({ ...f, properties: { ...f.properties, key } });
  return label === "Bleecker St"
    ? [make("Bleecker St"), make("Bleecker St 2")]
    : [make(label)];
});

  vacancyMap.g
    .append("g")
    .attr("class", "hdc-street-labels")
    .style("pointer-events", "none")
    .selectAll("text")
    .data(labelData)
    .join("text")
    .attr("transform", (d) => {
    const [x, y] = vacancyMap.path.centroid(d);
    const [nx, ny] = nudgeFor(d);
    return `translate(${x + nx},${y + dy + ny}) rotate(${-d.properties.angle + (tilt[d.properties.key] ?? 0)})`;
  })
    .attr("text-anchor", "middle")
    .attr("font-size", fontSize)
    .attr("font-family", "'Jost', sans-serif")
    .attr("font-weight", 500)
    .attr("fill", "#000000")
    .attr("fill-opacity", 1)
    .attr("stroke", TAN)
    .attr("stroke-width", 4)
    .style("paint-order", "stroke")
    .text((d) => displayName[d.properties.label] ?? d.properties.label);

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "hdc-tooltip")
    .style("opacity", 0);

  function moveTooltip(event) {
    const pad = 14;
    const node = tooltip.node();
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    let left = event.clientX + pad;
    let top = event.clientY + pad;
    if (left + w > window.innerWidth - 8) left = event.clientX - w - pad;
    if (top + h > window.innerHeight - 8) top = event.clientY - h - pad;
    tooltip.style("left", `${left}px`).style("top", `${top}px`);
  }

  const isSurveyed = (d) => d.properties.category !== OTHER;

  vacancyMap.g
    .selectAll("path.hdc-feature")
    .filter(isSurveyed)
    .style("cursor", "pointer")
    .on("mouseenter", function (event, d) {
      const p = d.properties;
      const counts = [];
      if (p.n_vacant)   counts.push(`${p.n_vacant} vacant`);
      if (p.n_occupied) counts.push(`${p.n_occupied} occupied`);
      const biz = p.businesses ? `<br>${String(p.businesses).slice(0, 140)}` : "";
      tooltip
        .html(`<strong>${p.address ?? "Lot"}</strong><br>${counts.join(", ") || "Demolished"}${biz}`)
        .style("opacity", 1);
      moveTooltip(event);
      d3.select(this).attr("stroke-width", 1.6);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function () {
      tooltip.style("opacity", 0);
      d3.select(this).attr("stroke-width", 0.4);
    });

  const legend = d3.select("#map-g").append("div").attr("class", "hdc-legend");
  legend.append("div").attr("class", "hdc-legend-title").text("Storefront status");

  const row = legend.selectAll(".hdc-legend-row")
    .data(statuses)
    .join("div")
    .attr("class", "hdc-legend-row");
  row.append("span")
  .attr("class", "hdc-legend-swatch")
  .style("background", (d) => d3.interpolateRgb(TAN, d.color)(FILL_OPACITY))
  .style("border", (d) => (d.key === OTHER ? "1px solid rgba(51,48,42,0.4)" : null));
  row.append("span").text((d) => d.label);

  if (window.ScrollTrigger) ScrollTrigger.refresh();    
}).catch((err) => console.error("Chart G failed:", err));
//END CHART G


//END CHART G

// START CHART H1

//START CHART H1: DIVERGING BARS (percent change, 1970-2020: population / density / household size)

window.chartH1 = window.chartH1 || {
  requested: "population",
  show(name) { this.requested = name; },
};

fetch("data/metrics_comparison.json")
  .then((r) => r.json())
  .then((allRows) => {

    const rows = allRows.filter((d) => d.year != null && isFinite(+d.year));
    const Y0 = 1970, Y1 = 2020;
    const ACRES_PER_KM2 = 247.105;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // EDIT TEXT HERE (the page title/subtitle/source swap lives in initChartH's hText)
    const states = {
      population: {
        value: (d) => +d.population,
        yLabel: "Change in residents",
        fmt: d3.format(",.0f"),
      },
      density: {
        value: (d) => +d.density_km2 / ACRES_PER_KM2,
        yLabel: "Change in people per acre",
        fmt: d3.format(",.0f"),
      },
      household: {
        value: (d) => +d.avg_household_size,
        yLabel: "Change in average household size",
        fmt: d3.format(".2f"),
      },
    };

    const areas = ["Manhattan", "Greenwich Village"];
    const colors = { "Manhattan": "#52889b", "Greenwich Village": "#b25a3f" };
    const keys = { "Manhattan": "manhattan", "Greenwich Village": "gv" };
    const names = { manhattan: "Manhattan", gv: "Greenwich Village" };

    const pctFmt = (v) => d3.format(Math.abs(v) < 0.1 ? "+.1%" : "+.0%")(v);
    const tickFmt = (v) => (v === 0 ? "0%" : d3.format("+.0%")(v));

    // per series, per state: 1970 value, 2020 value, percent change
    const seriesDefs = areas.map((areaName) => {
      const areaRows = rows.filter((d) => d.area === areaName);
      const at = (yr) => areaRows.find((d) => +d.year === yr);
      const vals = {};
      Object.entries(states).forEach(([k, st]) => {
        const ra = at(Y0), rb = at(Y1);
        const a = ra ? st.value(ra) : null;
        const b = rb ? st.value(rb) : null;
        vals[k] = {
          a, b,
          pct: a != null && b != null && isFinite(a) && isFinite(b) && a !== 0 ? (b - a) / a : null,
        };
      });
      return { key: keys[areaName], color: colors[areaName], vals };
    });

    const width = 660, height = 440;
    const margin = { top: 64, right: 50, bottom: 60, left: 150 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const instanceId = typeof inkNextId === "function" ? inkNextId("hdc-chart-h1") : "hdc-chart-h1";
    const root = d3.select("#chart-h1");
    root.html("").classed("hand-drawn-chart", true).attr("data-instance", instanceId);
    root.style("position", "relative");
    const tooltip = root.append("div")
      .attr("class", "hdc-tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", "10");

    const placeTip = (event) => {
      const [mx, my] = d3.pointer(event, root.node());
      const rootW = root.node().clientWidth;
      const flip = mx > rootW * 0.6;
      tooltip
        .style("left", flip ? "auto" : `${mx + 12}px`)
        .style("right", flip ? `${rootW - mx + 12}px` : "auto")
        .style("top", `${my - 28}px`);
    };
    const bindTip = (sel, html) => sel
      .on("mouseenter", (event) => { tooltip.html(html).style("opacity", 1); placeTip(event); })
      .on("mousemove", placeTip)
      .on("mouseleave", () => tooltip.style("opacity", 0));

    const svg = root.append("svg")
      .attr("class", "hdc-main")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .style("height", "auto");

    const defs = svg.append("defs");
    const ink = typeof installInkFilters === "function" ? installInkFilters(defs, instanceId) : null;
    const inkFilter = ink ? `url(#${ink.filterId})` : null;
    const inkPath = (pts, seed) => (typeof inkLinePath === "function" ? inkLinePath(pts, seed) : d3.line()(pts));

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const OFFSET = 14;
    const FONT = "'Jost', sans-serif";
    const INK = "#33302a";
    const layers = {};
    

    Object.entries(states).forEach(([name, st]) => {
      const usable = seriesDefs.filter((s) => s.vals[name].pct != null);
      const pcts = usable.map((s) => s.vals[name].pct);

      // symmetric-ish domain with room for the value labels at the bar ends
      const lo = Math.min(0, ...pcts), hi = Math.max(0, ...pcts);
      const span = (hi - lo) || 0.1;
      const x = d3.scaleLinear()
        .domain([lo - span * 0.3, hi + span * 0.3])
        .range([0, innerWidth])
        .nice();
      const x0 = x(0);

      const y = d3.scaleBand()
        .domain(usable.map((s) => s.key))
        .range([0, innerHeight])
        .padding(0.4);

      const layer = g.append("g")
        .attr("class", `hdc-layer hdc-layer-${name}`)
        .style("opacity", 0)
        .style("pointer-events", "none")
        .attr("transform", `translate(0,${OFFSET})`);

      // what is being measured
      layer.append("text")
        .attr("x", -margin.left + 6).attr("y", -36)
        .attr("font-size", 16).attr("fill", INK).attr("font-family", FONT)
        .text(st.yLabel);

      // direction cues on either side of zero
      layer.append("text")
        .attr("x", x0 - 8).attr("y", -10).attr("text-anchor", "end")
        .attr("font-size", 13).attr("fill", INK).attr("fill-opacity", 0.7).attr("font-family", FONT)
        .text("\u2190 Decrease");
      layer.append("text")
        .attr("x", x0 + 8).attr("y", -10).attr("text-anchor", "start")
        .attr("font-size", 13).attr("fill", INK).attr("fill-opacity", 0.7).attr("font-family", FONT)
        .text("Increase \u2192");

      // bottom axis with faint gridlines
      const axis = layer.append("g")
  .attr("class", "hdc-axis")
  .attr("transform", `translate(0,${innerHeight})`)
  .call(d3.axisBottom(x).ticks(6).tickFormat(tickFmt).tickSize(5).tickSizeOuter(0))
  .call((sel) => sel.select(".domain").attr("stroke", INK));

      layer.append("text")
        .attr("x", innerWidth / 2).attr("y", innerHeight + 46)
        .attr("text-anchor", "middle")
        .attr("font-size", 16).attr("fill", INK).attr("font-family", FONT)
        .text(`Percent change, ${Y0}\u2013${Y1}`);

      // bars
      const bars = [];
      usable.forEach((s, i) => {
        const { a, b, pct } = s.vals[name];
        const by = y(s.key), bh = y.bandwidth();
        const bx = pct >= 0 ? x0 : x(pct);
        const bw = Math.abs(x(pct) - x0);

        const rect = layer.append("rect")
          .attr("class", "hdc-bar")
          .attr("x", bx).attr("y", by).attr("width", bw).attr("height", bh)
          .attr("fill", s.color).style("opacity", 0.9)
          .attr("filter", inkFilter);
        bars.push({ sel: rect, x: bx, w: bw, x0 });

        // area name on the left, in the bar's color
        layer.append("text")
          .attr("x", -12).attr("y", by + bh / 2 + 5).attr("text-anchor", "end")
          .attr("font-size", 16).attr("font-weight", 600)
          .attr("fill", s.color).attr("font-family", FONT)
          .text(names[s.key]);

        // percent label at the bar end
        layer.append("text")
          .attr("x", pct >= 0 ? x(pct) + 8 : x(pct) - 8)
          .attr("y", by + bh / 2 + 6)
          .attr("text-anchor", pct >= 0 ? "start" : "end")
          .attr("font-size", 20).attr("font-weight", 600)
          .attr("fill", s.color).attr("font-family", FONT)
          .text(pctFmt(pct));

        // hover target covers the whole row
        bindTip(
          layer.append("rect")
            .attr("x", 0).attr("y", by - 6).attr("width", innerWidth).attr("height", bh + 12)
            .attr("fill", "transparent"),
          `<div style="font-weight:600;color:${s.color};">${names[s.key]}</div>` +
          `<div>${Y0}: <strong>${st.fmt(a)}</strong></div>` +
          `<div>${Y1}: <strong>${st.fmt(b)}</strong></div>` +
          `<div>Change: ${pctFmt(pct)}</div>`
        );
      });

      // zero line, drawn last so it sits on top of the bars
      layer.append("path")
        .attr("d", inkPath([[x0, -2], [x0, innerHeight / 2], [x0, innerHeight]], 3))
        .attr("fill", "none").attr("stroke", INK).attr("stroke-width", 2)
        .attr("stroke-linecap", "round").attr("filter", inkFilter);

      layers[name] = layer;
    });

    let current = null;

    function show(name, instant) {
      if (!states[name]) { console.warn(`Chart H1: unknown state "${name}"`); return; }
      if (name === current && !instant) return;

      const dur = instant || reduceMotion ? 0 : 600;
      const prev = current;
      current = name;
      tooltip.style("opacity", 0);

      if (prev && layers[prev]) {
  layers[prev]
    .style("pointer-events", "none")
    .transition("layer").duration(dur).ease(d3.easeCubicInOut)
    .style("opacity", 0);
}

layers[name]
  .interrupt("layer")
  .style("pointer-events", "all")
  .transition("layer").duration(dur).ease(d3.easeCubicInOut)
  .style("opacity", 1);
    }

    window.chartH1.show = show;
    show(window.chartH1.requested, true);

  }).catch((err) => console.error("Chart H1 failed:", err));

//END CHART H1


/* //START CHART H2 DENSITY

function chartH(selector, dataURL) {
  const root = d3.select(selector).classed("chart-h", true).html("");

  const SIZES = ["1","2","3","4","5","6+"];
  const NUM = {"1":1,"2":2,"3":3,"4":4,"5":5,"6+":6};
  const color = s => s==="1" ? "var(--c1)" : s==="2" ? "var(--c2)" : "var(--c3)";

  // dot positions inside a 40x52 window
  const POS = {
    1:[[20,26]],
    2:[[12,26],[28,26]],
    3:[[20,17],[11,34],[29,34]],
    4:[[12,18],[28,18],[12,34],[28,34]],
    5:[[12,14],[28,14],[20,27],[12,40],[28,40]],
    6:[[12,14],[28,14],[12,27],[28,27],[12,40],[28,40]]
  };

  // largest-remainder rounding so each building has exactly 100 windows
  function toWindows(rows) {
    const total = d3.sum(rows, r => r.pct);
    const items = SIZES.map(s => {
      const p = (rows.find(r => r.size === s)?.pct || 0) / total * 100;
      return {size: s, pct: p, n: Math.floor(p), rem: p - Math.floor(p)};
    });
    const left = 100 - d3.sum(items, d => d.n);
    items.slice().sort((a, b) => b.rem - a.rem).slice(0, left).forEach(d => d.n++);
    return items;
  }

  const W = 40, H = 52, SX = 50, SY = 62, PADX = 18, TOP = 46, COLS = 10, ROWS = 10;
  const width  = PADX * 2 + SX * (COLS - 1) + W;
  const height = TOP + SY * (ROWS - 1) + H + 28;

  // legend (attached to root, not "#legend")
  const leg = root.append("div").attr("class", "chart-h-legend");
  [["1", "1 person", 1], ["2", "2 people", 2], ["3", "3+ people", 3]].forEach(([s, t, n]) => {
    const sp = leg.append("span");
    const svg = sp.append("svg").attr("width", 26).attr("height", 32).attr("viewBox", "0 0 40 52");
    svg.append("rect").attr("width", 40).attr("height", 52).attr("rx", 3).attr("fill", "var(--win)");
    POS[n].forEach(([x, y]) => svg.append("circle").attr("cx", x).attr("cy", y).attr("r", 5.5).attr("fill", color(s)));
    sp.append("span").text(t);
  });

  const grid = root.append("div").attr("class", "chart-h-grid");

  d3.json(dataURL).then(DATA => {
    DATA.forEach(d => { d.year = +d.year; d.size = String(d.size); d.pct = +d.pct; });

    [1970, 2020].forEach(year => {
      const items = toWindows(DATA.filter(d => d.year === year));

      // one entry per window, 1-person first, filled from the bottom row up
      const windows = [];
      items.forEach(it => { for (let k = 0; k < it.n; k++) windows.push(it.size); });
      const cells = windows.map((s, i) => ({s, row: ROWS - 1 - Math.floor(i / COLS), col: i % COLS}));

      const box = grid.append("div").attr("class", "chart-h-bld");
      box.append("h2").text(year);

      const svg = box.append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", `Building of 100 windows showing household sizes in ${year}`);

      // facade, cornice, base
      svg.append("rect").attr("x", 0).attr("y", TOP - 20).attr("width", width).attr("height", height - TOP + 12).attr("fill", "var(--wall)");
      svg.append("rect").attr("x", -4).attr("y", TOP - 30).attr("width", width + 8).attr("height", 12).attr("fill", "var(--wall2)");
      svg.append("rect").attr("x", 0).attr("y", height - 8).attr("width", width).attr("height", 8).attr("fill", "var(--wall2)");

      // windows + dots
      const g = svg.selectAll("g.win").data(cells).join("g").attr("class", "win")
        .attr("transform", d => `translate(${PADX + d.col * SX},${TOP + d.row * SY})`);
      g.append("rect").attr("width", W).attr("height", H).attr("rx", 3).attr("fill", "var(--win)");
      g.each(function (d) {
        d3.select(this).selectAll("circle").data(POS[NUM[d.s]]).join("circle")
          .attr("cx", p => p[0]).attr("cy", p => p[1]).attr("r", 5.5).attr("fill", color(d.s));
      });

      // summary stats: 1 / 2 / 3+
      const pct = sizes => items.filter(i => sizes.includes(i.size)).reduce((a, i) => a + i.pct, 0);
      const st = box.append("div").attr("class", "chart-h-stats");
      [["1 person", ["1"], "--c1"], ["2 people", ["2"], "--c2"], ["3+ people", ["3", "4", "5", "6+"], "--c3"]].forEach(([t, s, c]) => {
        const d = st.append("div");
        d.append("b").style("color", `var(${c})`).text(Math.round(pct(s)) + "%");
        d.append("span").text(t);
      });
    });
  }).catch(err => {
    console.error(err);
    root.append("p").text("Could not load " + dataURL);
  });
}

chartH("#chart-h", "data/hh_size.json"); */

//END CHART H

//CHART I: STRETCHY BUILDINGS BY YEAR (share of businesses by category)

(async function () {
  try {
    const data = await fetch("data/strips_by_year.json").then((r) => r.json());
    const byYear = new Map(data.map((d) => [d.year, d.segments]));
    const years = data.map((d) => d.year).sort((a, b) => a - b);

    // ---------- groups ----------
    const DRAWN = [];     // empty = show everything

    const orderOf = new Map();
    data.forEach((y) => y.segments.forEach((s) => {
      if (!orderOf.has(s.group)) orderOf.set(s.group, s.order ?? 999);
    }));
    const allGroups = [...orderOf.keys()].sort((a, b) => orderOf.get(a) - orderOf.get(b));
    const groups = DRAWN.length ? allGroups.filter((g) => DRAWN.includes(g)) : allGroups;

// ---- pre-drawing planner: no SVGs needed ----
(function plan() {
  const EPS_ = 0.0005, TARGET_H_ = 180, ART_H = 300;  // ART_H = artboard height (px) of your TALLEST building
  const avail_ = 1440 - 30 - 30;
  const K_ = avail_ / d3.max(data, (y) => d3.sum(y.segments, (s) => s.pct));
  groups.forEach((g) => {
    const shares = data
      .map((y) => y.segments.find((s) => s.group === g)?.pct ?? 0)
      .filter((v) => v >= EPS_);
    if (!shares.length) return;
    const medPx = d3.median(shares) * K_;
    console.log(
      `${g}: median ${Math.round(medPx)}px wide on screen -> ` +
      `draw ${Math.round(medPx / TARGET_H_ * ART_H)} wide for a ${ART_H}-tall artboard ` +
      `(width:height = ${(medPx / TARGET_H_).toFixed(2)} vs the tallest building)`
    );
  });
})();


    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // ---------- load building pieces ----------
    const parse = (txt) =>
      new DOMParser().parseFromString(txt, "image/svg+xml").documentElement;

    // Illustrator reuses .cls-1, .cls-2 and ids in every export; once inlined into one page
    // those collide. Prefix them per file so each building keeps its own styles.
    const scope = (txt, prefix) => {
      txt = txt.replace(/\bcls-(\d+)/g, `${prefix}-cls-$1`);
      const ids = [...txt.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
      ids.forEach((id) => {
        const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        txt = txt
          .replace(new RegExp(`id="${esc}"`, "g"), `id="${prefix}-${id}"`)
          .replace(new RegExp(`url\\(#${esc}\\)`, "g"), `url(#${prefix}-${id})`)
          .replace(new RegExp(`href="#${esc}"`, "g"), `href="#${prefix}-${id}"`);
      });
      return txt;
    };

    const loadPiece = async (file, prefix) => {
      try {
        const r = await fetch(file);
        if (!r.ok) throw new Error(r.status);
        const node = parse(scope(await r.text(), prefix));
        let [x, y, w, h] = (node.getAttribute("viewBox") || "")
          .trim().split(/[\s,]+/).map(Number);
        if (![x, y, w, h].every(Number.isFinite)) {
          x = 0; y = 0;
          w = parseFloat(node.getAttribute("width")) || 0;
          h = parseFloat(node.getAttribute("height")) || 0;
        }
        return { html: node.innerHTML, x, y, w, h };
      } catch (e) {
        return {
          html: `<rect width="40" height="100" fill="#fff" stroke="#000"/>`,
          x: 0, y: 0, w: 40, h: 100,
        };
      }
    };

    const pieces = {};
    await Promise.all(groups.map(async (g) => {
      const s = slug(g);
      pieces[g] = await loadPiece(`data/buildings/${s}-mid.svg`, s);
    }));

    // ---------- settings ----------
    const isUnclassified = (g) => /unclassified/i.test(g);
    const isVacant       = (g) => /vacant/i.test(g);

    const PALETTE = ["#b25a3f", "#87aa8b", "#e0a638", "#aa406e", "#8a9a4f",
                     "#e08248", "#52889b", "#f9eac0", "#6a2238"];
    const UNCLASSIFIED_COLOR = "#d9d9d9";    // light grey
    const VACANT_COLOR       = "#33302a";    // dark grey
    const FILL_OPACITY       = 0.6;          // strength of the color; mixed into BG, not applied as alpha
    const BG                 = "#dbc398";    // page background the colors are premixed with

    const colored = groups.filter((g) => !isUnclassified(g) && !isVacant(g));
    const COLORS  = d3.scaleOrdinal().domain(colored).range(PALETTE);
    const TINT    = null;                    // one color for all, or null = per-group COLORS
    const tintFor = (g) =>
      isUnclassified(g) ? UNCLASSIFIED_COLOR :
      isVacant(g)       ? VACANT_COLOR :
      (TINT ?? COLORS(g));
    // solid color = FILL_OPACITY of the tint mixed over BG, so stacked white layers can't show through each other
    const fillFor = (g) => d3.interpolateRgb(BG, tintFor(g))(FILL_OPACITY);

    const LINE_PX = 0.8;                     // min on-screen thickness for black linework; 0 = off

    const FONT       = "'Jost', sans-serif";
    const SIGN_FONT  = FONT;
    const SIGN_DY    = 40;
    const SIGN_SIZE  = 12;
    const SIGN_COLOR = "#000";
    const SIGN_PAD   = 6;
    const PCT_DY     = 18;                   // percentages sit directly under the ground line
    const UNDER_DY   = 40;                   // overflow sign labels go under the percentages

    const signNames = {
      "Restaurants, cafes & bars": "Restaurants",
      "Personal services": "Services",
      "Finance & professional": "Finance",
      "Health, education & religion": "Social",
      "Arts & entertainment": "Arts",
      "Grocery, food & liquor": "Grocery",
    };

    const legendText = {
      "Grocery, food & liquor": "grocery, specialty food, liquor",
      "Restaurants, cafes & bars": "restaurants, bars, cafes and nightclubs",
      "Personal services": "personal services",
      "Finance & professional": "finance & professional",
      "Health, education & religion": "health, education & religion",
      "Arts & entertainment": "arts & entertainment",
    };

    const EPS = 0.0005;                      // below this share, treat as 0%

    // ---------- layout ----------
    const margin = { top: 50, right: 0, bottom: 70, left: 0 };
const width  = 1440;
const avail  = width - margin.left - margin.right;   // 1440
const K      = avail;                                // px per 100% share

    // Height: the tallest export is TARGET_H px; every building uses the same y scale (SY),
    // so relative heights from Illustrator are preserved. Only x is stretched per building.
    const TARGET_H  = 180;                   // px height of the tallest building
    const NATIVE_H  = d3.max(groups, (g) => pieces[g].h);
    const SY        = TARGET_H / NATIVE_H;
    const rowH      = TARGET_H;
    const artTop    = (g) => rowH - pieces[g].h * SY;

    // diagnostic: native export width that would give zero distortion at each category's median share
    groups.forEach((g) => {
      const shares = data.map((y) => y.segments.find((s) => s.group === g)?.pct ?? 0).filter((v) => v >= EPS);
      if (!shares.length) return;
      const med = d3.median(shares), lo = d3.min(shares), hi = d3.max(shares);
      const stretch = (p) => ((p * K) / pieces[g].w / SY).toFixed(2);
      console.log(
        `chart-i ${g}: native w=${Math.round(pieces[g].w)}, ` +
        `ideal w≈${Math.round(med * K / SY)}, x-stretch min/med/max = ${stretch(lo)}/${stretch(med)}/${stretch(hi)}`
      );
    });

    const height = margin.top + rowH + margin.bottom;

    // ---------- measure the sign text ----------
    await document.fonts.ready;
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = `${SIGN_SIZE}px ${SIGN_FONT}`;
    const textW = {};
    groups.forEach((g) => { textW[g] = ctx.measureText(signNames[g] ?? g).width; });

    // ---------- DOM ----------
    const root = d3.select("#chart-i");
    root.selectAll("*").remove();
    root.style("font-family", FONT);

    const controls = root.append("div").attr("class", "chart-i-controls")
      .style("margin-bottom", "8px")
      .style("font-family", FONT);

    const sliderRow = controls.append("div")
      .style("display", "flex").style("align-items", "center").style("gap", "12px");
    const slider = sliderRow.append("input")
      .attr("type", "range")
      .attr("min", 0).attr("max", years.length - 1)
      .attr("step", 1).attr("value", 0)
      .style("flex", "1");

    controls.append("div")
      .style("display", "flex").style("justify-content", "space-between")
      .style("font-size", "11px")
      .selectAll("span").data(years).join("span").text((d) => d);

    const svg = root.append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .style("max-width", `${width}px`)
      .style("overflow", "visible")
      .style("font-family", FONT);

    const plot = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // current year, above the buildings
    const yearLabel = plot.append("text").attr("class", "year-label")
      .attr("x", avail / 2).attr("y", -22)
      .attr("text-anchor", "middle")
      .style("font-family", FONT)
      .style("font-size", "26px")
      .style("font-weight", "bold")
      .text(years[0]);

    plot.append("line")
      .attr("x1", 0).attr("x2", avail)
      .attr("y1", rowH).attr("y2", rowH)
      .attr("stroke", "#000").attr("stroke-width", 1);

    const bld = plot.selectAll("g.building")
      .data(groups, (d) => d)
      .join("g")
      .attr("class", "building");

    // art group sits on the ground line; g.piece inside it gets the x-stretch in update()
    const art = bld.append("g").attr("class", "art")
      .attr("transform", (g) => `translate(0, ${artTop(g)})`);

    art.append("g").attr("class", "piece").html((g) => pieces[g].html);

    // ---------- color + linework (computed styles, so attributes, classes and inheritance all count) ----------
    const SHAPES = "path, rect, polygon, polyline, circle, ellipse";
    const rgbOf = (c) => (c.match(/[\d.]+/g) || []).map(Number);

    art.each(function (g) {
      const tint = fillFor(g);
      d3.select(this).selectAll(SHAPES).each(function () {
        const cs = getComputedStyle(this);
        const fill = cs.fill;
        if (!fill || fill === "none") return;
        const [r, gr, b] = rgbOf(fill);
        if (r >= 250 && gr >= 250 && b >= 250) {
          this.style.setProperty("fill", tint);                       // white -> premixed solid tint
          this.style.setProperty("fill-opacity", "1");
        } else if (r <= 10 && gr <= 10 && b <= 10 && LINE_PX > 0) {
          this.setAttribute("stroke", "#000");              // black shape -> min thickness
          this.setAttribute("stroke-width", LINE_PX);
          this.setAttribute("stroke-linejoin", "round");
        }
      });
      // keep every stroke a constant on-screen width while the piece is stretched in x
      d3.select(this).selectAll(SHAPES).attr("vector-effect", "non-scaling-stroke");
    });

    bld.append("text").attr("class", "sign-label")
      .attr("text-anchor", "middle")
      .style("font-size", `${SIGN_SIZE}px`)
      .style("font-family", SIGN_FONT)
      .style("fill", SIGN_COLOR)
      .style("pointer-events", "none")
      .text((g) => signNames[g] ?? g);

    bld.append("text").attr("class", "pct-label")
      .attr("y", rowH + PCT_DY).attr("text-anchor", "middle")
      .style("font-family", FONT)
      .style("font-weight", "bold");

    // ---------- legend ----------
    const legend = root.append("div").attr("class", "chart-i-legend")
      .style("display", "flex").style("flex-wrap", "wrap")
      .style("gap", "6px 28px").style("margin-top", "14px")
      .style("font-family", FONT)
      .style("font-size", "13px").style("line-height", "1.3");

    const item = legend.selectAll("div.legend-item").data(groups).join("div")
      .attr("class", "legend-item")
      .style("display", "flex").style("align-items", "center").style("gap", "8px");

    item.append("span")
      .style("width", "12px").style("height", "12px").style("flex", "none")
      .style("background", (g) => fillFor(g))
      .style("border", "1px solid #000");

    item.append("span").html((g) =>
      `<strong>${signNames[g] ?? g}</strong> = ${legendText[g] ?? g}`);

    // ---------- update ----------
    function update(year, duration = 0) {
      const segs = new Map(byYear.get(year).map((s) => [s.group, s]));
      const pct = (g) => (segs.get(g) ? segs.get(g).pct : 0);

      const total = d3.sum(groups, (g) => pct(g)) || 1;
let x = 0;
const pos = new Map();
groups.forEach((g) => {
  const w = (pct(g) / total) * K;
  pos.set(g, { x, w });
  x += w;
});

      bld.transition().duration(duration)
        .attr("transform", (g) => `translate(${pos.get(g).x},0)`);

      // one piece: undo its viewBox origin, then stretch x to the building's width, y at the shared scale
      bld.select("g.piece").transition().duration(duration)
        .attr("opacity", (g) => pct(g) < EPS ? 0 : 1)
        .attr("transform", (g) => {
          const p = pieces[g];
          const w = Math.max(pos.get(g).w, 1e-3);
          return `scale(${w / p.w},${SY}) translate(${-p.x},${-p.y})`;
        });

      bld.select("text.pct-label").transition().duration(duration)
        .attr("x", (g) => pos.get(g).w / 2)
        .textTween(function (g) {
          const from = parseFloat(this.textContent) / 100 || 0;
          const i = d3.interpolateNumber(from, pct(g));
          return (t) => d3.format(".0%")(i(t));
        });

      const fits = (g) => pos.get(g).w >= textW[g] + 2 * SIGN_PAD;

      bld.select("text.sign-label").transition().duration(duration)
        .attr("x", (g) => pos.get(g).w / 2)
        .attr("y", (g) => fits(g) ? artTop(g) + SIGN_DY : rowH + UNDER_DY)
        // white on the dark vacant building; black whenever the label sits below it on the page
        .style("fill", (g) => (isVacant(g) && fits(g)) ? "#fff" : SIGN_COLOR);

      bld.selectAll("text").transition("fade").duration(duration)
        .style("opacity", function () {
          const g = d3.select(this.parentNode).datum();
          return pct(g) < EPS ? 0 : 1;
        });

      yearLabel.text(year);
    }

    slider.on("input", (e) => update(years[+e.target.value], 400));

    update(years[0]);

    const r = svg.node().getBoundingClientRect();
console.log("svg w×h px:", r.width, r.height, "| expected h:", (r.width * height / width).toFixed(0));

  } catch (err) {
    console.error("Chart I failed:", err);
  }

  
})();
//END CHART I

// CHART J FOCUS CHARTS FOR SPECIFIC TYPES OF BUSINESSES 

function createChartJ(dataPath = "data/focus_small_multiples.json") {
  const metric    = "n";
  const sharedY   = true;
  const lineColor = "#b25a3f";
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const fmt  = metric === "share" ? d3.format(".1%") : d3.format("d");
  const mq   = window.matchMedia("(max-width: 600px)");

  return d3.json(dataPath).then(raw => {
    const series = raw.series.map(s => ({
      key:    slug(s.name),
      label:  s.name,
      values: s.points.map(p => ({ x: p.year, y: p[metric], n: p.n, N: p.N, share: p.share }))
    }));
    const globalMax = d3.max(series, s => d3.max(s.values, v => v.y));

    const root = d3.select("#chart-j").classed("chart-j", true).html("");
    const buttons = root.append("div").attr("class", "cj-buttons")
      .attr("role", "group").attr("aria-label", "Business type");
      const plot = root.append("div").attr("class", "cj-plot");

// Chart J tooltip, built like map-g's: body-level, fixed, positioned by clientX/Y
const tip = d3.select("body").append("div")
  .attr("class", "hdc-tooltip")
  .style("opacity", 0);

window.addEventListener("mousemove", (event) => {
  // only act while the mouse is over chart J's plot
  if (!plot.node().contains(event.target)) { tip.style("opacity", 0); return; }

  // find whatever tooltip the shared code is showing (lines or points)
  const shared = Array.from(document.querySelectorAll('[class*="tooltip"]'))
    .find((el) => {
      if (el === tip.node()) return false;
      const cs = getComputedStyle(el);
      return cs.display !== "none" && parseFloat(cs.opacity) > 0 && el.innerHTML.trim();
    });

  if (!shared) { tip.style("opacity", 0); return; }

  tip.html(shared.innerHTML).style("opacity", 1);
  shared.style.visibility = "hidden";   // hide the misplaced one

  const pad = 14, node = tip.node();
  const w = node.offsetWidth, h = node.offsetHeight;
  let left = event.clientX + pad;
  let top  = event.clientY + pad;
  if (left + w > window.innerWidth - 8) left = event.clientX - w - pad;
  if (top + h > window.innerHeight - 8) top = event.clientY - h - pad;
  tip.style("left", `${left}px`).style("top", `${top}px`);
}, true);
    

// The shared chart function builds its own tooltip inside #chart-j.
// Copy its text and visibility into ours (it stays hidden by the CSS below).
new MutationObserver(() => {
  const shared = root.node().querySelector(".hdc-tooltip");
  if (!shared) { tip.style("opacity", 0); return; }
  tip.html(shared.innerHTML)
     .style("opacity", getComputedStyle(shared).opacity);
}).observe(plot.node(), {
  subtree: true, childList: true, attributes: true, characterData: true
});




    const pct = d3.format(".1%"), num = d3.format(",");
    let current = null;

    function setSeries(name) {
      const s = series.find(d => d.key === slug(String(name)));
      if (!s) return;
      current = s.key;

      createHandDrawnLineChart({
        container: plot.node(),
        categories: [{ key: s.key, label: s.label, color: lineColor }],
        data: [{ key: s.key, values: s.values }],
        width: 860,     
        mainHeight: 760,
        brush: false,
        yMax: sharedY ? globalMax : null,
        tooltip: (key, p) =>
          `<strong>${s.label}, ${p.x}: ${p.n}</strong><br>`
      });


      // Chart J's own axis titles, drawn after each redraw
const svg = plot.select("svg");
if (!svg.attr("data-vb0")) svg.attr("data-vb0", svg.attr("viewBox"));  // remember the original
const vb0 = svg.attr("data-vb0").split(/\s+/).map(Number);             // [x, y, w, h]

const padL = 40, padB = 36;   // extra room: raise these if the titles still get cut off
svg.attr("viewBox", `${vb0[0] - padL} ${vb0[1]} ${vb0[2] + padL} ${vb0[3] + padB}`);

svg.selectAll(".cj-axis-title").remove();

svg.append("text")
  .attr("class", "cj-axis-title")
  .attr("x", vb0[0] + vb0[2] / 2)
  .attr("y", vb0[1] + vb0[3] + padB - 12)
  .attr("text-anchor", "middle")
  .attr("font-family", "'Jost', sans-serif")
  .attr("font-size", 20)
  .attr("fill", "#33302a")
  .text("Year");

svg.append("text")
  .attr("class", "cj-axis-title")
  .attr("transform", `translate(${vb0[0] - padL + 32},${vb0[1] + vb0[3] / 2}) rotate(-90)`)
  .attr("text-anchor", "middle")
  .attr("font-family", "'Jost', sans-serif")
  .attr("font-size", 20)
  .attr("fill", "#33302a")
  .text("Number of businesses");

      buttons.selectAll("button")
        .classed("is-active", d => d.key === current)
        .attr("aria-pressed", d => d.key === current);
    }

    buttons.selectAll("button").data(series).join("button")
      .attr("type", "button").attr("class", "cj-btn")
      .text(d => d.label)
      .on("click", (event, d) => setSeries(d.key));

    // redraw when the screen crosses the phone breakpoint
    mq.addEventListener("change", () => {
      if (current) { setSeries(current); if (window.ScrollTrigger) ScrollTrigger.refresh(); }
    });

    window.chartJ = { setSeries, names: series.map(d => d.label) };
    setSeries(series[0].key);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    return window.chartJ;
  });
}

// END CHART J

// CHART K individual store closures

// CHART K REPORTED COMMERCIAL RENT HIKES (NOMINAL DOLLARS)

function createChartK(data = null) {
  const defaultData = [
    {
      name: "Second Childhood",
      detail: "Antique toys",
      year: 2008,
      prevRent: 7000,
      newRent: 15000,
      outcome: "closed",
    },
    {
      name: "Nusraty Afghan Imports",
      detail: "Moved Bleecker St. to Christopher St. (closed 2020)",
      year: 2008,
      prevRent: 7000,
      newRent: 45000,
      outcome: "moved",
    },
    {
      name: "Rocco Ristorante",
      detail: "Italian restaurant",
      year: 2012,
      prevRent: 8000,
      newRent: 18000,
      outcome: "closed",
    },
    {
      name: "Arleen Bowman",
      detail: "Local designer boutique",
      year: 2012,
      prevRent: 2500,
      newRent: 35000,
      outcome: "closed",
    },
    {
      name: "Cafe Angelique",
      detail: "Café",
      year: 2014,
      prevRent: 16000,
      newRent: 42000,
      outcome: "closed",

    },
    {
      name: "Da'Vinci Shoes",
      detail: "Shoe store",
      year: 2016,
      prevRent: 6000,
      newRent: 40000,
      approx: true,
      outcome: "closed",
    }
  ];

  const accentColor = "#b25a3f";
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const fmtCurrency = d3.format("$,.0f");
  const fmtK = (d) => `$${Math.round(d / 1000)}k`;

  // Deterministic pixel jitter (dx, dy) so overlapping baselines & vertical jumps separate cleanly
  const jitterByKey = {
    "second-childhood":       { dx: -4, dy:  4 }, // 2008, $7k -> nudged left & slightly down
    "nusraty-afghan-imports": { dx:  4, dy: -4 }, // 2008, $7k -> nudged right & slightly up
    "rocco-ristorante":       { dx: -4, dy:  2 }, // 2012, $8k -> nudged left
    "arleen-bowman":          { dx:  4, dy: -2 }, // 2012, $2.5k -> nudged right
    "cafe-angelique":         { dx:  0, dy:  0 }, // 2014, $16k -> isolated
    "da-vinci-shoes":         { dx:  0, dy:  0 }, // 2016, $6k -> isolated
  };

  const render = (raw) => {
    const stores = raw.map((d, i) => {
      const key = slug(d.name);
      const jit = jitterByKey[key] || { dx: ((i % 3) - 1) * 3, dy: ((i % 2) ? 2 : -2) };
      return {
        ...d,
        key,
        startYear: d.year - 5,
        mult: (d.newRent / d.prevRent).toFixed(1),
        dx: jit.dx,
        dy: jit.dy,
        seed: i + 1,
      };
    });

    const instanceId = typeof inkNextId === "function" ? inkNextId("hdc-chart-k") : "hdc-chart-k";
    const root = d3.select("#chart-k")
      .classed("chart-k", true)
      .classed("hand-drawn-chart", true)
      .attr("data-instance", instanceId)
      .html("");

    const plot    = root.append("div").attr("class", "ck-plot");
    const readout = root.append("p").attr("class", "ck-readout").attr("aria-live", "polite");

    const width = 860;
    const height = 700;
    const margin = { top: 28, right: 185, bottom: 42, left: 64 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = plot.append("svg")
      .attr("class", "hdc-main")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .style("max-width", `${width}px`)
      .style("height", "auto")
      .style("overflow", "visible");

    const defs = svg.append("defs");
    const ink = typeof installInkFilters === "function" ? installInkFilters(defs, instanceId) : null;
    const inkFilter = ink ? `url(#${ink.filterId})` : null;
    const inkPath = (pts, seed) =>
      typeof inkLinePath === "function" ? inkLinePath(pts, seed) : d3.line()(pts);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xMin = d3.min(stores, (d) => d.startYear); // 2003
    const xMax = d3.max(stores, (d) => d.year);      // 2016
    const yMax = 50000;

    const x = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);
    const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

    // Gridlines & Axes

    g.append("g")
      .attr("class", "ck-axis ck-axis-x hdc-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format("d")))
      .call((sel) => sel.select(".domain").attr("stroke", "#33302a"));

    g.append("g")
      .attr("class", "ck-axis ck-axis-y hdc-axis")
      .call(d3.axisLeft(y).ticks(5).tickFormat(fmtK))
      .call((sel) => sel.select(".domain").attr("stroke", "#33302a"));

    g.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .attr("fill", "#33302a")
      .attr("font-family", "'Jost', sans-serif")
      .attr("font-size", "14px")
      .text("Monthly rent (nominal $)");

    // Helper for each store's jittered screen coordinates
    const coords = (d) => ({
      x0: x(d.startYear) + d.dx,
      x1: x(d.year) + d.dx,
      y0: y(d.prevRent) + d.dy,
      y1: y(d.newRent) + d.dy,
    });

    // Left-to-right fade gradients matched to each store's jittered x span
    stores.forEach((d) => {
      const c = coords(d);
      const grad = defs.append("linearGradient")
        .attr("id", `${instanceId}-fade-${d.key}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", c.x0)
        .attr("y1", 0)
        .attr("x2", c.x1)
        .attr("y2", 0);

      grad.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", accentColor)
        .attr("stop-opacity", 0);

      grad.append("stop")
        .attr("offset", "35%")
        .attr("stop-color", accentColor)
        .attr("stop-opacity", 0.35);

      grad.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", accentColor)
        .attr("stop-opacity", 1);
    });

    // Small vertical label nudges so closely spaced endpoints don't collide
    const labelOffsets = {
      "nusraty-afghan-imports": -4,
      "cafe-angelique": -2,
      "da-vinci-shoes": 4,
      "arleen-bowman": 4,
      "rocco-ristorante": 2,
      "second-childhood": 4
    };

       const storeGroups = g.selectAll(".ck-series")
      .data(stores, (d) => d.key)
      .join("g")
      .attr("class", "ck-series");

    // 1. Hand-drawn horizontal 5-year fading baseline
    storeGroups.append("path")
      .attr("class", "ck-baseline")
      .attr("d", (d) => {
        const c = coords(d);
        const midX = (c.x0 + c.x1) / 2;
        return inkPath([[c.x0, c.y0], [midX, c.y0], [c.x1, c.y0]], d.seed);
      })
      .attr("fill", "none")
      .attr("stroke", (d) => `url(#${instanceId}-fade-${d.key})`)
      .attr("opacity", 0.6)
      .attr("stroke-width", 2.8)
      .attr("stroke-linecap", "round")
      .attr("filter", inkFilter);

    // 2. Hand-drawn vertical renewal jump
    storeGroups.append("path")
      .attr("class", "ck-cliff")
      .attr("d", (d) => {
        const c = coords(d);
        const midY = (c.y0 + c.y1) / 2;
        return inkPath([[c.x1, c.y0], [c.x1, midY], [c.x1, c.y1]], d.seed + 10);
      })
      .attr("fill", "none")
      .attr("stroke", accentColor)
      .attr("opacity", 0.6)
      .attr("stroke-width", 2.8)
      .attr("stroke-linecap", "round")
      .attr("filter", inkFilter);

    // 4. Top endpoint marker (filled = closed, hollow = moved)
    storeGroups.append("circle")
      .attr("class", "ck-peak")
      .attr("cx", (d) => coords(d).x1)
      .attr("cy", (d) => coords(d).y1)
      .attr("r", 4.5)
      .attr("fill", (d) => d.outcome === "moved" ? "#fff" : accentColor)
      .attr("stroke", accentColor)
      .attr("stroke-width", 2.2)
      .attr("filter", inkFilter);

    // 5. Direct end labels: one shared layer, drawn above all lines/markers
const labelLayer = g.append("g")
  .attr("class", "ck-labels")

const labels = labelLayer.selectAll("text.ck-label")
  .data(stores, (d) => d.key)
  .join("text")
  .attr("class", "ck-label")
  .attr("x", (d) => coords(d).x1 + 9)
  .attr("y", (d) => coords(d).y1 + (labelOffsets[d.key] || 0))
  .attr("dominant-baseline", "middle")
  .attr("font-family", "'Jost', sans-serif")
  .attr("font-size", "12px")
  .attr("font-weight", "600")
  .attr("fill", "#33302a")
  .text((d) => `${d.name} (${d.year})`);


 // 6. Wide invisible hit areas so the thin lines are easy to hover
    storeGroups.append("path")
      .attr("class", "ck-hit")
      .attr("d", (d) => {
        const c = coords(d);
        return `M${c.x0},${c.y0}L${c.x1},${c.y0}L${c.x1},${c.y1}`;
      })
      .attr("fill", "none")
      .attr("stroke", "transparent")
      .attr("stroke-width", 16)
      .attr("pointer-events", "stroke");

    // Tooltip
    root.style("position", "relative");
    const tooltip = root.append("div")
      .attr("class", "hdc-tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", "10");

    const tipHtml = (d) => {
      const approx = d.approx ? "~" : "";
      const outcome = d.outcome === "moved" ? "Relocated" : "Closed at renewal";
      return (
        `<div style="font-weight:600;color:${accentColor};">${d.name}</div>` +
        `<div>${d.detail}</div>` +
        `<div>${d.year}: ${fmtCurrency(d.prevRent)} \u2192 ${approx}${fmtCurrency(d.newRent)} / month (${approx}${d.mult}\u00d7)</div>` +
        `<div>${outcome}</div>` +
        `<div style="opacity:.7;">${d.source}</div>`
      );
    };

    const placeTip = (event) => {
      const [mx, my] = d3.pointer(event, root.node());
      const rootW = root.node().clientWidth;
      const flip = mx > rootW * 0.6;   // flip to the left of the cursor near the right edge
      tooltip
        .style("left", flip ? "auto" : `${mx + 12}px`)
        .style("right", flip ? `${rootW - mx + 12}px` : "auto")
        .style("top", `${my - 28}px`);
    };

    const showTip = (event, d) => {
  tooltip.html(tipHtml(d)).style("opacity", 1);
  placeTip(event);
};
const hideTip = () => tooltip.style("opacity", 0);

storeGroups
  .on("mouseenter", showTip)
  .on("mousemove", placeTip)
  .on("mouseleave", hideTip);

labels
  .style("cursor", "default")
  .on("mouseenter", showTip)
  .on("mousemove", placeTip)
  .on("mouseleave", hideTip);

       // Subtle legend in top-left for closed vs. moved (stacked)
    const legend = g.append("g")
      .attr("class", "ck-legend")
      .attr("transform", "translate(36, 36)");

    legend.append("circle")
      .attr("cx", 0).attr("cy", 0).attr("r", 4)
      .attr("fill", accentColor)
      .attr("filter", inkFilter);
    legend.append("text")
      .attr("x", 9).attr("y", 0).attr("dominant-baseline", "middle")
      .attr("font-family", "'Jost', sans-serif")
      .attr("font-size", "14px").attr("fill", "#33302a")
      .text("Closed at renewal");

    legend.append("circle")
      .attr("cx", 0).attr("cy", 18).attr("r", 4)
      .attr("fill", "#fff").attr("stroke", accentColor).attr("stroke-width", 2)
      .attr("filter", inkFilter);
    legend.append("text")
      .attr("x", 9).attr("y", 18).attr("dominant-baseline", "middle")
      .attr("font-family", "'Jost', sans-serif")
      .attr("font-size", "14px").attr("fill", "#33302a")
      .text("Relocated (closed 2020)");

    let current = "all";

    function setSeries(name) {
  const targetKey = slug(String(name));
  const isAll = targetKey === "all";
  const match = isAll ? null : stores.find((d) => d.key === targetKey);
  if (!isAll && !match) return;

  current = isAll ? "all" : match.key;

  const opacityOf = (d) => (isAll || d.key === current) ? 1 : 0.16;

  storeGroups
    .transition().duration(180)
    .style("opacity", opacityOf);

  labels
    .transition().duration(180)
    .style("opacity", opacityOf);

  storeGroups.filter((d) => d.key === current).raise();
  labelLayer.raise(); // keep labels above the line that was just raised
}

    window.chartK = { setSeries, names: stores.map((d) => d.name) };
    setSeries("all");
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    return window.chartK;
  };

  if (typeof data === "string") {
    return d3.json(data).then(render);
  }
  return Promise.resolve(render(data || defaultData));
}

// END CHART K

function createChartL(data = null) {
  const accentColor = "#b25a3f";
  const inkColor = "#33302a";
  const FONT = "'Jost', sans-serif";

  const defaultData = [
    {
      state: "l1", start: 1961, end: 2001, when: "1961–2001",
      text: "Rents in Greenwich Village moved in tandem with rents in Manhattan as a whole.",
      stat: "$113",
      statNote: "mean asking rent in Greenwich Village in 2001:",
    },
    {
      state: "l2", at: 2000.5, when: "July 2000",
      text: "“Sex and the City” fans flock to Bleecker Street, already an emerging fashion scene for the young and fashion-conscious, after a scene set at Magnolia Bakery.",
    },
    {
      state: "l3", at: 2001, when: "2001",
      text: "Marc Jacobs begins opening boutiques on Bleecker, soon followed by Ralph Lauren and Cynthia Rowley.",
    },
    {
      state: "l4", start: 2001, end: 2010, when: "2001–2010",
      text: "As older leases expired, landlords raised rents to match the going rate, leaving stores vacant if no high-rent tenant would take over right away.",
    },
    {
      state: "l5", at: 2008, when: "2008",
      text: "REBNY adds Bleecker to the commercial corridors it tracks, alongside Madison Avenue and 5th Avenue, cementing its high-end retail status.",
      stat: "$397",
      statNote: "mean asking rent on Bleecker Street in 2008:",
    },
    {
      state: "l6", at: 2009, when: "2009",
      stat: "$528",
      statNote: "commercial rents peak on Bleecker Street at",
    },
    {
      state: "l7", at: 2010, when: "2010",
      text: "The profits the high-fashion brands expected never materialized, and they began to pull out.",
    },
    {
      state: "l8", start: 2013, end: 2021, when: "2013–2021",
      text: "Landlords, still holding out for $500+, were slow to realize that number might be unrealistic. Storefronts stay vacant in many cases for months or years.",
      stat: "$528 to $226",
      statNote: "Asking rents on Bleecker Street tumbled from",
    },
  ];

  const steps = (data || defaultData).map((d, i) => ({ ...d, state: d.state || `l${i + 1}` }));

  // ---- layout constants (SVG coordinate space) ----
  const W = 1000;
  const padX = 30;                  // space left/right of the time axis
  const padTop = 14, padBottom = 24, GAP = 12;
  const SPAN_W = 230;               // text width for blocks above the spine
  const PT_W = 176;                 // text width for blocks below the spine
  const ABOVE_GAP = 80;             // spine -> bottom of span text
  const BELOW_GAP = 60;             // spine -> top of point text
  const braceEndOff = 30, braceTipOff = 42;   // brace distance above the spine

  const F_DATE = `600 14px ${FONT}`;
  const F_NOTE = `600 13px ${FONT}`;
  const F_BODY = `400 14px ${FONT}`;
  const DATE_LH = 18, STAT_LH = 28, NOTE_LH = 16, BODY_LH = 18;

  if (!document.getElementById("chart-l-styles")) {
    const style = document.createElement("style");
    style.id = "chart-l-styles";
    style.textContent = `
      .chart-l { font-family: ${FONT}; color: ${inkColor}; max-width: ${W}px; }
      .chart-l .cl-axis, .chart-l .cl-entry { opacity: 0; transition: opacity 0.5s; }
      .chart-l .cl-axis.is-on, .chart-l .cl-entry.is-on { opacity: 1; }
      .chart-l .cl-dot { transform-box: fill-box; transform-origin: center; transition: transform 0.3s; }
      .chart-l .cl-entry.is-current .cl-dot { transform: scale(1.5); }
      @media (prefers-reduced-motion: reduce) {
        .chart-l .cl-axis, .chart-l .cl-entry, .chart-l .cl-dot { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  const ctx = document.createElement("canvas").getContext("2d");
  const wrap = (text, width, font) => {
    ctx.font = font;
    const lines = [];
    let line = "";
    text.split(/\s+/).forEach((w) => {
      const test = line ? `${line} ${w}` : w;
      if (line && ctx.measureText(test).width > width) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
  };

  // date, body, then the stat note (wrapped) and the big stat on its own line
  const buildBlock = (d, width) => {
    const body = d.text ? wrap(d.text, width, F_BODY) : [];
    const note = d.statNote ? wrap(d.statNote, width, F_NOTE) : [];
    const hasStat = Boolean(note.length || d.stat);
    const h = DATE_LH
            + body.length * BODY_LH
            + (body.length && hasStat ? 4 : 0)
            + note.length * NOTE_LH
            + (d.stat ? STAT_LH : 0);
    return { body, note, h };
  };

  const drawBlock = (g, d, blk, x, top) => {
    const put = (str, baseline, size, weight, fill) =>
      g.append("text")
        .attr("x", x).attr("y", baseline).attr("text-anchor", "start")
        .attr("font-family", FONT).attr("font-size", size)
        .attr("font-weight", weight).attr("fill", fill)
        .text(str);

    let y = top;
    put(d.when, y + 13, 14, 600, accentColor);
    y += DATE_LH;

    blk.body.forEach((l) => { put(l, y + 13, 14, 400, inkColor); y += BODY_LH; });

    if (blk.body.length && (blk.note.length || d.stat)) y += 4;

    blk.note.forEach((l) => { put(l, y + 12, 13, 600, inkColor); y += NOTE_LH; });

    if (d.stat) { put(d.stat, y + 20, 20, 600, accentColor); y += STAT_LH; }
  };

  // Horizontal curly brace from x0 to x1: ends at yEnd (toward the spine), tip at yTip (away)
  const hbrace = (x0, x1, yEnd, yTip) => {
    const r = Math.max(1, Math.min(6, (x1 - x0) / 4));
    const ym = yTip + (yEnd - yTip) / 2;
    const xm = (x0 + x1) / 2;
    return [
      `M${x0},${yEnd}`,
      `Q${x0},${ym} ${x0 + r},${ym}`,
      `L${xm - r},${ym}`,
      `Q${xm},${ym} ${xm},${yTip}`,
      `Q${xm},${ym} ${xm + r},${ym}`,
      `L${x1 - r},${ym}`,
      `Q${x1},${ym} ${x1},${yEnd}`,
    ].join(" ");
  };

  // Spread text blocks left to right so they never overlap, keeping time order
  const spread = (items, width) => {
    const minX = 10, maxX = W - 10;
    items.sort((a, b) => a.want - b.want);
    items.forEach((it, i) => {
      it.bx = Math.max(it.want, i ? items[i - 1].bx + width + GAP : minX);
    });
    for (let i = items.length - 1; i >= 0; i--) {
      const lim = (i === items.length - 1 ? maxX : items[i + 1].bx - GAP) - width;
      if (items[i].bx > lim) items[i].bx = lim;
    }
  };

  const render = () => {
    const root = d3.select("#chart-l").classed("chart-l", true).html("");

    const T0 = d3.min(steps, (d) => d.start ?? d.at);
    const T1 = Math.max(2026, d3.max(steps, (d) => d.end ?? d.at));
    const pxPerYear = (W - 2 * padX) / (T1 - T0);
    const x = (t) => padX + (t - T0) * pxPerYear;

    const pts = steps.filter((d) => d.at != null);
    const spans = steps.filter((d) => d.start != null);

    pts.forEach((d) => {
      d.ax = x(d.at);
      d.blk = buildBlock(d, PT_W);
      d.want = d.ax - 10;
    });
    spans.forEach((d) => {
      d.x0 = x(d.start); d.x1 = x(d.end); d.mid = (d.x0 + d.x1) / 2;
      d.blk = buildBlock(d, SPAN_W);
      d.want = d.mid - SPAN_W / 2;
    });
    spread(pts, PT_W);
    spread(spans, SPAN_W);

    const aboveH = d3.max(spans, (d) => d.blk.h) || 0;
    const belowH = d3.max(pts, (d) => d.blk.h) || 0;
    const spineY = padTop + aboveH + ABOVE_GAP;
    const H = spineY + BELOW_GAP + belowH + padBottom;

    spans.forEach((d) => { d.top = spineY - ABOVE_GAP - d.blk.h; });   // bottom-aligned above the brace
    pts.forEach((d) => { d.top = spineY + BELOW_GAP; });

    // ---- svg + hand-drawn helpers ----
    const instanceId = typeof inkNextId === "function" ? inkNextId("hdc-chart-l") : "hdc-chart-l";
    const svg = root.append("svg")
      .attr("class", "hdc-main")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", "100%")
      .style("max-width", `${W}px`)
      .style("height", "auto")
      .style("overflow", "visible");
    const defs = svg.append("defs");
    const ink = typeof installInkFilters === "function" ? installInkFilters(defs, instanceId) : null;
    const inkFilter = ink ? `url(#${ink.filterId})` : null;
    const inkPath = (p, seed) =>
      typeof inkLinePath === "function" ? inkLinePath(p, seed) : d3.line()(p);

    // ---- axis: horizontal spine + decade ticks (labels above the spine) ----
    const axis = svg.append("g").attr("class", "cl-axis");
    const xA = x(T0), xB = x(T1), xM = (xA + xB) / 2;
    axis.append("path")
      .attr("d", inkPath([[xA, spineY], [xM, spineY], [xB, spineY]], 7))
      .attr("fill", "none").attr("stroke", inkColor).attr("stroke-width", 2)
      .attr("stroke-linecap", "round").attr("filter", inkFilter);
    const ticks = Array.from(new Set([T0, ...d3.range(Math.ceil(T0 / 10) * 10, T1, 10), T1]));
    ticks.forEach((t) => {
      axis.append("line")
        .attr("x1", x(t)).attr("x2", x(t)).attr("y1", spineY - 5).attr("y2", spineY)
        .attr("stroke", inkColor).attr("stroke-width", 1);
      axis.append("text")
        .attr("x", x(t)).attr("y", spineY - 10).attr("text-anchor", "middle")
        .attr("font-family", FONT).attr("font-size", 11).attr("fill", inkColor)
        .attr("fill-opacity", 0.7).text(Math.round(t));
    });

    // ---- entries ----
    const entries = svg.selectAll("g.cl-entry")
      .data(steps)
      .join("g")
      .attr("class", "cl-entry")
      .attr("data-state", (d) => d.state);

    entries.each(function (d) {
      const g = d3.select(this);
      if (d.at != null) {
        // point: dot on the spine, leader curving down to the text below
        const y0 = spineY + 7, y1 = d.top - 6, ym = (y0 + y1) / 2;
        g.append("path")
          .attr("d", `M${d.ax},${y0} C${d.ax},${ym} ${d.bx + 4},${ym} ${d.bx + 4},${y1}`)
          .attr("fill", "none").attr("stroke", inkColor)
          .attr("stroke-opacity", 0.5).attr("stroke-width", 1);
        g.append("circle").attr("class", "cl-dot")
          .attr("cx", d.ax).attr("cy", spineY).attr("r", 5)
          .attr("fill", accentColor).attr("stroke", inkColor).attr("stroke-width", 2)
          .attr("filter", inkFilter);
        drawBlock(g, d, d.blk, d.bx, d.top);
      } else {
        // span: small dots at each end, brace above, leader up to the text
        [d.x0, d.x1].forEach((xx) =>
          g.append("circle").attr("class", "cl-dot")
            .attr("cx", xx).attr("cy", spineY).attr("r", 3.5)
            .attr("fill", accentColor).attr("stroke", inkColor).attr("stroke-width", 1.5));
        g.append("path")
          .attr("d", hbrace(d.x0 + 2, d.x1 - 2, spineY - braceEndOff, spineY - braceTipOff))
          .attr("fill", "none").attr("stroke", inkColor).attr("stroke-width", 1.8)
          .attr("stroke-linecap", "round").attr("filter", inkFilter);
        const y0 = spineY - braceTipOff - 1;
        const y1 = spineY - ABOVE_GAP + 6;
        const ym = (y0 + y1) / 2;
        const tx = d.bx + SPAN_W / 2;
        g.append("path")
          .attr("d", `M${d.mid},${y0} C${d.mid},${ym} ${tx},${ym} ${tx},${y1}`)
          .attr("fill", "none").attr("stroke", inkColor)
          .attr("stroke-opacity", 0.5).attr("stroke-width", 1);
        drawBlock(g, d, d.blk, d.bx, d.top);
      }
    });

    return function applyShow(state) {
      const all = state === "all";
      const none = state === "none";
      const at = steps.findIndex((d) => d.state === state);
      if (!all && !none && at < 0) return;
      axis.classed("is-on", !none);
      entries
        .classed("is-on", (d, i) => all || (!none && i <= at))
        .classed("is-current", (d, i) => !all && !none && i === at);
    };
  };

  let apply = null;
  let pending = "l1";
  window.chartL = {
    show: (s) => { pending = s; if (apply) apply(s); },
    states: steps.map((d) => d.state),
  };

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  return fontsReady.then(() => {
    apply = render();
    apply(pending);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    return window.chartL;
  });
}



// END CHART L

// CHART M

// CHART M LGBTQ+ BUSINESSES OVER TIME

function createChartM(dataPath = "data/lgbtq_chart.json") {
  const metric    = "n";
  const lineColor = "#b25a3f";
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const mq   = window.matchMedia("(max-width: 600px)");

  return d3.json(dataPath).then(raw => {
    const s0 = raw.series[0];
    const s = {
      key:    slug(s0.name),
      label:  s0.name,
      values: s0.points.map(p => ({ x: p.year, y: p[metric], n: p.n, N: p.N, share: p.share }))
    };
    const yMax = d3.max(s.values, v => v.y);

    const root = d3.select("#chart-m").classed("chart-m", true).html("");
    const plot = root.append("div").attr("class", "cm-plot");

    // Chart M tooltip, built like chart J's: body-level, fixed, positioned by clientX/Y
    const tip = d3.select("body").append("div")
      .attr("class", "hdc-tooltip")
      .style("opacity", 0);

    window.addEventListener("mousemove", (event) => {
      if (!plot.node().contains(event.target)) { tip.style("opacity", 0); return; }

      const shared = Array.from(document.querySelectorAll('[class*="tooltip"]'))
        .find((el) => {
          if (el === tip.node()) return false;
          const cs = getComputedStyle(el);
          return cs.display !== "none" && parseFloat(cs.opacity) > 0 && el.innerHTML.trim();
        });

      if (!shared) { tip.style("opacity", 0); return; }

      tip.html(shared.innerHTML).style("opacity", 1);
      shared.style.visibility = "hidden";

      const pad = 14, node = tip.node();
      const w = node.offsetWidth, h = node.offsetHeight;
      let left = event.clientX + pad;
      let top  = event.clientY + pad;
      if (left + w > window.innerWidth - 8) left = event.clientX - w - pad;
      if (top + h > window.innerHeight - 8) top = event.clientY - h - pad;
      tip.style("left", `${left}px`).style("top", `${top}px`);
    }, true);

    // Copy the shared function's own tooltip text and visibility into ours
    new MutationObserver(() => {
      const shared = root.node().querySelector(".hdc-tooltip");
      if (!shared) { tip.style("opacity", 0); return; }
      tip.html(shared.innerHTML)
         .style("opacity", getComputedStyle(shared).opacity);
    }).observe(plot.node(), {
      subtree: true, childList: true, attributes: true, characterData: true
    });

    function draw() {
      createHandDrawnLineChart({
        container: plot.node(),
        categories: [{ key: s.key, label: "", color: lineColor }],
        data: [{ key: s.key, values: s.values }],
        width: 860,
        mainHeight: 760,
        brush: false,
        yMax: yMax,
        tooltip: (key, p) =>
          `<strong>${s.label}, ${p.x}: ${p.n}</strong><br>`
      });

      // Chart M's own axis titles, drawn after each redraw
      const svg = plot.select("svg");
      if (!svg.attr("data-vb0")) svg.attr("data-vb0", svg.attr("viewBox"));
      const vb0 = svg.attr("data-vb0").split(/\s+/).map(Number);   // [x, y, w, h]

      const padL = 40, padB = 36;
      svg.attr("viewBox", `${vb0[0] - padL} ${vb0[1]} ${vb0[2] + padL} ${vb0[3] + padB}`);

      svg.selectAll(".cm-axis-title").remove();

      svg.append("text")
        .attr("class", "cm-axis-title")
        .attr("x", vb0[0] + vb0[2] / 2)
        .attr("y", vb0[1] + vb0[3] + padB - 12)
        .attr("text-anchor", "middle")
        .attr("font-family", "'Jost', sans-serif")
        .attr("font-size", 24)
        .attr("fill", "#33302a")
        .text("Year");

      svg.append("text")
        .attr("class", "cm-axis-title")
        .attr("transform", `translate(${vb0[0] - padL + 32},${vb0[1] + vb0[3] / 2}) rotate(-90)`)
        .attr("text-anchor", "middle")
        .attr("font-family", "'Jost', sans-serif")
        .attr("font-size", 24)
        .attr("fill", "#33302a")
        .text("Number of businesses");
    }

    // redraw when the screen crosses the phone breakpoint
    mq.addEventListener("change", () => {
      draw();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });

    window.chartM = { redraw: draw };
    draw();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    return window.chartM;
  });
}

// END CHART M

// END CHART M



//END CHARTS

//necessary extra calls
createChartJ();
createChartK();
createChartL();
createChartM();
