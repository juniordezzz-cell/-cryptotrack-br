(function () {
  const colors = {
    green: "#62ff4d",
    greenSoft: "rgba(98, 255, 77, 0.2)",
    red: "#ff4750",
    redSoft: "rgba(255, 71, 80, 0.22)",
    gray: "#aeb5bb",
    grid: "rgba(255, 255, 255, 0.08)",
    text: "#dce1e6",
    amber: "#f2c14e"
  };

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
    ctx.font = "12px Inter, Segoe UI, sans-serif";
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
    const totalDuration = shouldAnimate ? duration || 850 : 1;
    let start = null;

    function frame(timestamp) {
      if (!start) {
        start = timestamp;
      }

      const progress = Math.min((timestamp - start) / totalDuration, 1);
      draw(progress);

      if (progress < 1) {
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

  function drawGrid(ctx, plot, min, max, steps) {
    ctx.save();
    ctx.strokeStyle = colors.grid;
    ctx.fillStyle = colors.gray;
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let index = 0; index <= steps; index += 1) {
      const ratio = index / steps;
      const y = plot.y + plot.height - plot.height * ratio;
      const value = min + (max - min) * ratio;

      ctx.beginPath();
      ctx.moveTo(plot.x, y);
      ctx.lineTo(plot.x + plot.width, y);
      ctx.stroke();
      ctx.fillText(formatAxis(value), plot.x - 10, y);
    }

    ctx.restore();
  }

  function getRange(values, minHint) {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, minHint === undefined ? 0 : minHint);
    const padding = (max - min || max || 1) * 0.12;
    return {
      min: Math.floor((min - padding) / 100) * 100,
      max: Math.ceil((max + padding) / 100) * 100
    };
  }

  function lineChart(selector, config) {
    const canvas = document.querySelector(selector);
    animate(canvas, (progress) => {
      const { ctx, width, height } = getContext(canvas);
      const plot = { x: 72, y: 24, width: width - 92, height: height - 64 };
      const values = config.datasets.flatMap((dataset) => dataset.values);
      const range = getRange(values, config.min);

      drawGrid(ctx, plot, range.min, range.max, 4);

      ctx.save();
      ctx.fillStyle = colors.gray;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const skip = Math.max(1, Math.ceil(config.labels.length / 6));
      config.labels.forEach((label, index) => {
        if (index % skip !== 0 && index !== config.labels.length - 1) {
          return;
        }
        const x = plot.x + (plot.width * index) / (config.labels.length - 1);
        ctx.fillText(label, x, plot.y + plot.height + 18);
      });
      ctx.restore();

      config.datasets.forEach((dataset) => {
        const points = dataset.values.map((value, index) => {
          const x = plot.x + (plot.width * index) / (dataset.values.length - 1);
          const scaled = (value - range.min) / (range.max - range.min || 1);
          const y = plot.y + plot.height - plot.height * scaled * progress;
          return { x, y };
        });

        if (dataset.fill) {
          const gradient = ctx.createLinearGradient(0, plot.y, 0, plot.y + plot.height);
          gradient.addColorStop(0, dataset.fill);
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(points[0].x, plot.y + plot.height);
          points.forEach((point) => ctx.lineTo(point.x, point.y));
          ctx.lineTo(points[points.length - 1].x, plot.y + plot.height);
          ctx.closePath();
          ctx.fill();
        }

        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();

        ctx.fillStyle = dataset.color;
        points.forEach((point) => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
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
      const plot = { x: 72, y: 24, width: width - 92, height: height - 64 };
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
        ctx.fillText(label, x, plot.y + plot.height + 18);
      });
      ctx.restore();

      config.labels.forEach((label, labelIndex) => {
        config.datasets.forEach((dataset, datasetIndex) => {
          const value = dataset.values[labelIndex];
          const scaled = value / (range.max || 1);
          const heightValue = plot.height * scaled * progress;
          const x =
            plot.x +
            groupWidth * labelIndex +
            groupWidth / 2 -
            (barWidth * config.datasets.length) / 2 +
            datasetIndex * barWidth;
          const y = plot.y + plot.height - heightValue;

          ctx.fillStyle = dataset.color;
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
        const barHeight = Math.min(18, rowHeight * 0.46);
        const widthValue = (config.values[index] / max) * plot.width * progress;

        ctx.fillStyle = colors.gray;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(label, plot.x - 12, y);

        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        roundRect(ctx, plot.x, y - barHeight / 2, plot.width, barHeight, 999);
        ctx.fill();

        ctx.fillStyle = config.color || colors.red;
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
      const radius = size * 0.31;
      const lineWidth = Math.max(26, size * 0.11);
      const total = config.values.reduce((sum, value) => sum + value, 0) || 1;
      let start = -Math.PI / 2;

      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      config.values.forEach((value, index) => {
        const angle = (value / total) * Math.PI * 2 * progress;
        ctx.strokeStyle = config.colors[index];
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, start, start + angle);
        ctx.stroke();
        start += (value / total) * Math.PI * 2;
      });

      ctx.fillStyle = colors.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "800 20px Inter, Segoe UI, sans-serif";
      ctx.fillText(config.center || "", centerX, centerY - 2);
      ctx.font = "12px Inter, Segoe UI, sans-serif";
      ctx.fillStyle = colors.gray;
      if (config.caption) {
        ctx.fillText(config.caption, centerX, centerY + 20);
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
