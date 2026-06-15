function hexToRgb(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255
  ];
}

export function createBrushModel(initialState = {}) {
  let mode = initialState.mode ?? 'oil';
  let brushSize = initialState.brushSize ?? 22;
  let viscosity = initialState.viscosity ?? 0.5;
  let paper = initialState.paper ?? 0.4;
  let taperLength = initialState.taperLength ?? 8;
  let inkVolume = initialState.inkVolume ?? 1;
  let bristles = [];
  let finishedStrokes = [];
  let rawPath = [];
  let rawBristleData = [];

  function generateBristles(count) {
    bristles = [];
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random());
      bristles.push({
        dx: Math.cos(angle) * radius,
        dy: Math.sin(angle) * radius,
        ir: 0.75 + Math.random() * 0.25
      });
    }
  }

  function taperEnv(index, total) {
    const taperLimit = Math.min(taperLength, Math.floor(total * 0.45));
    if (index < taperLimit) {
      return Math.pow(Math.sin((index / taperLimit) * Math.PI * 0.5), 0.6);
    }

    if (index >= total - taperLimit) {
      return Math.pow(Math.cos(((index - (total - taperLimit)) / taperLimit) * Math.PI * 0.5), 0.8);
    }

    return 1;
  }

  function buildBristleData(x, y, pressure, vx, vy, envScale, rgb) {
    const isOil = mode === 'oil';
    const pressC = Math.pow(pressure, 1.8);
    const spread = pressC * brushSize * 0.55 * envScale;
    const inkFactor = Math.pow(inkVolume, 0.35);
    const count = bristles.length;
    const pos = new Float32Array(count * 2);
    const op = new Float32Array(count);
    const sz = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const bristle = bristles[index];
      pos[index * 2] = x + bristle.dx * spread + vx * 0.2;
      pos[index * 2 + 1] = y + bristle.dy * spread + vy * 0.2;

      const paperNoise = 1 - paper * Math.random() * 0.75;
      const edge = 1 - Math.sqrt(bristle.dx * bristle.dx + bristle.dy * bristle.dy) * 0.55;
      let opacity = pressC * inkFactor * bristle.ir * edge * paperNoise * envScale;

      if (isOil) {
        opacity *= 0.45 + viscosity * 0.55;
      } else {
        opacity *= 0.55 + pressure * 0.45;
      }

      op[index] = Math.max(0, Math.min(1, opacity));

      const baseSize = brushSize * (isOil ? 0.32 : 0.22);
      sz[index] = Math.max(
        1,
        baseSize *
          (isOil
            ? (0.5 + pressC * 0.6) * (0.7 + Math.random() * 0.6) * envScale
            : (0.3 + pressC * 0.9) * (0.8 + Math.random() * 0.4) * envScale)
      );
    }

    const hardness = isOil ? 0.25 + viscosity * 0.3 : 0.55 + pressure * 0.15;
    return { pos, op, sz, n: count, hardness, rgb: [...rgb] };
  }

  function consumeInk(pressure, vx, vy) {
    const isOil = mode === 'oil';
    const speed = Math.sqrt(vx * vx + vy * vy);
    const consume = isOil
      ? pressure * (0.002 + speed * 0.0008) * (1 - viscosity * 0.3)
      : pressure * (0.004 + speed * 0.0015);

    inkVolume = Math.max(0, inkVolume - consume);
  }

  function beginStroke() {
    rawPath = [];
    rawBristleData = [];
    generateBristles(mode === 'sumi' ? 30 : 20);
  }

  function addPoint(x, y, pressure, vx, vy, colorHex) {
    if (inkVolume <= 0.005) {
      return null;
    }

    consumeInk(pressure, vx, vy);
    const rgb = hexToRgb(colorHex);
    const call = buildBristleData(x, y, pressure, vx, vy, 1, rgb);
    rawPath.push({ x, y, p: pressure, vx, vy });
    rawBristleData.push(call);
    return call;
  }

  function endStroke() {
    const total = rawPath.length;
    if (total < 2) {
      rawPath = [];
      rawBristleData = [];
      return [];
    }

    const calls = [];
    for (let index = 0; index < total; index += 1) {
      const env = taperEnv(index, total);
      const data = rawBristleData[index];
      if (!data) {
        continue;
      }

      const op = new Float32Array(data.op.length);
      const sz = new Float32Array(data.sz.length);
      for (let pointIndex = 0; pointIndex < data.n; pointIndex += 1) {
        op[pointIndex] = data.op[pointIndex] * env;
        sz[pointIndex] = Math.max(0.5, data.sz[pointIndex] * env);
      }

      calls.push({
        pos: data.pos,
        op,
        sz,
        n: data.n,
        hardness: data.hardness,
        rgb: data.rgb
      });
    }

    finishedStrokes.push(calls);
    rawPath = [];
    rawBristleData = [];
    return calls;
  }

  function undoStroke() {
    if (finishedStrokes.length === 0) {
      return null;
    }

    return finishedStrokes.pop();
  }

  function clearAll() {
    finishedStrokes = [];
    rawPath = [];
    rawBristleData = [];
  }

  function refill() {
    inkVolume = 1;
  }

  function getInkPercent() {
    return Math.round(inkVolume * 100);
  }

  function getFinishedStrokes() {
    return finishedStrokes;
  }

  function setMode(nextMode) {
    mode = nextMode;
  }

  function setBrushSize(nextValue) {
    brushSize = nextValue;
  }

  function setViscosity(nextValue) {
    viscosity = nextValue;
  }

  function setPaper(nextValue) {
    paper = nextValue;
  }

  function setTaperLength(nextValue) {
    taperLength = nextValue;
  }

  return {
    beginStroke,
    addPoint,
    endStroke,
    undoStroke,
    clearAll,
    refill,
    getInkPercent,
    getFinishedStrokes,
    setMode,
    setBrushSize,
    setViscosity,
    setPaper,
    setTaperLength
  };
}
