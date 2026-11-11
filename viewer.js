/* Full-page viewer (based on scroll-pages-v2.html): one 1280x860 screen per page,
   long pages scroll inside their screen first, then the next wheel gesture turns the page. */
(() => {
  const SITE = window.SITE;
  const W = 1280;
  const H = 860;
  const DURATION = 800; // page turn (matches .viewer-track transition)
  const GAP = 140; // ms without wheel events = a new gesture
  const GUTTER = 48; // free space on both sides for the page indicator

  const stage = document.getElementById("stage");
  const track = document.getElementById("track");
  const dotsBox = document.getElementById("dots");

  const slug = (file) => file.replace(/\.html$/, "");

  const pages = SITE.PAGES.map((p) => {
    const sec = document.createElement("section");
    sec.className = "viewer-page";
    sec.setAttribute("aria-label", p.title);
    const canvas = document.createElement("div");
    canvas.className = "viewer-canvas";
    const frame = document.createElement("iframe");
    frame.title = p.title;
    frame.style.height = `${p.h}px`;
    frame.setAttribute("scrolling", "no");
    const st = { ...p, canvas, frame, max: Math.max(0, p.h - H), cur: 0, target: 0, loaded: false };
    // the empty frame fires a "load" as soon as it is attached; only real page loads count
    frame.addEventListener("load", () => st.loaded && tell(st));
    canvas.append(frame);
    sec.append(canvas);
    track.append(sec);
    return st;
  });

  const dots = pages.map((p, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "viewer-dot";
    dot.dataset.page = slug(p.file);
    dot.setAttribute("aria-label", p.title);
    dot.innerHTML = `<span>${p.title}</span>`;
    dot.addEventListener("click", () => goTo(i));
    dotsBox.append(dot);
    return dot;
  });

  const fromHash = SITE.indexOf(`${decodeURIComponent(location.hash.slice(1))}.html`);
  let index = fromHash > 0 ? fromHash : 0;
  let locked = false;
  let lockTimer = 0;
  let lastWheel = 0;
  let waitFresh = false; // after a page turn, ignore the rest of that wheel gesture

  SITE.router = (file) => goTo(SITE.indexOf(file));

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // load the current page and its neighbours only (the story page alone is ~9 MB of images)
  function load(i) {
    const st = pages[i];
    if (!st || st.loaded) return;
    st.frame.src = st.file;
    st.loaded = true;
  }

  // pages hear "site:visibility" through site.js (e.g. ABOUT ME restarts its cycle when shown)
  function tell(st) {
    st.frame.contentWindow?.postMessage({ site: "visibility", active: st === pages[index] }, "*");
  }

  function apply(st) {
    st.canvas.style.transform = `translateY(${-st.cur}px)`;
  }

  function render() {
    track.style.transform = `translateY(${-index * H}px)`;
    dots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === index)));
    document.body.dataset.page = slug(pages[index].file); // viewer.css: dark backdrop behind CONTACT
    history.replaceState(null, "", index ? `#${slug(pages[index].file)}` : location.pathname);
    load(index);
    load(index + 1);
    load(index - 1);
    pages.forEach((st) => st.loaded && tell(st));
  }

  // fromEnd: arriving from the page below shows the bottom of a long page
  function goTo(next, fromEnd = false) {
    if (next < 0 || next >= pages.length || next === index) return;
    const st = pages[next];
    st.target = st.cur = fromEnd ? st.max : 0;
    apply(st);
    index = next;
    locked = true;
    waitFresh = true;
    clearTimeout(lockTimer);
    lockTimer = setTimeout(() => (locked = false), DURATION);
    render();
  }

  function turn(dir) {
    if (!locked) goTo(index + dir, dir < 0);
  }

  // use up the page's own scroll first; at its end only a *new* gesture turns the page
  function handle(dy, fresh) {
    const st = pages[index];
    const dir = dy > 0 ? 1 : -1;
    const canScroll = dir > 0 ? st.target < st.max - 1 : st.target > 1;
    if (canScroll) {
      st.target = clamp(st.target + dy, 0, st.max);
      animate();
    } else if (fresh) {
      turn(dir);
    }
  }

  function onWheel(dy) {
    if (Math.abs(dy) < 1) return;
    const now = Date.now();
    const fresh = now - lastWheel > GAP;
    lastWheel = now;
    // trackpad/mouse inertia from the gesture that turned the page must not scroll the new page:
    // a long page always shows its title first, the next gesture scrolls it
    if (locked) return;
    if (waitFresh) {
      if (!fresh) return;
      waitFresh = false;
    }
    handle(dy, fresh);
  }

  function onKey(key) {
    if (key === "ArrowDown" || key === "PageDown") handle(key === "PageDown" ? H * 0.8 : 120, true);
    if (key === "ArrowUp" || key === "PageUp") handle(key === "PageUp" ? -H * 0.8 : -120, true);
  }

  // touch: drag scrolls a long page; a swipe that did not scroll turns the page
  let touchY = null;
  let touchTotal = 0;
  let touchScrolled = false;
  function onTouch(phase, y) {
    if (phase === "start") {
      touchY = y;
      touchTotal = 0;
      touchScrolled = false;
    } else if (phase === "move" && touchY !== null) {
      const d = touchY - y;
      touchY = y;
      touchTotal += d;
      const st = pages[index];
      if (d > 0 ? st.target < st.max : st.target > 0) {
        st.target = clamp(st.target + d, 0, st.max);
        touchScrolled = true;
        animate();
      }
    } else if (phase === "end") {
      if (!touchScrolled && Math.abs(touchTotal) > 40) turn(touchTotal > 0 ? 1 : -1);
      touchY = null;
    }
  }

  let raf = 0;
  function animate() {
    if (raf) return;
    const tick = () => {
      const st = pages[index];
      st.cur += (st.target - st.cur) * 0.2;
      if (Math.abs(st.target - st.cur) < 0.5) st.cur = st.target;
      apply(st);
      raf = st.cur === st.target ? 0 : requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      onWheel(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
    },
    { passive: false },
  );
  window.addEventListener("keydown", (e) => {
    if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(e.key)) return;
    e.preventDefault();
    onKey(e.key);
  });

  const scale = () => Math.min((window.innerWidth - GUTTER * 2) / W, window.innerHeight / H);
  window.addEventListener("touchstart", (e) => onTouch("start", e.touches[0].clientY / scale()), { passive: true });
  window.addEventListener("touchmove", (e) => onTouch("move", e.touches[0].clientY / scale()), { passive: true });
  window.addEventListener("touchend", () => onTouch("end"), { passive: true });

  // messages from the pages (site.js bridge); page coordinates are already artboard px
  window.addEventListener("message", (e) => {
    const msg = e.data;
    if (!msg || typeof msg.site !== "string" || !pages.some((p) => p.frame.contentWindow === e.source)) return;
    if (msg.site === "wheel") onWheel(msg.dy);
    else if (msg.site === "key") onKey(msg.key);
    else if (msg.site === "touch") onTouch(msg.phase, msg.y);
    else if (msg.site === "goto") goTo(SITE.indexOf(msg.file));
  });

  function fit() {
    stage.style.setProperty("--scale", String(scale()));
  }

  window.addEventListener("resize", fit);
  window.addEventListener("hashchange", () => {
    const i = SITE.indexOf(`${decodeURIComponent(location.hash.slice(1))}.html`);
    goTo(i < 0 ? 0 : i);
  });
  fit();
  track.style.transition = "none"; // start on the hashed page without sliding through the others
  render();
  track.getBoundingClientRect();
  track.style.transition = "";
})();
