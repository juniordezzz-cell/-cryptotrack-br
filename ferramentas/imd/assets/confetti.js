/* ============================================================
   IMD — confetti.js
   Confete leve em canvas. Uso: IMDConfetti.disparar();
   Respeita prefers-reduced-motion.
   ============================================================ */
(function (global) {
  "use strict";

  function reduzMovimento() {
    return global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  var CORES = ["#9945ff", "#14f195", "#22D3EE", "#F5A623", "#ffffff"];

  function disparar(opts) {
    opts = opts || {};
    if (reduzMovimento()) return;

    var canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");

    function resize() {
      canvas.width = global.innerWidth;
      canvas.height = global.innerHeight;
    }
    resize();
    global.addEventListener("resize", resize);

    var qtd = opts.quantidade || 160;
    var pecas = [];
    for (var i = 0; i < qtd; i++) {
      pecas.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 120,
        y: canvas.height / 2 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 14,
        vy: Math.random() * -16 - 4,
        g: 0.32 + Math.random() * 0.2,
        s: 5 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        cor: CORES[(Math.random() * CORES.length) | 0],
        forma: Math.random() > 0.5 ? "rect" : "circ"
      });
    }

    var inicio = performance.now();
    var DUR = opts.duracao || 2600;

    function frame(t) {
      var dt = t - inicio;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var vivas = 0;
      pecas.forEach(function (p) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rot += p.vr;
        if (p.y < canvas.height + 40) vivas++;
        var alpha = Math.max(0, 1 - dt / DUR);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.cor;
        if (p.forma === "rect") {
          ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (dt < DUR && vivas > 0) {
        requestAnimationFrame(frame);
      } else {
        global.removeEventListener("resize", resize);
        canvas.remove();
      }
    }
    requestAnimationFrame(frame);
  }

  global.IMDConfetti = { disparar: disparar };
})(window);
