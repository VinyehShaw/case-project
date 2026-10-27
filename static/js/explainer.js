(function () {
  "use strict";

  if (!document.documentElement.classList.contains("js")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window) || !window.requestAnimationFrame) return;

  var root = document.querySelector("[data-xp-root]");
  if (!root) return;

  var q = function (sel) { return root.querySelector(sel); };
  var qa = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };

  var thinks = qa("[data-xp-think]");
  var edges = qa("[data-xp-edge]");
  var tools = qa("[data-xp-tool]");
  var slices = qa(".xp__slice.is-sel");
  var opts = qa("[data-xp-opt]");
  var phasePills = qa("[data-xp-phase]");
  var cotCards = qa("[data-xp-cot]");
  var callNodes = qa(".xp__node");
  var answer = q('[data-xp="answer"]');
  var replayBtn = q('[data-xp="replay"]');
  var liveEl = q('[data-xp="live"]');
  var progEl = q('[data-xp="prog"]');
  var nowEl = q('[data-xp="now"]');
  var statusEl = root.querySelector('.xp__status');
  var pauseBtn = q('[data-xp="pause"]');
  if (!thinks.length || !tools.length || !cotCards.length || !callNodes.length || !answer || !replayBtn || !liveEl || !progEl || !pauseBtn) return;
  root.classList.add("xp--animate");

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function segsOf(el) {
    var out = [];
    Array.prototype.forEach.call(el.childNodes, function (nd) {
      if (nd.nodeType === 3) out.push({ t: nd.nodeValue, hi: false });
      else if (nd.nodeType === 1) out.push({ t: nd.textContent, hi: nd.tagName === "EM" });
    });
    return out;
  }
  function segTotal(segs) {
    return segs.reduce(function (a, s) { return a + s.t.length; }, 0);
  }

  var LEDGER_AT = { 1: "skills", 2: "views", 3: "views", 4: "views", 5: "views", 6: "vol", 7: "reports", 8: "reports" };
  var OPT_CLASS = { A: "v-ok", B: "v-ok", C: "v-no", D: "v-no", E: "v-no" };
  var PAIR_THINK = [950, 800, 1150, 1500, 900, 1050, 850, 1000];
  var NOW_CALL = ["call 1/8 · recall_skills", "call 2/8 · list_available_images", "call 3/8 · compare_visits IDEAL", "call 4/8 · view_image slices 10 & 22", "call 5/8 · compare_visits slice 22", "call 6/8 · vista3d_compare_visits", "call 7/8 · get_report liver", "call 8/8 · get_report whole-body"];
  var NOW_PHASE = { P1: "P1 · Plan", P2: "P2 · Review", P3: "P3 · Verify", P4: "P4 · Insight", P5: "P5 · Answer" };

  function setNow(text) {
    if (nowEl) nowEl.textContent = text;
  }
  var PHASE_THINK = { P1: 1100, P2: 900, P3: 1000, P4: 1300 };

  var pillOf = {};
  phasePills.forEach(function (el) { pillOf[el.dataset.xpPhase] = el; });
  var cotOf = {};
  cotCards.forEach(function (el) { cotOf[el.dataset.xpCot] = el; });
  var thinkTextOf = thinks.map(function (el) { return el.querySelector(".xp__think-text"); });

  var ITEMS = [
    { kind: "phase", key: "P1" },
    { kind: "pair", i: 0 },
    { kind: "pair", i: 1 },
    { kind: "phase", key: "P2" },
    { kind: "pair", i: 2 }, { kind: "pair", i: 3 }, { kind: "pair", i: 4 },
    { kind: "pair", i: 5 }, { kind: "pair", i: 6 }, { kind: "pair", i: 7 },
    { kind: "phase", key: "P3" },
    { kind: "phase", key: "P4" }
  ];

  var steps = [];
  var typers = [];
  var cur = 250;

  function addTyper(textEl, segs, speed, start) {
    var total = segTotal(segs);
    var dur = Math.max(320, total * speed);
    typers.push({ el: textEl, segs: segs, total: total, start: start, end: start + dur, last: -1, caret: null });
    return dur;
  }

  var itemStart = {};

  ITEMS.forEach(function (item) {
    if (item.kind === "phase") {
      itemStart[item.key] = cur;
      var card = cotOf[item.key];
      var pill = pillOf[item.key];
      var thinkMs = PHASE_THINK[item.key];
      var typedEl = card.querySelector(".xp__typed");
      steps.push({
        t: cur,
        fn: function () {
          card.classList.add("is-on");
          if (pill) pill.classList.add("is-live");
          setNow(NOW_PHASE[item.key]);
        }
      });
      var typeDur = addTyper(typedEl, segsOf(typedEl), 7, cur + thinkMs);
      steps.push({ t: cur + thinkMs + typeDur, fn: function () { card.classList.add("is-thought"); if (pill) { pill.classList.remove("is-live"); pill.classList.add("is-on"); } } });
      if (item.key === "P3") {
        opts.forEach(function (el, k) {
          steps.push({
            t: cur + thinkMs + typeDur + 350 + k * 140,
            fn: function () { el.classList.add(OPT_CLASS[el.dataset.xpOpt]); }
          });
        });
      }
      cur = cur + thinkMs + typeDur + 260;
    } else {
      var i = item.i;
      itemStart[String(i + 1)] = cur;
      var thinkMs2 = PAIR_THINK[i];
      var thinkEl = thinks[i];
      var typedEl2 = thinkTextOf[i];
      steps.push({
        t: cur,
        fn: function () {
          thinks.forEach(function (th) { th.classList.remove("is-active"); });
          thinkEl.classList.add("is-on", "is-active");
          setNow(NOW_CALL[i]);
        }
      });
      var typeDur2 = addTyper(typedEl2, segsOf(typedEl2), 12, cur + thinkMs2);
      var afterType = cur + thinkMs2 + typeDur2;
      steps.push({ t: afterType, fn: function () { thinkEl.classList.add("is-thought"); } });
      steps.push({ t: afterType + 120, fn: function () { edges[i].classList.add("is-line"); } });
      steps.push({ t: afterType + 340, fn: function () { edges[i].classList.add("is-firing"); } });
      steps.push({ t: afterType + 820, fn: function () { edges[i].classList.remove("is-firing"); } });
      steps.push({ t: afterType + 520, fn: function () { tools[i].classList.add("is-on"); callNodes[i].classList.add("is-live"); } });
      steps.push({ t: afterType + 920, fn: function () { tools[i].classList.add("is-done"); callNodes[i].classList.remove("is-live"); callNodes[i].classList.add("is-done"); } });
      steps.push({ t: afterType + 970, fn: function () { bumpLedger(LEDGER_AT[i + 1]); } });
      if (i === 3 && slices.length === 2) {
        steps.push({ t: afterType + 500, fn: function () { slices[0].classList.add("is-sel"); } });
        steps.push({ t: afterType + 650, fn: function () { slices[1].classList.add("is-sel"); } });
      }
      cur = afterType + 900;
    }
  });
  itemStart.P5 = cur;
  steps.push({ t: cur, fn: function () { if (pillOf.P5) pillOf.P5.classList.add("is-on"); setNow(NOW_PHASE.P5); } });
  steps.push({ t: cur + 250, fn: function () { answer.classList.add("is-on"); } });
  steps.push({ t: cur + 900, fn: function () { replayBtn.hidden = false; } });
  var END = cur + 1200;
  steps.sort(function (a, b) { return a.t - b.t; });

  function bumpLedger(key) {
    var el = q('[data-xp-ev="' + key + '"]');
    if (!el) return;
    el.textContent = String(parseInt(el.textContent, 10) + 1);
    el.classList.remove("is-bump");
    void el.offsetWidth;
    el.classList.add("is-bump");
  }

  var seeking = false;

  function typeFrame(ty, t) {
    if (t < ty.start) return;
    var n = t >= ty.end ? ty.total : Math.floor(((t - ty.start) / (ty.end - ty.start)) * ty.total);
    if (ty.last === n) return;
    ty.last = n;
    var out = "", rem = n;
    for (var s = 0; s < ty.segs.length && rem > 0; s++) {
      var seg = ty.segs[s];
      var take = Math.min(rem, seg.t.length);
      out += seg.hi ? "<em>" + esc(seg.t.slice(0, take)) + "</em>" : esc(seg.t.slice(0, take));
      rem -= take;
    }
    ty.el.innerHTML = out;
    if (ty.caret) {
      ty.caret.remove();
      ty.caret = null;
    }
    if (n > 0 && n < ty.total) {
      ty.caret = document.createElement("span");
      ty.caret.className = "rv__caret";
      ty.el.appendChild(ty.caret);
    }
  }

  function reset() {
    thinks.forEach(function (el) { el.classList.remove("is-on", "is-active", "is-thought"); });
    edges.forEach(function (el) { el.classList.remove("is-firing", "is-line"); });
    tools.forEach(function (el) { el.classList.remove("is-on", "is-done"); });
    slices.forEach(function (el) { el.classList.remove("is-sel"); });
    opts.forEach(function (el) { el.classList.remove("v-ok", "v-no"); });
    phasePills.forEach(function (el) { el.classList.remove("is-on", "is-live"); });
    if (nowEl) nowEl.textContent = "ready";
    if (statusEl) statusEl.classList.remove("is-live");
    paused = false;
    root.classList.remove("is-paused");
    pauseBtn.textContent = "pause";
    cotCards.forEach(function (el) { el.classList.remove("is-on", "is-thought"); });
    callNodes.forEach(function (el) { el.classList.remove("is-live", "is-done"); });
    answer.classList.remove("is-on");
    liveEl.classList.remove("is-live");
    progEl.style.width = "0%";
    replayBtn.hidden = true;
    ["skills", "views", "vol", "reports"].forEach(function (k) {
      var el = q('[data-xp-ev="' + k + '"]');
      if (el) el.textContent = "0";
    });
    typers.forEach(function (ty) {
      ty.el.innerHTML = "";
      ty.last = -1;
      if (ty.caret) { ty.caret.remove(); ty.caret = null; }
    });
  }

  var runId = 0;
  var paused = false;

  pauseBtn.addEventListener("click", function () {
    paused = !paused;
    pauseBtn.textContent = paused ? "resume" : "pause";
    root.classList.toggle("is-paused", paused);
  });

  function targetOf(key) {
    return /^P/.test(key) ? (key === "P5" ? answer : cotOf[key]) : tools[parseInt(key, 10) - 1];
  }

  function flash(target) {
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.remove("is-flash");
    void target.offsetWidth;
    target.classList.add("is-flash");
    window.setTimeout(function () { target.classList.remove("is-flash"); }, 1300);
  }

  qa("[data-xp-node]").forEach(function (btn) {
    btn.addEventListener("click", function () { seek(btn.dataset.xpNode); });
  });

  function seek(key) {
    var from = itemStart[key];
    if (from == null) return;
    play(from, true);
    flash(targetOf(key));
  }

  function play(from, fastForward) {
    var myRun = ++runId;
    reset();
    if (fastForward) {
      seeking = true;
      steps.forEach(function (s) { if (s.t < from) s.fn(); });
      seeking = false;
      thinks.forEach(function (th) { th.classList.remove("is-active"); });
      typers.forEach(function (ty) {
        if (ty.end <= from) typeFrame(ty, ty.end);
        else { ty.el.innerHTML = ""; ty.last = -1; }
      });
    }
    liveEl.classList.add("is-live");
    if (statusEl) statusEl.classList.add("is-live");
    pauseBtn.hidden = false;
    var t0 = performance.now() - (from || 0);
    var hiddenAt = 0, hiddenTotal = 0;
    var si = 0;
    while (si < steps.length && steps[si].t < from) si++;

    function frame(now) {
      if (myRun !== runId) return;
      if (document.hidden || paused) {
        if (!hiddenAt) hiddenAt = now;
        requestAnimationFrame(frame);
        return;
      }
      if (hiddenAt) {
        hiddenTotal += now - hiddenAt;
        hiddenAt = 0;
      }
      var t = now - t0 - hiddenTotal;
      while (si < steps.length && steps[si].t <= t) steps[si++].fn();
      typers.forEach(function (ty) { typeFrame(ty, t); });
      progEl.style.width = Math.min(100, (t / END) * 100).toFixed(2) + "%";
      if (t < END) requestAnimationFrame(frame);
      else {
        liveEl.classList.remove("is-live");
        if (statusEl) statusEl.classList.remove("is-live");
        pauseBtn.hidden = true;
        paused = false;
        root.classList.remove("is-paused");
        pauseBtn.textContent = "pause";
        setNow("complete ✓");
      }
    }
    requestAnimationFrame(frame);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      io.unobserve(root);
      window.setTimeout(function () {
        var r = root.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.85 && r.bottom > 0) play(0, false);
        else io.observe(root);
      }, 900);
    });
  }, { threshold: 0, rootMargin: "0px 0px -18% 0px" });
  io.observe(root);

  replayBtn.addEventListener("click", function () { play(0, false); });
  root.addEventListener("xp:play", function () { play(0, false); });
})();
