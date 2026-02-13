const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const next2Canvas = document.getElementById('next2');
const next2Ctx = next2Canvas.getContext('2d');
const chainEl = document.getElementById('chain');
const maxChainEl = document.getElementById('max-chain');
const { createField, placeCells, applyGravity, findMatches } = window.PuyoCore;

const COLS = 6;
const ROWS = 12;
const CELL = 60;

const COLORS = [
  '#000000',
  '#e35b5b',
  '#5bb7e3',
  '#e3c35b',
  '#6ad06a',
];

const DROP_INTERVAL = 550;
const SOFT_DROP_INTERVAL = 70;
const SPAWN_DELAY = 220;
const CLEAR_TIME = 480;
const CLEAR_BLINK_INTERVAL = 100;

let field = createField(ROWS, COLS);
let current = null;
let nextPair = createPair();
let nextNextPair = createPair();
let lastTime = 0;
let dropTimer = 0;
let softDrop = false;
let state = 'falling';
let spawnDelay = 0;
let clearTimer = 0;
let clearBlinkTimer = 0;
let clearCells = new Set();
let clearList = [];
let currentChain = 0;
let maxChain = 0;

function randomColor() {
  return 1 + Math.floor(Math.random() * 4);
}

function createPair() {
  return {
    pivot: { x: 2, y: 0, c: randomColor() },
    child: { x: 2, y: -1, c: randomColor() },
    rot: 0,
  };
}

function resetGame() {
  field = createField(ROWS, COLS);
  current = null;
  nextPair = createPair();
  nextNextPair = createPair();
  lastTime = 0;
  dropTimer = 0;
  softDrop = false;
  state = 'falling';
  spawnDelay = 0;
  clearTimer = 0;
  clearBlinkTimer = 0;
  clearCells = new Set();
  clearList = [];
  currentChain = 0;
  updateChainDisplay();
}

function spawnPair() {
  current = nextPair;
  nextPair = nextNextPair;
  nextNextPair = createPair();
  if (collides(current.pivot.x, current.pivot.y) || collides(current.child.x, current.child.y)) {
    resetGame();
  }
}

function getCells(pair) {
  return [
    { x: pair.pivot.x, y: pair.pivot.y, c: pair.pivot.c },
    { x: pair.child.x, y: pair.child.y, c: pair.child.c },
  ];
}

function collides(x, y) {
  if (x < 0 || x >= COLS || y >= ROWS) return true;
  if (y < 0) return false;
  return field[y][x] !== 0;
}

function move(dx, dy) {
  if (!current) return;
  const cells = getCells(current);
  for (const cell of cells) {
    const nx = cell.x + dx;
    const ny = cell.y + dy;
    if (collides(nx, ny)) return false;
  }
  current.pivot.x += dx;
  current.child.x += dx;
  current.pivot.y += dy;
  current.child.y += dy;
  return true;
}

function rotate() {
  if (!current) return;
  const nextRot = (current.rot + 1) % 4;
  const { x, y } = current.pivot;
  const offsets = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
  const off = offsets[nextRot];
  const target = { x: x + off.x, y: y + off.y };

  if (!collides(target.x, target.y)) {
    current.rot = nextRot;
    current.child.x = target.x;
    current.child.y = target.y;
    return;
  }

  // Simple wall kick
  if (!collides(target.x - 1, target.y)) {
    current.pivot.x -= 1;
    current.child.x = target.x - 1;
    current.child.y = target.y;
    current.rot = nextRot;
  } else if (!collides(target.x + 1, target.y)) {
    current.pivot.x += 1;
    current.child.x = target.x + 1;
    current.child.y = target.y;
    current.rot = nextRot;
  }
}

function lockPair() {
  placeCells(field, getCells(current));
  current = null;
  applyGravity(field);
  dropTimer = 0;
  currentChain = 0;
  updateChainDisplay();
  resolveClears();
}

function resolveClears() {
  const matches = findMatches(field);
  if (matches.length === 0) {
    startSpawnDelay();
    return;
  }
  startClearing(matches);
}

function startSpawnDelay() {
  state = 'spawnDelay';
  spawnDelay = SPAWN_DELAY;
  clearTimer = 0;
  clearBlinkTimer = 0;
  clearCells = new Set();
  clearList = [];
  currentChain = 0;
  updateChainDisplay();
}

