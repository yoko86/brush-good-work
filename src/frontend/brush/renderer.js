const VERTEX_SHADER = `
attribute vec2 aP;
attribute float aO;
attribute float aS;
uniform vec2 uR;
varying float vO;
void main(){
  vec2 p=(aP/uR)*2.0-1.0;
  gl_Position=vec4(p.x,-p.y,0.0,1.0);
  gl_PointSize=aS;
  vO=aO;
}`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec3 uC;
uniform float uH;
varying float vO;
void main(){
  vec2 uv=gl_PointCoord-0.5;
  float d=length(uv)*2.0;
  float a=1.0-smoothstep(uH,1.0,d);
  gl_FragColor=vec4(uC,a*vO);
}`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('WebGL shader creation failed');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'unknown shader error';
    gl.deleteShader(shader);
    throw new Error(log);
  }

  return shader;
}

export function createBrushRenderer(canvas) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    premultipliedAlpha: false,
    antialias: true,
    preserveDrawingBuffer: true
  });

  if (!gl) {
    throw new Error('WebGL is not available in this browser');
  }

  const program = gl.createProgram();
  if (!program) {
    throw new Error('WebGL program creation failed');
  }

  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || 'unknown program error';
    gl.deleteProgram(program);
    throw new Error(log);
  }

  gl.useProgram(program);

  const locP = gl.getAttribLocation(program, 'aP');
  const locO = gl.getAttribLocation(program, 'aO');
  const locS = gl.getAttribLocation(program, 'aS');
  const locR = gl.getUniformLocation(program, 'uR');
  const locC = gl.getUniformLocation(program, 'uC');
  const locH = gl.getUniformLocation(program, 'uH');

  const posBuf = gl.createBuffer();
  const opBuf = gl.createBuffer();
  const szBuf = gl.createBuffer();

  if (!posBuf || !opBuf || !szBuf) {
    throw new Error('WebGL buffer creation failed');
  }

  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  function clear(width, height) {
    gl.viewport(0, 0, width, height);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  function drawCall(call, width, height) {
    if (!call) {
      return;
    }

    gl.viewport(0, 0, width, height);
    gl.uniform2f(locR, width, height);
    gl.uniform3f(locC, call.rgb[0], call.rgb[1], call.rgb[2]);
    gl.uniform1f(locH, call.hardness);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, call.pos, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(locP);
    gl.vertexAttribPointer(locP, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, opBuf);
    gl.bufferData(gl.ARRAY_BUFFER, call.op, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(locO);
    gl.vertexAttribPointer(locO, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, szBuf);
    gl.bufferData(gl.ARRAY_BUFFER, call.sz, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(locS);
    gl.vertexAttribPointer(locS, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, call.n);
  }

  return {
    clear,
    drawCall
  };
}
