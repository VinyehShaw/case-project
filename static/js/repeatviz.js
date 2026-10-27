(function () {
  "use strict";

  if (!document.documentElement.classList.contains("js")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window) || !window.requestAnimationFrame) return;

  var root = document.querySelector("[data-rv-root]");
  if (!root) return;

  var q = function (name) { return root.querySelector('[data-rv="' + name + '"]'); };
  var prefixEl = q("prefix");
  var badEls = [q("bad0"), q("bad3")];
  var timesEl = q("times");
  var pctEl = q("pct");
  var goodEl = q("good0");
  var meterEl = q("meter");
  var opsDTag = q("opsd");
  var badBadge = q("badbadge");
  var goodBadge = q("goodbadge");
  var replayBtn = q("replay");
  var psFills = Array.prototype.slice.call(root.querySelectorAll(".rv__fill--ps"));
  var ptFills = Array.prototype.slice.call(root.querySelectorAll(".rv__fill--pt"));
  if (!prefixEl || !goodEl || !meterEl || !opsDTag || !badBadge || !goodBadge || !replayBtn || !timesEl || !pctEl || badEls.some(function (el) { return !el; }) || !psFills.length || !ptFills.length) return;
  root.classList.add("rv--animate");

  var SCRIPT = {
    prefix: prefixEl.textContent,
    bad: badEls.map(function (el) { return el.textContent; }),
    good: goodEl.textContent
  };
  var FINAL_W = new WeakMap();
  psFills.concat(ptFills).forEach(function (el) { FINAL_W.set(el, el.style.width); });

  var TYPE_WINDOWS = {
    prefix: [300, 2400],
    bad0: [4700, 5800],
    bad3: [7450, 7800],
    good: [5200, 7600]
  };
  var METER_FROM = 4900, METER_TO = 8000;
  var END = 9100;

  function finalWidth(el) {
    return FINAL_W.get(el) || "0%";
  }

  function reset() {
    root.classList.add("rv--init");
    prefixEl.textContent = "";
    badEls.forEach(function (el) { el.textContent = ""; });
    goodEl.textContent = "";
    psFills.concat(ptFills).forEach(function (el) { el.style.width = "0%"; });
    meterEl.style.width = "100%";
    meterEl.classList.remove("is-low");
    pctEl.textContent = "100%";
    timesEl.classList.remove("is-on");
    timesEl.textContent = "×1";
    opsDTag.classList.remove("is-on");
    badBadge.classList.remove("is-on");
    goodBadge.classList.remove("is-on");
    replayBtn.hidden = true;
    void root.offsetWidth;
    root.classList.remove("rv--init");
  }

  var BAD_KEYS = ["bad0", "bad3"];

  function typeInto(el, text, window, t) {
    if (t <= window[0]) { if (el.textContent) el.textContent = ""; return; }
    var span = window[1] - window[0];
    var done = t >= window[1] ? 1 : (t - window[0]) / span;
    var n = Math.round(done * text.length);
    var cur = el.textContent.length;
    if (n !== cur) el.textContent = text.slice(0, n);
  }

  var steps = [];
  psFills.forEach(function (el, i) {
    steps.push({ t: 2600 + i * 110, fn: function () { el.style.width = finalWidth(el); } });
  });
  steps.push({ t: 3750, fn: function () { opsDTag.classList.add("is-on"); } });
  ptFills.forEach(function (el, i) {
    steps.push({ t: 3800 + i * 110, fn: function () { el.style.width = finalWidth(el); } });
  });
  function bumpTimes(txt) {
    timesEl.textContent = txt;
    timesEl.classList.remove("is-bump");
    void timesEl.offsetWidth;
    timesEl.classList.add("is-bump");
  }
  steps.push({ t: 5850, fn: function () { timesEl.classList.add("is-on"); } });
  steps.push({ t: 6400, fn: function () { bumpTimes("×2"); } });
  steps.push({ t: 6950, fn: function () { bumpTimes("×3"); } });
  steps.push({ t: 7950, fn: function () { goodBadge.classList.add("is-on"); } });
  steps.push({ t: 8450, fn: function () { badBadge.classList.add("is-on"); } });
  steps.push({ t: 8850, fn: function () { replayBtn.hidden = false; } });
  steps.sort(function (a, b) { return a.t - b.t; });

  var playing = false;

  function play() {
    if (playing) return;
    playing = true;
    reset();
    var t0 = performance.now();
    var hiddenAt = 0, hiddenTotal = 0;
    var si = 0;

    function frame(now) {
      if (document.hidden) {
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

      typeInto(prefixEl, SCRIPT.prefix, TYPE_WINDOWS.prefix, t);
      badEls.forEach(function (el, i) {
        typeInto(el, SCRIPT.bad[i], TYPE_WINDOWS[BAD_KEYS[i]], t);
      });
      typeInto(goodEl, SCRIPT.good, TYPE_WINDOWS.good, t);

      var meterPct = 100;
      if (t >= METER_TO) meterPct = 0;
      else if (t > METER_FROM) meterPct = 100 * (1 - (t - METER_FROM) / (METER_TO - METER_FROM));
      meterEl.style.width = meterPct.toFixed(2) + "%";
      pctEl.textContent = Math.round(meterPct) + "%";
      meterEl.classList.toggle("is-low", t > METER_FROM && meterPct < 30);

      if (t < END) {
        requestAnimationFrame(frame);
      } else {
        playing = false;
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
        if (r.top < window.innerHeight * 0.85 && r.bottom > 0) play();
        else io.observe(root);
      }, 900);
    });
  }, { threshold: 0, rootMargin: "0px 0px -18% 0px" });
  io.observe(root);

  replayBtn.addEventListener("click", play);
})();
