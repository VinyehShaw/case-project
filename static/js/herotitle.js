(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.requestAnimationFrame) return;

  var h1 = document.querySelector(".hero__title");
  if (!h1) return;

  var SCATTER = [[-16, -7, -9], [12, -11, 7], [-9, 8, -5], [14, 6, 10], [-12, -4, 6], [8, -12, -8], [-6, 10, -7], [11, -8, 8]];

  var parts = [];
  Array.prototype.forEach.call(h1.childNodes, function (nd) {
    if (nd.nodeType === 3) parts.push({ text: nd.nodeValue });
    else if (nd.nodeType === 1 && nd.tagName === "BR") parts.push({ br: true });
  });

  h1.textContent = "";
  var wi = 0;
  parts.forEach(function (part) {
    if (part.br) {
      h1.appendChild(document.createElement("br"));
      return;
    }
    part.text.split(/\s+/).filter(Boolean).forEach(function (word) {
      var w = document.createElement("span");
      w.className = "hw";
      w.style.setProperty("--i", wi++);
      if (word === "Given") w.classList.add("hw--given");
      if (word === "Gathered") {
        w.classList.add("hw--gathered");
        word.split("").forEach(function (ch, ci) {
          var c = document.createElement("span");
          c.className = "hc";
          c.textContent = ch;
          var sc = SCATTER[ci % SCATTER.length];
          c.style.setProperty("--dx", sc[0] + "px");
          c.style.setProperty("--dy", sc[1] + "px");
          c.style.setProperty("--rot", sc[2] + "deg");
          c.style.setProperty("--ci", ci);
          w.appendChild(c);
        });
      } else {
        w.textContent = word;
      }
      h1.appendChild(w);
      h1.appendChild(document.createTextNode(" "));
    });
  });

  h1.style.setProperty("--sweep-delay", (150 + wi * 60 + 8 * 35 + 500) + "ms");
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { h1.classList.add("play"); });
  });
})();
