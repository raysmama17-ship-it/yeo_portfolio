(() => {
  "use strict";

  const SLIDES = [
    { src: "imgs/snippets/01.jpg", caption: "이마고 홈페이지 시안1 - 도서 소개 페이지" },
    { src: "imgs/snippets/02.jpg", caption: "인물 연보 페이지" },
    { src: "imgs/snippets/04.jpg", caption: "이마고 홈페이지 시안2 - 책소개 페이지" },
    { src: "imgs/snippets/05.jpg", caption: "LG COMM. 사업장 탐방" },
    { src: "imgs/snippets/07.jpg", caption: "LG COMM. 인터넷 중계 이벤트페이지" },
    { src: "imgs/snippets/08.jpg", caption: "하나TV 특집 편성 배너1" },
    { src: "imgs/snippets/09.jpg", caption: "하나TV 외국어 학습 배너" },
    { src: "imgs/snippets/10.jpg", caption: "하나TV 특집 편성 배너2" },
  ];

  // Artboard geometry (1920x1080). Key = offset from the centered slide.
  const ROW_CENTER_Y = 702;
  const LAYOUT = {
    0: { x: 960, w: 400, h: 292, opacity: 1 },
    1: { x: 1340, w: 290, h: 204, opacity: 0.62 },
    2: { x: 1665, w: 290, h: 204, opacity: 0.5 },
    3: { x: 1990, w: 290, h: 204, opacity: 0 },
  };
  const START_INDEX = 2; // 04.jpg is centered on load, as in the prototype

  const stage = document.getElementById("stage");
  const track = document.getElementById("track");
  const caption = document.getElementById("caption");
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modal-img");
  const modalTitle = document.getElementById("modal-title");
  const modalScroll = document.getElementById("modal-scroll");
  const modalClose = document.getElementById("modal-close");

  const count = SLIDES.length;
  const half = Math.floor(count / 2);
  let current = START_INDEX;
  let lastFocus = null;

  /* ---------- fit artboard to viewport ---------- */
  function fit() {
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 860);
    stage.style.setProperty("--scale", String(scale));
  }

  /* ---------- carousel ---------- */
  const items = SLIDES.map((slide, i) => {
    const li = document.createElement("li");
    li.className = "slide";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", `${slide.caption} 크게 보기`);
    const img = document.createElement("img");
    img.src = slide.src;
    img.alt = slide.caption;
    img.draggable = false;
    btn.append(img);
    li.append(btn);
    btn.addEventListener("click", () => {
      if (i === current) openModal(i);
      else go(signedOffset(i, current));
    });
    track.append(li);
    return { li, btn, offset: null };
  });

  // Offset of slide i from the centered slide, wrapped into [-half, count-half-1].
  function signedOffset(i, center) {
    let off = (((i - center) % count) + count) % count;
    if (off > count - half - 1) off -= count;
    return off;
  }

  function render() {
    items.forEach((item, i) => {
      const off = signedOffset(i, current);
      const abs = Math.min(Math.abs(off), 3);
      const base = LAYOUT[abs];
      const x = off < 0 ? 1920 - base.x : base.x;
      // A slide wrapping around the hidden ends must not sweep across the row.
      const wrapped = item.offset !== null && Math.abs(off - item.offset) > 1;
      item.li.classList.toggle("no-anim", wrapped);
      item.li.classList.toggle("is-center", off === 0);
      item.li.style.width = `${base.w}px`;
      item.li.style.height = `${base.h}px`;
      item.li.style.transform = `translate(${x - base.w / 2}px, ${ROW_CENTER_Y - base.h / 2}px)`;
      item.li.style.opacity = String(Math.abs(off) > 2 ? 0 : base.opacity);
      item.li.style.zIndex = String(10 - abs);
      item.li.style.visibility = Math.abs(off) > 3 ? "hidden" : "visible";
      item.li.setAttribute("aria-hidden", String(Math.abs(off) > 2));
      item.btn.tabIndex = off === 0 ? 0 : -1;
      item.offset = off;
    });
    // Re-enable transitions after the wrapped slides have jumped.
    requestAnimationFrame(() => {
      items.forEach((item) => item.li.classList.remove("no-anim"));
    });
    setCaption(SLIDES[current].caption);
  }

  let captionTimer = 0;
  function setCaption(text) {
    if (caption.textContent === text) return;
    if (!caption.textContent) {
      caption.textContent = text;
      return;
    }
    caption.classList.add("is-fading");
    clearTimeout(captionTimer);
    captionTimer = setTimeout(() => {
      caption.textContent = text;
      caption.classList.remove("is-fading");
    }, 200);
  }

  function go(step) {
    current = (((current + step) % count) + count) % count;
    render();
  }

  document.getElementById("prev").addEventListener("click", () => go(-1));
  document.getElementById("next").addEventListener("click", () => go(1));

  /* ---------- modal ---------- */
  function openModal(i) {
    lastFocus = document.activeElement;
    modalImg.src = SLIDES[i].src;
    modalImg.alt = SLIDES[i].caption;
    modalTitle.textContent = SLIDES[i].caption;
    modalScroll.scrollTop = 0;
    modal.hidden = false;
    void modal.offsetWidth; // flush so the opening transition runs
    modal.classList.add("is-open");
    modalClose.focus({ preventScroll: true });
  }

  function closeModal() {
    if (modal.hidden || !modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    const done = () => {
      modal.removeEventListener("transitionend", onEnd);
      clearTimeout(fallback);
      if (modal.classList.contains("is-open")) return; // reopened mid-fade
      modal.hidden = true;
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    const onEnd = (e) => {
      if (e.target === modal) done();
    };
    const fallback = setTimeout(done, 400);
    modal.addEventListener("transitionend", onEnd);
  }

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (!modal.hidden) {
      if (e.key === "Escape") closeModal();
      return;
    }
    if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
  });

  window.addEventListener("resize", fit);
  fit();
  render();
})();
