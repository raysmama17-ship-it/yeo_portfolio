/* Shared by every page and the viewer (index.html): page order, page links, viewer bridge.
   Load it before the page's own script:  <script src="site.js"></script>
   The viewer loads it with data-role="viewer". */
(() => {
  // Page order of the whole portfolio. h = artboard height (all pages are 1280px wide).
  const PAGES = [
    { file: "intro.html", title: "INTRO", h: 860 },
    { file: "aboutme.html", title: "ABOUT ME", h: 860 },
    { file: "snippets.html", title: "SURVIVING SNIPPETS", h: 860 },
    { file: "onepage.html", title: "WORK-ONEPAGE", h: 1955 },
    { file: "diary.html", title: "WORK-DIARY", h: 1311 },
    { file: "story.html", title: "WORK-WEBSTORY", h: 2500 },
  ];
  const W = 1280;

  const isViewer = document.currentScript?.dataset.role === "viewer";
  const framed = !isViewer && window.parent !== window;
  const fileOf = (href) => {
    try {
      return decodeURIComponent(new URL(href, location.href).pathname.split("/").pop());
    } catch {
      return "";
    }
  };
  const current = fileOf(location.href);
  const indexOf = (file) => PAGES.findIndex((p) => p.file === file);

  const SITE = {
    PAGES,
    router: null, // the viewer sets this to move its track instead of loading a page
    indexOf,
    go(file) {
      if (indexOf(file) < 0) return;
      if (SITE.router) SITE.router(file);
      else if (framed) window.parent.postMessage({ site: "goto", file }, "*");
      else location.href = file;
    },
    next() {
      const next = PAGES[indexOf(current) + 1];
      if (next) SITE.go(next.file);
    },
  };
  window.SITE = SITE;

  if (isViewer) return;

  /* ---------- long pages: fit the 1280px artboard to the window width ---------- */
  const board = document.querySelector("[data-artboard]");
  if (board) {
    const fit = () => {
      const scale = window.innerWidth / W;
      board.style.setProperty("--scale", String(scale));
      document.body.style.height = `${board.offsetHeight * scale}px`;
    };
    window.addEventListener("resize", fit);
    fit();
  }

  /* ---------- inside the viewer: hand scrolling and page links to the parent ---------- */
  if (framed) {
    const post = (msg) => window.parent.postMessage(msg, "*");

    // the viewer tells each page whether it is the one on screen → "site:visibility" event
    window.addEventListener("message", (e) => {
      if (e.source !== window.parent || e.data?.site !== "visibility") return;
      document.dispatchEvent(new CustomEvent("site:visibility", { detail: { active: e.data.active } }));
    });

    // an element inside the page that can still scroll that way keeps the wheel; an open modal keeps it always
    const scrollsInside = (el, dy) => {
      if (el.closest?.('[aria-modal="true"]:not([hidden])')) return true;
      for (; el && el !== document.body && el.nodeType === 1; el = el.parentElement) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
          if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
        }
      }
      return false;
    };

    window.addEventListener(
      "wheel",
      (e) => {
        const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        if (scrollsInside(e.target, dy)) return;
        e.preventDefault();
        post({ site: "wheel", dy });
      },
      { passive: false },
    );

    window.addEventListener("keydown", (e) => {
      if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(e.key)) return;
      if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      post({ site: "key", key: e.key });
    });

    window.addEventListener("touchstart", (e) => post({ site: "touch", phase: "start", y: e.touches[0].clientY }), { passive: true });
    window.addEventListener("touchmove", (e) => post({ site: "touch", phase: "move", y: e.touches[0].clientY }), { passive: true });
    window.addEventListener("touchend", () => post({ site: "touch", phase: "end" }), { passive: true });

    // after the page's own handlers (e.g. the intro's first tap only fans the cards out)
    document.addEventListener("click", (e) => {
      const a = e.target.closest?.("a[href]");
      if (e.defaultPrevented || !a || a.target === "_blank" || indexOf(fileOf(a.href)) < 0) return;
      e.preventDefault();
      SITE.go(fileOf(a.href));
    });
  }
})();
