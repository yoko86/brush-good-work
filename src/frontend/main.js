import './styles.css';
import { createBrushModel } from './brush/model.js';
import { createBrushRenderer } from './brush/renderer.js';

const canvas = document.getElementById('gc');
const wrap = document.getElementById('cwrap');
const model = createBrushModel();
const renderer = createBrushRenderer(canvas);

const controls = {
  oil: document.getElementById('b-oil'),
  sumi: document.getElementById('b-sumi'),
  color: document.getElementById('cpick'),
  size: document.getElementById('b-size'),
  visc: document.getElementById('b-visc'),
  paper: document.getElementById('b-paper'),
  taper: document.getElementById('b-taper'),
  undo: document.getElementById('b-undo'),
  clear: document.getElementById('b-clear'),
  refill: document.getElementById('b-refill'),
  sizeLabel: document.getElementById('o-sz'),
  viscLabel: document.getElementById('o-vi'),
  paperLabel: document.getElementById('o-pa'),
  taperLabel: document.getElementById('o-tp'),
  inkLabel: document.getElementById('ipct'),
  inkFill: document.getElementById('ifill')
};

let painting = false;
let px = 0;
let py = 0;
let pp = 0;
let pvx = 0;
let pvy = 0;

function resize() {
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
}

function updateHUD() {
  const percent = model.getInkPercent();
  controls.inkLabel.textContent = `${percent}%`;
  controls.inkFill.style.width = `${percent}%`;
}

function redrawAll() {
  renderer.clear(canvas.width, canvas.height);
  for (const stroke of model.getFinishedStrokes()) {
    for (const call of stroke) {
      renderer.drawCall(call, canvas.width, canvas.height);
    }
  }
}

function syncMode(nextMode) {
  model.setMode(nextMode);
  controls.oil.className = `tbtn${nextMode === 'oil' ? ' on' : ''}`;
  controls.sumi.className = `tbtn${nextMode === 'sumi' ? ' on' : ''}`;
}

function syncNumberLabel(input, label, scale = 1) {
  const value = Number(input.value) * scale;
  label.textContent = `${input.value}`;
  return value;
}

function getPointerPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top,
    pressure: event.pressure != null && event.pressure > 0 ? event.pressure : 0.5
  };
}

function drawPoint(sample, pressure, vx, vy) {
  const call = model.addPoint(sample.x, sample.y, pressure, vx, vy, controls.color.value);
  if (call) {
    renderer.drawCall(call, canvas.width, canvas.height);
  }
  updateHUD();
}

controls.oil.addEventListener('click', () => syncMode('oil'));
controls.sumi.addEventListener('click', () => syncMode('sumi'));
controls.size.addEventListener('input', () => {
  model.setBrushSize(Number(controls.size.value));
  controls.sizeLabel.textContent = controls.size.value;
});
controls.visc.addEventListener('input', () => {
  model.setViscosity(Number(controls.visc.value) / 10);
  controls.viscLabel.textContent = controls.visc.value;
});
controls.paper.addEventListener('input', () => {
  model.setPaper(Number(controls.paper.value) / 10);
  controls.paperLabel.textContent = controls.paper.value;
});
controls.taper.addEventListener('input', () => {
  model.setTaperLength(Number(controls.taper.value));
  controls.taperLabel.textContent = controls.taper.value;
});
controls.undo.addEventListener('click', () => {
  if (model.undoStroke()) {
    redrawAll();
  }
});
controls.clear.addEventListener('click', () => {
  model.clearAll();
  renderer.clear(canvas.width, canvas.height);
});
controls.refill.addEventListener('click', () => {
  model.refill();
  updateHUD();
});

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  painting = true;
  canvas.setPointerCapture(event.pointerId);
  model.beginStroke();

  const sample = getPointerPoint(event);
  px = sample.x;
  py = sample.y;
  pp = sample.pressure;
  pvx = 0;
  pvy = 0;

  drawPoint(sample, sample.pressure, 0, 0);
});

canvas.addEventListener('pointermove', (event) => {
  event.preventDefault();
  if (!painting) {
    return;
  }

  const sample = getPointerPoint(event);
  const dx = sample.x - px;
  const dy = sample.y - py;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1.5) {
    return;
  }

  const vx = dx * 0.5 + pvx * 0.5;
  const vy = dy * 0.5 + pvy * 0.5;
  pvx = vx;
  pvy = vy;

  const steps = Math.max(1, Math.ceil(dist / (Number(controls.size.value) * 0.15)));
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const ix = px + dx * t;
    const iy = py + dy * t;
    const ip = pp + (sample.pressure - pp) * t;
    drawPoint({ x: ix, y: iy }, ip, vx, vy);
  }

  px = sample.x;
  py = sample.y;
  pp = sample.pressure;
});

function finishStroke() {
  painting = false;
  model.endStroke();
}

canvas.addEventListener('pointerup', (event) => {
  event.preventDefault();
  finishStroke();
});
canvas.addEventListener('pointerleave', (event) => {
  event.preventDefault();
  if (painting) {
    finishStroke();
  }
});

window.addEventListener('resize', () => {
  resize();
  redrawAll();
});

resize();
renderer.clear(canvas.width, canvas.height);
syncMode('oil');
controls.sizeLabel.textContent = controls.size.value;
controls.viscLabel.textContent = controls.visc.value;
controls.paperLabel.textContent = controls.paper.value;
controls.taperLabel.textContent = controls.taper.value;
updateHUD();
