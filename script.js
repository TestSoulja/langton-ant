/* Муравей Лэнгтона — визуализация на Canvas.
 *
 * Правила:
 *   белая клетка  -> поворот направо, клетка становится чёрной;
 *   чёрная клетка -> поворот налево,  клетка становится белой;
 *   затем шаг вперёд на одну клетку.
 *
 * Поле замкнуто в тор: выход за край переносит муравья на другую сторону.
 */
(() => {
  "use strict";

  const COLS = 150;
  const ROWS = 100;
  const CELL = 6; // размер клетки в пикселях холста

  const WHITE = [255, 255, 255];
  const BLACK = [24, 24, 32];
  const ANT_COLOR = "#e8483c";

  // 0 — вверх, 1 — вправо, 2 — вниз, 3 — влево
  const DIRS = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const ARROWS = ["↑", "→", "↓", "←"];
  const NAMES = ["вверх", "вправо", "вниз", "влево"];

  /* ---------- холст ---------- */

  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;
  ctx.imageSmoothingEnabled = false;

  // Поле рисуется в маленький offscreen-холст (1 клетка = 1 пиксель),
  // затем масштабируется без сглаживания — это намного быстрее, чем
  // заливать тысячи прямоугольников по одному.
  const off = document.createElement("canvas");
  off.width = COLS;
  off.height = ROWS;
  const offCtx = off.getContext("2d");
  const frameData = offCtx.createImageData(COLS, ROWS);
  const pixels = frameData.data;
  pixels.fill(255);

  const grid = new Uint8Array(COLS * ROWS); // 1 = чёрная клетка

  const state = {
    x: COLS >> 1,
    y: ROWS >> 1,
    dir: 1,
    steps: 0,
    black: 0,
    running: false,
    speed: 50,
  };

  /* ---------- элементы ---------- */

  const runBtn = document.getElementById("run");
  const stepBtn = document.getElementById("step");
  const resetBtn = document.getElementById("reset");
  const speedInput = document.getElementById("speed");
  const speedOut = document.getElementById("speedOut");
  const stepsOut = document.getElementById("steps");
  const blackOut = document.getElementById("black");
  const dirOut = document.getElementById("dir");

  /* ---------- симуляция ---------- */

  function paint(x, y, isBlack) {
    const p = (y * COLS + x) * 4;
    const color = isBlack ? BLACK : WHITE;
    pixels[p] = color[0];
    pixels[p + 1] = color[1];
    pixels[p + 2] = color[2];
    pixels[p + 3] = 255;
  }

  function step() {
    const i = state.y * COLS + state.x;

    if (grid[i]) {
      state.dir = (state.dir + 3) & 3; // налево
      grid[i] = 0;
      state.black--;
      paint(state.x, state.y, false);
    } else {
      state.dir = (state.dir + 1) & 3; // направо
      grid[i] = 1;
      state.black++;
      paint(state.x, state.y, true);
    }

    const d = DIRS[state.dir];
    state.x = (state.x + d[0] + COLS) % COLS;
    state.y = (state.y + d[1] + ROWS) % ROWS;
    state.steps++;
  }

  /* ---------- отрисовка ---------- */

  function render() {
    offCtx.putImageData(frameData, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, COLS * CELL, ROWS * CELL);

    const cx = state.x * CELL + CELL / 2;
    const cy = state.y * CELL + CELL / 2;
    const d = DIRS[state.dir];
    const angle = Math.atan2(d[1], d[0]);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(CELL, 0);
    ctx.lineTo(-CELL * 0.6, CELL * 0.65);
    ctx.lineTo(-CELL * 0.6, -CELL * 0.65);
    ctx.closePath();
    ctx.fillStyle = ANT_COLOR;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.stroke();
    ctx.restore();
  }

  function updateStats() {
    stepsOut.textContent = state.steps.toLocaleString("ru-RU");
    blackOut.textContent = state.black.toLocaleString("ru-RU");
    dirOut.textContent = ARROWS[state.dir] + " " + NAMES[state.dir];
  }

  /* ---------- анимация ---------- */

  let rafId = null;
  let lastStats = 0;

  function frame(now) {
    if (!state.running) {
      rafId = null;
      return;
    }

    const n = state.speed | 0;
    for (let k = 0; k < n; k++) step();

    render();

    if (now - lastStats > 120) {
      updateStats();
      lastStats = now;
    }

    rafId = requestAnimationFrame(frame);
  }

  function setRunning(value) {
    state.running = value;
    runBtn.textContent = value ? "⏸ Пауза" : "▶ Старт";
    runBtn.classList.toggle("is-running", value);
    runBtn.setAttribute("aria-pressed", String(value));

    if (value && rafId === null) {
      lastStats = performance.now();
      rafId = requestAnimationFrame(frame);
    }
  }

  function singleStep() {
    if (state.running) setRunning(false);
    step();
    render();
    updateStats();
  }

  function reset() {
    setRunning(false);
    grid.fill(0);
    pixels.fill(255);
    state.x = COLS >> 1;
    state.y = ROWS >> 1;
    state.dir = 1;
    state.steps = 0;
    state.black = 0;
    render();
    updateStats();
  }

  /* ---------- события ---------- */

  runBtn.addEventListener("click", () => setRunning(!state.running));
  stepBtn.addEventListener("click", singleStep);
  resetBtn.addEventListener("click", reset);

  speedInput.addEventListener("input", () => {
    state.speed = Number(speedInput.value) || 1;
    speedOut.textContent = state.speed;
  });

  document.addEventListener("keydown", (event) => {
    const tag = event.target && event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (event.code === "Space") {
      event.preventDefault();
      setRunning(!state.running);
    } else if (event.code === "ArrowRight") {
      event.preventDefault();
      singleStep();
    } else if (event.key === "r" || event.key === "R" || event.key === "к" || event.key === "К") {
      reset();
    }
  });

  /* ---------- старт ---------- */

  render();
  updateStats();
  setRunning(true); // запускаем сразу, чтобы страница «ожила»
})();