function startClearing(matches) {
  state = 'clearing';
  clearTimer = CLEAR_TIME;
  clearBlinkTimer = 0;
  clearList = matches;
  clearCells = new Set(matches.map((cell) => `${cell.x},${cell.y}`));
  currentChain += 1;
  if (currentChain > maxChain) {
    maxChain = currentChain;
  }
  updateChainDisplay(true);
}

function update(delta) {
  if (state === 'spawnDelay') {
    spawnDelay -= delta;
    if (spawnDelay <= 0) {
      state = 'falling';
      if (!current) spawnPair();
      dropTimer = 0;
    }
    return;
  }

  if (state === 'clearing') {
    clearTimer -= delta;
    clearBlinkTimer += delta;
    if (clearTimer <= 0) {
      for (const cell of clearList) {
        field[cell.y][cell.x] = 0;
      }
      applyGravity(field);
      const matches = findMatches(field);
      if (matches.length > 0) {
        startClearing(matches);
      } else {
        startSpawnDelay();
      }
    }
    return;
  }

  if (!current) {
    spawnPair();
  }

  dropTimer += delta;
  const interval = softDrop ? SOFT_DROP_INTERVAL : DROP_INTERVAL;
  if (dropTimer >= interval) {
    dropTimer = 0;
    if (!move(0, 1)) {
      lockPair();
    }
  }
}

function drawCell(x, y, color, alpha = 1, scale = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS[color];
  ctx.beginPath();
  ctx.arc(
    x * CELL + CELL / 2,
    y * CELL + CELL / 2,
    CELL * 0.42 * scale,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function renderGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fdfbf6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#e6ddd1';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, ROWS * CELL);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(COLS * CELL, y * CELL);
    ctx.stroke();
  }
}

function renderField() {
  const blinking =
    state === 'clearing' &&
    Math.floor(clearBlinkTimer / CLEAR_BLINK_INTERVAL) % 2 === 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (field[y][x] !== 0) {
        const key = `${x},${y}`;
        const isClearingCell = state === 'clearing' && clearCells.has(key);
        if (isClearingCell) {
          const alpha = blinking ? 0.25 : 1;
          const scale = blinking ? 0.8 : 1;
          drawCell(x, y, field[y][x], alpha, scale);
        } else {
          drawCell(x, y, field[y][x]);
        }
      }
    }
  }
}

function renderCurrent() {
  if (!current) return;
  for (const cell of getCells(current)) {
    if (cell.y >= 0) drawCell(cell.x, cell.y, cell.c);
  }
}

function renderNext() {
  renderMiniPair(nextCtx, nextPair);
  renderMiniPair(next2Ctx, nextNextPair);
}

function renderMiniPair(context, pair) {
  context.clearRect(0, 0, 120, 120);
  context.fillStyle = '#fffdf8';
  context.fillRect(0, 0, 120, 120);

  const cells = [
    { x: 1, y: 1, c: pair.pivot.c },
    { x: 1, y: 0, c: pair.child.c },
  ];
  for (const cell of cells) {
    context.fillStyle = COLORS[cell.c];
    context.beginPath();
    context.arc(
      cell.x * 40 + 20,
      cell.y * 40 + 20,
      16,
      0,
      Math.PI * 2
    );
    context.fill();
    context.strokeStyle = 'rgba(0,0,0,0.15)';
    context.lineWidth = 2;
    context.stroke();
  }
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  update(delta);
  renderGrid();
  renderField();
  renderCurrent();
  renderNext();

  requestAnimationFrame(loop);
}

function updateChainDisplay(pop = false) {
  if (!chainEl || !maxChainEl) return;
  chainEl.textContent = String(currentChain);
  maxChainEl.textContent = String(maxChain);
  if (pop) {
    chainEl.classList.remove('pop');
    maxChainEl.classList.remove('pop');
    void chainEl.offsetWidth;
    chainEl.classList.add('pop');
    maxChainEl.classList.add('pop');
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ') {
    e.preventDefault();
  }
  const key = e.key.toLowerCase();
  if (key === 'a') move(-1, 0);
  if (key === 'd') move(1, 0);
  if (key === 's') softDrop = true;
  if (key === 'w' || key === 'z') rotate();
  if (key === 'r') resetGame();
}, { passive: false });

window.addEventListener('keyup', (e) => {
  if (e.key.toLowerCase() === 's') softDrop = false;
});

resetGame();
requestAnimationFrame(loop);
