/* ============================================================
   FINANCE CHARTS v2 — gráficos animados em canvas puro
   ------------------------------------------------------------
   Mesma API da v1 (lineChart, areaChart, barChart,
   horizontalBars, doughnutChart) — só que com:
   • curvas suaves (Catmull-Rom)
   • easing (easeOutQuart) em todas as animações
   • brilho/glow nas linhas e ponto pulsante no final
   • donut com pontas arredondadas e varredura animada
   • grid e eixos mais elegantes
   ============================================================ */

(function () {
  const colors = {
    green: "#62ff4d",
    greenSoft: "rgba(98, 255, 77, 0.2)",
    red: "#ff4750",
    redSoft: "rgba(255, 71, 80, 0.22)",
    gray: "#aeb5bb",
    grid: "rgba(255, 255, 255, 0.06)",
    text: "#dce1e6",
    amber: "#f2c14e"
  };

  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  function getContext(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(rect.width, 280);
    const height = Math.max(rect.height, 180);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.font = "11.5px Inter, Segoe UI, sans-serif";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    return { ctx, width, height };
  }

  function animate(canvas, draw, duration) {
    if (!canvas) {
      return;
    }

    const state = FinanceUtils.getState();
    const shouldAnimate = state.settings.animations !== false;
    const totalDuration = shouldAnimate ? duration || 1100 : 1;
    let start = null;

    function frame(timestamp) {
      if (!start) {
        start = timestamp;
      }

      const linear = Math.min((timestamp - start) / totalDuration, 1);
      draw(easeOutQuart(linear));

      if (linear < 1) {
        requestAnimationFrame(frame);
      }
    }

    requestAnimationFrame(frame);

    const redraw = () => draw(1);
    window.addEventListener("resize", redraw, { passive: true });
  }

  function formatAxis(value) {
    const absolute = Math.abs(value);
    if (absolute >= 1000) {
      return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
    }

    return FinanceUtils.formatCurrency(value).replace(",00", "");
  }

  function niceStep(range) {
    const rough = range / 4;
    const pow = Math.pow(10, Math.floor(Math.log10(rough || 1)));
    const candidates = [1, 2, 2.5, 5, 10];
    for (const c of candidates) {
      if (rough <= c * pow) return c * pow;
    }
    return 10 * pow;
  }

  function getRange(values, minHint) {
    const rawMax = Math.max(...values, 1);
    const rawMin = Math.min(...values, minHint === undefined ? 0 : minHint);
    const span = rawMax - rawMin || rawMax || 1;
    const step = niceStep(span * 1.15);
    const min = Math.floor(rawMin / step) * step;
    const max = Math.ceil((rawMax + span * 0.08) / step) * step;
    return { min, max: max === min ? min + step : max };
  }

  function drawGrid(ctx, plot, min, max, steps) {
    ctx.save();
    ctx.fillStyle = colors.gray;
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.9;

    for (let index = 0; index <= steps; index += 1) {
      const ratio = index / steps;
      const y = plot.y + plot.height - plot.height * ratio;
      const value = min + (max - min) * ratio;

      ctx.strokeStyle = index === 0 ? "rgba(255,255,255,0.14)" : colors.grid;
      ctx.setLineDash(index === 0 ? [] : [4, 6]);
      ctx.beginPath();
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.width, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(formatAxis(value), plot.x - 10, y);
    }

    ctx.restore();
  }

  /* Curva suave Catmull-Rom → segmentos Bézier */
  function tracePath(ctx, points) {
    if (points.length < 2) {
      return;
    }
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  function drawXLabels(ctx, plot, labels) {
    ctx.save();
    ctx.fillStyle = colors.gray;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.globalAlpha = 0.85;
    const skip = Math.max(1, Math.ceil(labels.length / 6));
    labels.forEach((label, index) => {
      if (index % skip !== 0 && index !== labels.length - 1) {
        return;
      }
      const x = plot.x + (plot.width * index) / (labels.length - 1 || 1);
      ctx.fillText(label, x, plot.y + plot.height + 14);
    });
    ctx.restore();
  }

  function lineChart(selector, config) {
    const canvas = document.querySelector(selector);
    animate(canvas, (progress) => {
      const { ctx, width, height } = getContext(canvas);
      const plot = { x: 70, y: 18, width: width - 88, height: height - 56 };
      const values = config.datasets.flatMap((dataset) => dataset.values);
      const range = getRange(values, config.min);

      drawGrid(ctx, plot, range.min, range.max, 4);
      drawXLabels(ctx, plot, config.labels);

      config.datasets.forEach((dataset) => {
        const count = dataset.values.length;
        const points = dataset.values.map((value, index) => {
          const x = plot.x + (plot.width * index) / (count - 1 || 1);
          const scaled = (value - range.min) / (range.max - range.min || 1);
          const y = plot.y + plot.height - plot.height * scaled;
          return { x, y };
        });

        /* revelação da esquerda para a direita */
        const revealX = plot.x + plot.width * progress;
        ctx.save();
        ctx.beginPath();
        ctx.rect(plot.x - 6, 0, revealX - plot.x + 6, height);
        ctx.clip();

        if (dataset.fill) {
          const gradient = ctx.createLinearGradient(0, plot.y, 0, plot.y + plot.height);
          gradient.addColorStop(0, dataset.fill);
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          tracePath(ctx, points);
          ctx.lineTo(points[points.length - 1].x, plot.y + plot.height);
          ctx.lineTo(points[0].x, plot.y + plot.height);
          ctx.closePath();
          ctx.fill();
        }

        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 2.6;
        ctx.shadowColor = dataset.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        tracePath(ctx, points);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();

        /* ponto de destaque no fim da linha revelada */
        const tipIndex = Math.min(count - 1, Math.floor(progress * (count - 1)));
        const tip = points[tipIndex];
        if (tip) {
          ctx.save();
          ctx.fillStyle = dataset.color;
          ctx.shadowColor = dataset.color;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });
    });
  }

  function areaChart(selector, config) {
    lineChart(selector, {
      ...config,
      datasets: config.datasets.map((dataset) => ({
        ...dataset,
        fill: dataset.fill || colors.greenSoft
      }))
    });
  }

  function barChart(selector, config) {
    const canvas = document.querySelector(selector);
    animate(canvas, (progress) => {
      const { ctx, width, height } = getContext(canvas);
      const plot = { x: 70, y: 18, width: width - 88, height: height - 56 };
      const values = config.datasets.flatMap((dataset) => dataset.values);
      const range = getRange(values);
      const groupWidth = plot.width / config.labels.length;
      const barWidth = Math.min(34, (groupWidth - 18) / config.datasets.length);

      drawGrid(ctx, plot, range.min, range.max, 4);

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = colors.gray;
      config.labels.forEach((label, index) => {
        const x = plot.x + groupWidth * index + groupWidth / 2;
        ctx.fillText(label, x, plot.y + plot.height + 14);
      });
      ctx.restore();

      config.labels.forEach((label, labelIndex) => {
        config.datasets.forEach((dataset, datasetIndex) => {
          const value = dataset.values[labelIndex];
          const scaled = value / (range.max || 1);
          /* stagger: cada grupo sobe um pouquinho depois do anterior */
          const local = Math.max(0, Math.min(1, progress * 1.6 - (labelIndex / config.labels.length) * 0.6));
          const heightValue = plot.height * scaled * local;
          const x =
            plot.x +
            groupWidth * labelIndex +
            groupWidth / 2 -
            (barWidth * config.datasets.length) / 2 +
            datasetIndex * barWidth;
          const y = plot.y + plot.height - heightValue;

          const grad = ctx.createLinearGradient(0, y, 0, plot.y + plot.height);
          grad.addColorStop(0, dataset.color);
          grad.addColorStop(1, dataset.colorSoft || dataset.color + "55");
          ctx.fillStyle = grad;
          roundRect(ctx, x, y, barWidth - 4, heightValue, 5);
          ctx.fill();
        });
      });
    });
  }

  function horizontalBars(selector, config) {
    const canvas = document.querySelector(selector);
    animate(canvas, (progress) => {
      const { ctx, width, height } = getContext(canvas);
      const plot = { x: 118, y: 22, width: width - 156, height: height - 42 };
      const max = Math.max(...config.values, 1);
      const rowHeight = plot.height / config.labels.length;

      ctx.save();
      config.labels.forEach((label, index) => {
        const y = plot.y + rowHeight * index + rowHeight / 2;
        const barHeight = Math.min(16, rowHeight * 0.46);
        const local = Math.max(0, Math.min(1, progress * 1.5 - (index / config.labels.length) * 0.5));
        const widthValue = (config.values[index] / max) * plot.width * local;

        ctx.fillStyle = colors.gray;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(label, plot.x - 12, y);

        ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
        roundRect(ctx, plot.x, y - barHeight / 2, plot.width, barHeight, 999);
        ctx.fill();

        const grad = ctx.createLinearGradient(plot.x, 0, plot.x + plot.width, 0);
        const cor = config.color || colors.red;
        grad.addColorStop(0, cor + "99");
        grad.addColorStop(1, cor);
        ctx.fillStyle = grad;
        roundRect(ctx, plot.x, y - barHeight / 2, widthValue, barHeight, 999);
        ctx.fill();

        ctx.fillStyle = colors.text;
        ctx.textAlign = "left";
        ctx.fillText(FinanceUtils.formatCurrency(config.values[index]), plot.x + widthValue + 8, y);
      });
      ctx.restore();
    });
  }

  function doughnutChart(selector, config) {
    const canvas = document.querySelector(selector);
    animate(canvas, (progress) => {
      const { ctx, width, height } = getContext(canvas);
      const size = Math.min(width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = size * 0.34;
      const lineWidth = Math.max(18, size * 0.09);
      const total = config.values.reduce((sum, value) => sum + value, 0) || 1;
      const gap = 0.05; /* respiro entre fatias, em radianos */
      let start = -Math.PI / 2;

      ctx.save();
      ctx.lineCap = "round";

      /* trilho de fundo */
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      config.values.forEach((value, index) => {
        const slice = (value / total) * Math.PI * 2;
        const angle = Math.max(0, slice * progress - gap);
        if (angle > 0.01) {
          ctx.strokeStyle = config.colors[index];
          ctx.shadowColor = config.colors[index];
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, start + gap / 2, start + gap / 2 + angle);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        start += slice;
      });

      ctx.fillStyle = colors.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "800 19px Inter, Segoe UI, sans-serif";
      ctx.globalAlpha = Math.min(1, progress * 1.6);
      ctx.fillText(config.center || "", centerX, centerY - 4);
      ctx.font = "11.5px Inter, Segoe UI, sans-serif";
      ctx.fillStyle = colors.gray;
      if (config.caption) {
        ctx.fillText(config.caption, centerX, centerY + 16);
      }
      ctx.restore();
    });
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(x + width - safeRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    ctx.lineTo(x + width, y + height - safeRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    ctx.lineTo(x + safeRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  }

  window.FinanceCharts = {
    colors,
    lineChart,
    areaChart,
    barChart,
    horizontalBars,
    doughnutChart
  };
})();
