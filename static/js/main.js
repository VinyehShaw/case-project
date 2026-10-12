(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;

  /* ---- Scroll reveal (also drives bar chart) ---- */
  document.querySelectorAll(".bars .bar").forEach(function (bar, i) {
    bar.style.setProperty("--i", i);
  });

  var revealEls = document.querySelectorAll(".reveal");
  if (!hasIO) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        // Also reveal elements that were scrolled past between frames (fast scroll / anchor jumps).
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
        entry.target.classList.add("is-visible");
        entry.target.querySelectorAll(".count").forEach(countUp);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });

    // IntersectionObserver never fires for an element jumped over in a single frame
    // (fast scroll, anchor links), so sweep anything already above the fold.
    var pending = false;
    var sweep = function () {
      pending = false;
      var vh = window.innerHeight;
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < vh) {
          el.classList.add("is-visible");
          el.querySelectorAll(".count").forEach(countUp);
          io.unobserve(el);
        }
      });
    };
    window.addEventListener("scroll", function () {
      if (!pending) { pending = true; requestAnimationFrame(sweep); }
    }, { passive: true });
  }

  /* ---- Stat count-up (final value is already in the HTML) ---- */
  function countUp(el) {
    if (reduceMotion || el.dataset.done) return;
    el.dataset.done = "1";
    var target = parseFloat(el.dataset.target);
    var decimals = parseInt(el.dataset.decimals || "0", 10);
    var fmt = function (v) {
      return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };
    var final = fmt(target);
    el.style.minWidth = el.offsetWidth + "px";
    el.style.display = "inline-block";
    var start = null, dur = 1100;
    function tick(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? fmt(target * eased) : final;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---- Nav: border on scroll + active section ---- */
  var nav = document.getElementById("top-nav");
  var onScroll = function () { nav.classList.toggle("is-scrolled", window.scrollY > 8); };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (hasIO) {
    var links = {};
    document.querySelectorAll(".nav__links a").forEach(function (a) {
      links[a.getAttribute("href").slice(1)] = a;
    });
    var sectionFor = function (id) {
      var el = document.getElementById(id);
      return el && el.id === "agent-demo" ? el.closest("section") : el;
    };
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.dataset.navId;
        Object.keys(links).forEach(function (k) {
          links[k].classList.toggle("is-active", k === id);
          if (k === id) links[k].setAttribute("aria-current", "true");
          else links[k].removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(links).forEach(function (id) {
      var s = sectionFor(id);
      if (s) { s.dataset.navId = id; navIO.observe(s); }
    });
  }

  /* ---- KaTeX ---- */
  function renderMath() {
    if (!window.katex) return;
    var eq = document.getElementById("reward-eq");
    if (eq) {
      try {
        window.katex.render(eq.dataset.tex, eq, { displayMode: true, throwOnError: false });
      } catch (e) { /* keep plain-text fallback */ }
    }
    document.querySelectorAll(".terms dt[data-tex]").forEach(function (dt) {
      try { window.katex.render(dt.dataset.tex, dt, { throwOnError: false }); } catch (e) { /* fallback */ }
    });
  }
  if (window.katex) renderMath();
  else window.addEventListener("load", renderMath);

  /* ---- BibTeX copy ---- */
  var status = document.getElementById("copy-status");
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var src = document.querySelector(btn.dataset.copy);
      if (!src) return;
      var text = src.textContent;
      var label = btn.querySelector(".bib__label");
      var done = function () {
        btn.classList.add("is-done");
        label.textContent = "Copied";
        if (status) status.textContent = "BibTeX copied to clipboard";
        setTimeout(function () {
          btn.classList.remove("is-done");
          label.textContent = "Copy";
          if (status) status.textContent = "";
        }, 1800);
      };
      var fallback = function () {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { /* no-op */ }
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });
  });
})();
