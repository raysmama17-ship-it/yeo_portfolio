(() => {
  "use strict";

  const INTERVAL_MS = 3000; // auto change every n seconds (t1 -> t2 -> t3 -> t1 ...)

  /* Motion from the reference video (Figma Smart Animate):
     custom curve cubic-bezier(0.53, 0, 0, 1), 1000ms.
     The current hero sinks below the window while the next one springs up into place. */
  const DURATION_MS = 1000;
  const EASING = "cubic-bezier(0.53, 0, 0, 1)";
  const DROP_PX = 640; // hero content starts at y 121; the window ends at y 740

  const stage = document.getElementById("stage");
  const heroes = Array.from(document.querySelectorAll(".hero-img"));
  const boxes = Array.from(document.querySelectorAll(".box"));

  let current = 0;
  let running = [];
  let timer = null;

  function fit() {
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 860);
    stage.style.setProperty("--scale", String(scale));
  }

  function setVisible(...indexes) {
    heroes.forEach((img, i) => img.classList.toggle("is-active", indexes.includes(i)));
  }

  function show(next) {
    if (next === current) return;

    // A click during a transition jumps the previous one to its end state first.
    running.forEach((a) => a.cancel());

    const prev = current;
    current = next;
    boxes.forEach((box, i) => box.setAttribute("aria-pressed", String(i === next)));
    setVisible(prev, next);

    const timing = { duration: DURATION_MS, easing: EASING, fill: "both" };
    const down = `translateY(${DROP_PX}px)`;
    const leave = heroes[prev].animate([{ transform: "none" }, { transform: down }], timing);
    const enter = heroes[next].animate([{ transform: down }, { transform: "none" }], timing);
    running = [leave, enter];

    enter.onfinish = () => {
      setVisible(next);
      leave.cancel();
      enter.cancel();
      running = [];
    };
  }

  boxes.forEach((box, i) => {
    box.addEventListener("click", () => {
      clearInterval(timer); // manual selection stops the auto change for good
      timer = null;
      show(i);
    });
  });

  window.addEventListener("resize", fit);
  fit();
  timer = setInterval(() => show((current + 1) % heroes.length), INTERVAL_MS);
})();
