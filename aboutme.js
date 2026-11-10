(() => {
  "use strict";

  const INTERVAL_MS = 3000; // a new screen slides in every 3s: 1 -> 2 -> 3 -> 1 ...

  /* ---------- layout, measured on refs/aboutme/slide01~03.jpg (1280x860 artboard) ---------- */

  // main character placement: scale of the source PNG and its top-left corner
  const MAIN = {
    orange: { w: 623, s: 0.621, x: 569, y: 124 }, // img01.png
    white: { w: 630, s: 0.584, x: 595, y: 123 }, // img02.png
    black: { w: 640, s: 0.62, x: 542, y: 122 }, // img03.png
  };

  // back capsule slots (centre + length; all capsules are 92px thick, -17.5deg)
  const SLOT = {
    top: { cx: 818, cy: 265, len: 310 }, // upper right, behind the head
    left: { cx: 672, cy: 422, len: 327 }, // middle left
  };

  // per screen: which capsule is in front (with its exact front geometry), where the others sit,
  // and the vertical centre of the white band (slide01 has it 42px lower than slide02/03)
  const SCREENS = [
    { front: "orange", frontSlot: { cx: 742, cy: 518, len: 454 }, back: { white: "left", black: "top" }, bandY: 349 },
    { front: "white", frontSlot: { cx: 764, cy: 520, len: 353 }, back: { orange: "left", black: "top" }, bandY: 307 },
    { front: "black", frontSlot: { cx: 742, cy: 518, len: 357 }, back: { orange: "left", white: "top" }, bandY: 307 },
  ];

  // front capsule look: orange multiplies over the character, white/black are translucent
  const FRONT_LOOK = {
    orange: { opacity: 1, blend: "multiply" },
    white: { opacity: 0.79, blend: "normal" },
    black: { opacity: 0.9, blend: "normal" },
  };

  // character inside a back capsule: opacity + framing relative to the capsule centre
  const THUMB = {
    orange: { opacity: 0.3, left: { s: 0.41, dx: -187, dy: -61 } },
    white: { opacity: 0.2, left: { s: 0.39, dx: -178, dy: -48 }, top: { s: 0.39, dx: -54, dy: -93 } },
    black: { opacity: 0.2, top: { s: 0.57, dx: -135, dy: -148 } },
  };

  /* ---------- motion ---------- */
  const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
  const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
  const CAP = { duration: 900, easing: EASE_IN_OUT };
  const MAIN_IN = { duration: 900, delay: 200, easing: EASE_OUT };
  const MAIN_OUT = { duration: 700, easing: EASE_IN_OUT };
  const THUMB_IN = { duration: 450, delay: 550, easing: "ease-out" };
  const THUMB_OUT = { duration: 250, easing: "ease-in" };
  const TEXT_OUT = { duration: 350, easing: "ease-in" };
  const TITLE_IN = { duration: 700, delay: 350, easing: EASE_OUT };
  const BODY_IN = { duration: 700, delay: 450, easing: EASE_OUT };

  const RISE_PX = 70; // the new main character starts this far below its capsule

  /* ---------- elements ---------- */
  const stage = document.getElementById("stage");
  const band = stage.querySelector(".band");
  const pick = (sel) => Object.fromEntries([...stage.querySelectorAll(sel)].map((el) => [el.dataset.color, el]));
  const caps = pick(".cap");
  const mains = pick(".main");
  const copies = pick(".copy");
  const minis = [...stage.querySelectorAll(".mini")];
  const thumbs = Object.fromEntries(Object.entries(caps).map(([c, el]) => [c, el.querySelector("img")]));
  const COLORS = Object.keys(caps);

  let current = -1;
  let timer = 0;

  /* Animate el from its current (possibly mid-animation) value to `to`.
     The end state is written to el.style, so an interrupted run just restarts from wherever it is. */
  function tween(el, to, opts, from) {
    const cs = getComputedStyle(el);
    const start = from || Object.fromEntries(Object.keys(to).map((k) => [k, cs[k]]));
    el.getAnimations().forEach((a) => a.cancel());
    Object.assign(el.style, to);
    if (opts) el.animate([start, to], { fill: "backwards", ...opts });
  }

  const px = (n) => `${n}px`;

  // where the character of `color` sits (page coords) when its capsule is in back slot `slotName`
  function thumbPlace(color, slotName) {
    const slot = SLOT[slotName];
    const f = THUMB[color][slotName];
    return { x: slot.cx + f.dx, y: slot.cy + f.dy, s: f.s };
  }

  // transform that moves/shrinks the main image onto a thumbnail placement
  function mainTransform(color, place, extraY = 0) {
    const m = MAIN[color];
    return `translate(${place.x - m.x}px, ${place.y - m.y + extraY}px) scale(${place.s / m.s})`;
  }

  function show(index, animate) {
    if (index === current) return;
    const prev = SCREENS[current];
    const next = SCREENS[index];
    current = index;
    tween(band, { top: px(next.bandY) }, animate && CAP);

    for (const color of COLORS) {
      const cap = caps[color];
      const thumb = thumbs[color];
      const main = mains[color];
      const wasFront = prev && prev.front === color;

      if (color === next.front) {
        const look = FRONT_LOOK[color];
        const slot = next.frontSlot;
        cap.style.zIndex = "5";
        cap.style.mixBlendMode = look.blend;
        tween(cap, { left: px(slot.cx), top: px(slot.cy), width: px(slot.len), opacity: String(look.opacity) }, animate && CAP);
        tween(thumb, { opacity: "0" }, animate && THUMB_OUT);

        main.style.zIndex = "4";
        const from = prev && {
          transform: mainTransform(color, thumbPlace(color, prev.back[color]), RISE_PX),
          opacity: "0",
        };
        tween(main, { transform: "none", opacity: "1" }, animate && MAIN_IN, from);
      } else {
        const slotName = next.back[color];
        const slot = SLOT[slotName];
        const frame = THUMB[color][slotName];
        cap.style.zIndex = "2";
        cap.style.mixBlendMode = "normal";
        tween(cap, { left: px(slot.cx), top: px(slot.cy), width: px(slot.len), opacity: "1" }, animate && CAP);
        const framing = { left: px(frame.dx), top: px(frame.dy), width: px(MAIN[color].w * frame.s) };
        const thumbOpacity = String(THUMB[color].opacity);
        if (wasFront) {
          // it was hidden while in front: place it, then fade it in as the capsule settles
          tween(thumb, framing);
          tween(thumb, { opacity: thumbOpacity }, animate && THUMB_IN);
        } else {
          tween(thumb, { ...framing, opacity: thumbOpacity }, animate && CAP);
        }

        main.style.zIndex = "3";
        tween(
          main,
          { transform: mainTransform(color, thumbPlace(color, slotName)), opacity: "0" },
          animate && wasFront && MAIN_OUT,
        );
      }

      const copy = copies[color];
      const title = copy.querySelector(".copy-title");
      const body = copy.querySelector(".copy-body");
      if (color === next.front) {
        copy.removeAttribute("aria-hidden");
        // `translate` (not `transform`) so the slide composes with the CSS skew
        const below = { translate: "0 40px", opacity: "0" };
        tween(title, { translate: "0 0", opacity: "1" }, animate && TITLE_IN, below);
        tween(body, { translate: "0 0", opacity: "1" }, animate && BODY_IN, below);
      } else {
        copy.setAttribute("aria-hidden", "true");
        if (wasFront || !animate) {
          const above = { translate: "0 -30px", opacity: "0" };
          tween(title, above, animate && TEXT_OUT);
          tween(body, above, animate && TEXT_OUT);
        }
      }
    }

    minis.forEach((btn) => btn.setAttribute("aria-current", String(btn.dataset.color === next.front)));
  }

  function restartAutoplay() {
    clearInterval(timer);
    timer = setInterval(() => show((current + 1) % SCREENS.length, true), INTERVAL_MS);
  }

  // A mini capsule jumps to its screen; the automatic cycle carries on from there with a fresh 3s.
  minis.forEach((btn) => {
    btn.addEventListener("click", () => {
      show(SCREENS.findIndex((s) => s.front === btn.dataset.color), true);
      restartAutoplay();
    });
  });

  for (const color of COLORS) {
    const m = MAIN[color];
    Object.assign(mains[color].style, { left: px(m.x), top: px(m.y), width: px(m.w * m.s) });
  }

  function fit() {
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 860);
    stage.style.setProperty("--scale", String(scale));
  }

  window.addEventListener("resize", fit);
  fit();
  show(0, false);
  restartAutoplay();

  // inside the viewer: start from screen 1 each time the page comes into view, pause while hidden
  document.addEventListener("site:visibility", (e) => {
    if (e.detail.active) {
      show(0, false);
      restartAutoplay();
    } else {
      clearInterval(timer);
    }
  });
})();
