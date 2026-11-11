(() => {
  // Menu order = stacking order (first item is on top) = page order after the intro.
  // `angle`: tilt in the angle list (CSS degrees, + = clockwise); the stack uses the same tilt.
  const WORKS = [
    { key: "aboutme", img: "imgs/intro/intro_aboutme.jpg", href: "aboutme.html", angle: 7, menu: "<b>ABOUT ME</b>", tag: "<b>ABOUT ME</b>" },
    { key: "snippets", img: "imgs/intro/intro_snippets.jpg", href: "snippets.html", angle: -4, menu: "<b>SURVIVING SNIPPETS</b>", tag: "<b>SURVIVING<br>SNIPPETS</b>" },
    { key: "onepage", img: "imgs/intro/intro_onepage.jpg", href: "onepage.html", angle: -7, menu: "WORK <b>- ONEPAGE</b>", tag: "WORK<br><b>- ONEPAGE</b>" },
    { key: "diary", img: "imgs/intro/intro_diary.jpg", href: "diary.html", angle: 4, menu: "WORK <b>- DIARY</b>", tag: "WORK<br><b>- DIARY</b>" },
    { key: "webstory", img: "imgs/intro/intro_webstory.jpg", href: "story.html", angle: -11, menu: "WORK <b>- WEBSTORY</b>", tag: "WORK<br><b>- WEBSTORY</b>" },
  ];

  const INTRO_HOLD_MS = 1500; // intro screen before the title slides away
  const LIST_HOLD_MS = 3000; // straight list before it turns into the angle list

  // card centers per slot (artboard px), measured on refs/intro/intro_layered / intro_list / intro_anglelist.jpg
  const CARD_W = 232;
  const CARD_H = 162;
  const STACK = [
    { x: 1058, y: 336, s: 1.08 },
    { x: 1040, y: 346, s: 1.08 },
    { x: 1078, y: 370, s: 1.08 },
    { x: 1030, y: 402, s: 1.08 },
    { x: 1062, y: 424, s: 1.08 },
  ];
  const LIST = [90, 260, 428, 599, 771].map((y) => ({ x: 1041, y, s: 1 }));
  const ANGLE = [
    { x: 1050, y: 210, s: 1.05 },
    { x: 1030, y: 322, s: 1.05 },
    { x: 1050, y: 428, s: 1.05 },
    { x: 1035, y: 540, s: 1.05 },
    { x: 1035, y: 642, s: 1.05 },
  ];
  // label top-left per slot: beside the card bottom (list), beside the card (angle)
  const TAG_LIST = [
    { x: 1169, y: 146 }, { x: 1169, y: 302 }, { x: 1169, y: 466 }, { x: 1169, y: 636 }, { x: 1169, y: 805 },
  ];
  const TAG_ANGLE = [
    { x: 1183, y: 225 }, { x: 1183, y: 297 }, { x: 1183, y: 408 }, { x: 1183, y: 522 }, { x: 1183, y: 635 },
  ];

  const stage = document.getElementById("stage");
  const deck = document.getElementById("deck");
  const menu = document.getElementById("menu");
  const tagBox = document.getElementById("tags");

  const link = (cls, work, html, label) => {
    const a = document.createElement("a");
    a.className = cls;
    a.href = work.href;
    a.dataset.key = work.key;
    a.setAttribute("aria-label", label);
    a.innerHTML = html;
    return a;
  };

  const cards = WORKS.map((work, i) => {
    const label = work.menu.replace(/<[^>]+>/g, "");
    const card = link("card", work, `<img src="${work.img}" alt="" draggable="false">`, label);
    card.style.setProperty("--z", String(WORKS.length - i));
    deck.append(card);
    return card;
  });

  const menuLinks = WORKS.map((work, i) => {
    const li = document.createElement("li");
    li.style.setProperty("--i", String(i));
    const a = link("", work, `<span>${work.menu}</span>`, work.menu.replace(/<[^>]+>/g, ""));
    li.append(a);
    menu.append(li);
    return a;
  });

  const tags = WORKS.map((work, i) => {
    const tag = link("tag", work, work.tag, work.menu.replace(/<[^>]+>/g, ""));
    tag.tabIndex = -1; // the card link is the keyboard target in the expanded states
    place(tag, TAG_LIST[i]);
    tagBox.append(tag);
    return tag;
  });

  let state = "intro";
  let offstage = 0; // px from the stack to just past the viewport's right edge

  function place(el, p) {
    el.style.setProperty("--x", `${p.x}px`);
    el.style.setProperty("--y", `${p.y}px`);
  }

  function poseCard(i, p, rotate) {
    const card = cards[i];
    card.style.setProperty("--x", `${p.x - CARD_W / 2}px`);
    card.style.setProperty("--y", `${p.y - CARD_H / 2}px`);
    card.style.setProperty("--r", `${rotate ? WORKS[i].angle : 0}deg`);
    card.style.setProperty("--s", String(p.s));
  }

  function setState(next) {
    state = next;
    stage.dataset.state = next;
    cards.forEach((card, i) => {
      if (next === "intro") {
        poseCard(i, { ...STACK[i], x: STACK[i].x + offstage }, true);
      } else if (next === "layered") {
        // bottom card first so the pile builds up
        card.style.setProperty("--delay", `${0.25 + (WORKS.length - 1 - i) * 0.08}s`);
        poseCard(i, STACK[i], true);
      } else if (next === "list") {
        card.style.setProperty("--delay", `${i * 0.05}s`);
        poseCard(i, LIST[i], false);
      } else {
        card.style.setProperty("--delay", `${i * 0.05}s`);
        poseCard(i, ANGLE[i], true);
      }
    });
    tags.forEach((tag, i) => {
      if (next === "list") {
        tag.style.setProperty("--fade-delay", `${0.55 + i * 0.07}s`);
        tag.style.setProperty("--delay", `${0.55 + i * 0.07}s`);
      } else if (next === "angle") {
        tag.style.setProperty("--fade-delay", "0s");
        tag.style.setProperty("--delay", `${i * 0.05}s`);
        place(tag, TAG_ANGLE[i]);
      }
    });
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function expand() {
    if (state !== "layered" || !stage.classList.contains("is-live")) return;
    setState("list");
    // hold the straight list, then fan it out into the angle list
    setTimeout(() => {
      setState("angle");
      setTimeout(() => stage.classList.add("is-settled"), 1200);
    }, 1100 + LIST_HOLD_MS);
  }

  function setActive(index) {
    cards.forEach((card, i) => card.classList.toggle("is-active", i === index));
    tags.forEach((tag, i) => tag.classList.toggle("is-active", i === index));
  }

  const isExpanded = () => state === "list" || state === "angle";

  [cards, menuLinks, tags].forEach((group) => {
    group.forEach((el, i) => {
      el.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "touch") return; // touch: first tap expands (click handler)
        if (state === "layered") expand();
        else if (state === "angle") setActive(i);
      });
      el.addEventListener("pointerleave", () => {
        if (state === "angle") setActive(-1);
      });
      el.addEventListener("focus", () => {
        if (state === "layered") expand();
        else if (state === "angle") setActive(i);
      });
      el.addEventListener("blur", () => setActive(-1));
      el.addEventListener("click", (e) => {
        if (!isExpanded()) {
          e.preventDefault();
          expand();
        }
      });
    });
  });

  function fit() {
    const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 860);
    stage.style.setProperty("--scale", String(scale));
    const viewRight = 1280 + (window.innerWidth / scale - 1280) / 2;
    offstage = viewRight - (STACK[3].x - CARD_W * 0.7) + 40;
    if (state === "intro") setState("intro");
  }

  async function run() {
    const fonts = Promise.all([
      document.fonts.load('700 100px "GmarketSans"'),
      document.fonts.load('500 20px "GmarketSans"'),
    ]);
    await Promise.race([fonts, sleep(2500)]);
    stage.classList.add("is-ready");
    await sleep(INTRO_HOLD_MS);
    setState("layered"); // title slides left, cards slide in from the right
    await sleep(1300);
    stage.classList.add("menu-in");
    await sleep(WORKS.length * 90 + 1000);
    stage.classList.add("is-live");
    // the pointer may already be resting on the stack or the menu
    if ([...cards, ...menuLinks].some((el) => el.matches(":hover"))) expand();
  }

  document.getElementById("scroll-hint").addEventListener("click", () => window.SITE.next());
  window.addEventListener("resize", fit);
  fit();
  run();
})();
