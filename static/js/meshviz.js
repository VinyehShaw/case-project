(function () {
  "use strict";

  var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-vtk]"));
  if (!nodes.length || !("IntersectionObserver" in window)) return;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hideAll() {
    nodes.forEach(function (n) { n.style.display = "none"; });
  }

  function parseVtkPoints(text) {
    var lines = text.split("\n");
    var i = -1;
    for (var k = 0; k < lines.length; k++) {
      if (lines[k].indexOf("POINTS") === 0) { i = k; break; }
    }
    if (i < 0) return null;
    var n = parseInt(lines[i].split(/\s+/)[1], 10);
    if (!n) return null;
    var tokens = lines.slice(i + 1).join(" ").trim().split(/\s+/);
    var max = Math.min(tokens.length, n * 3);
    var pos = [];
    for (var t = 0; t < max; t++) {
      var v = parseFloat(tokens[t]);
      if (isNaN(v)) break;
      pos.push(v);
    }
    if (pos.length < 300) return null;
    var out = new Float32Array(pos.length - (pos.length % 3));
    out.set(pos.slice(0, out.length));
    return out;
  }

  function buildNode(node, THREE) {
    var canvas = node.querySelector("canvas");
    if (!canvas) return null;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100000);

    var cloud = null;
    fetch(node.dataset.vtk).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.text();
    }).then(function (text) {
      var pos = parseVtkPoints(text);
      if (!pos) { node.style.display = "none"; return; }
      var geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geometry.computeBoundingSphere();
      var c = geometry.boundingSphere.center;
      var r = geometry.boundingSphere.radius;
      geometry.translate(-c.x, -c.y, -c.z);
      cloud = new THREE.Points(geometry, new THREE.PointsMaterial({
        color: 0xc4705f, size: r * 0.02, sizeAttenuation: true, transparent: true, opacity: 0.92
      }));
      cloud.rotation.x = 0.42;
      scene.add(cloud);
      camera.position.set(0, 0, r * 2.7);
      camera.lookAt(0, 0, 0);
      resize();
      if (reduceMotion) renderer.render(scene, camera);
    }).catch(function () { node.style.display = "none"; });

    function resize() {
      var w = node.clientWidth || 148;
      var h = Math.round(canvas.clientHeight || 108);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);

    return {
      node: node,
      visible: false,
      render: function (dt) {
        if (!cloud) return;
        cloud.rotation.y += dt * 0.45;
        renderer.render(scene, camera);
      }
    };
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      io.disconnect();
      init();
    });
  }, { rootMargin: "240px 0px" });
  io.observe(nodes[0]);

  function init() {
    import("three").then(function (THREE) {
      var scenes = nodes.map(function (n) { return buildNode(n, THREE); }).filter(Boolean);
      if (!scenes.length) { hideAll(); return; }
      if (reduceMotion) return;

      scenes.forEach(function (sc) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { sc.visible = e.isIntersecting; });
        }).observe(sc.node);
      });

      var last = performance.now();
      function loop(now) {
        var dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!document.hidden) {
          scenes.forEach(function (sc) { if (sc.visible) sc.render(dt); });
        }
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    }).catch(hideAll);
  }
})();
