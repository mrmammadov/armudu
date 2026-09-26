(() => {
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('view');
  const hint = document.getElementById('hint');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (!coarse) stage.classList.add('mouse');

  const defaultHint = coarse
    ? 'Drag to steer the glass · tap to slosh'
    : 'Move to steer the glass · click to slosh · scroll to read';
  hint.textContent = defaultHint;

  /* ---------- sample article ---------- */
  /* ---------- WebGL ---------- */
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) {
    const f = document.createElement('div');
    f.className = 'fallback';
    f.textContent = 'This effect needs WebGL, and your browser has it turned off. Try another browser or enable hardware acceleration.';
    stage.appendChild(f);
    hint.hidden = true;
    return;
  }

  function compile(type, srcText) {
    const s = gl.createShader(type);
    gl.shaderSource(s, srcText);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uTex','uRes','uTexSize','uC','uSlosh','uScroll','uR','uTime','uEnergy','uTea','uMag','uWobble','uDpr','uAbsorb']
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.uTex, 0);
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);

  /* ---------- state ---------- */
  const DRINKS = {
    black: { absorb: [0.12, 0.55, 1.35], tea: 1.0 },
    weak:  { absorb: [0.12, 0.55, 1.35], tea: 0.4 },
    green: { absorb: [0.42, 0.14, 0.95], tea: 0.55 },
    water: { absorb: [0.05, 0.02, 0.01], tea: 0.0 },
  };
  const ui = {
    tea: document.getElementById('tea'),
    mag: document.getElementById('mag'),
    wobble: document.getElementById('wobble'),
    size: document.getElementById('size'),
  };
  const outs = {
    tea: document.getElementById('teaOut'),
    mag: document.getElementById('magOut'),
    wobble: document.getElementById('wobbleOut'),
    size: document.getElementById('sizeOut'),
  };
  const st = {
    absorb: DRINKS.black.absorb,
    wander: !reduceMotion,
    scroll: 0,
    texW: 1, texH: 1,
    W: 1, H: 1, dpr: 1,
    pos: [0, 0], target: [0, 0], prevPos: [0, 0],
    vel: [0, 0], acc: [0, 0],
    S: [0, 0], SV: [0, 0], energy: 0,
    t: 0, wt: 0,
    image: null,
  };
  if (reduceMotion) ui.wobble.value = 0.12;

  function syncOutputs() {
    outs.tea.textContent = (+ui.tea.value).toFixed(2);
    outs.mag.textContent = (+ui.mag.value).toFixed(2) + '×';
    outs.wobble.textContent = Math.round(ui.wobble.value * 100) + '%';
    outs.size.textContent = ui.size.value * 2 + ' px';
  }
  Object.values(ui).forEach((el) => el.addEventListener('input', syncOutputs));

  document.getElementById('drinks').addEventListener('click', (e) => {
    const b = e.target.closest('[data-drink]');
    if (!b) return;
    const d = DRINKS[b.dataset.drink];
    st.absorb = d.absorb;
    ui.tea.value = d.tea;
    document.querySelectorAll('[data-drink]').forEach((x) => x.setAttribute('aria-checked', x === b));
    syncOutputs();
    kick(2.5);
  });

  const wanderBtn = document.getElementById('wander');
  function setWander(on) {
    st.wander = on;
    wanderBtn.setAttribute('aria-pressed', on);
  }
  setWander(st.wander);
  wanderBtn.addEventListener('click', () => setWander(!st.wander));

  /* ---------- source texture ---------- */
  const srcCanvas = document.createElement('canvas');
  const sctx = srcCanvas.getContext('2d');

  function rebuildSource() {
    const { W, H, dpr } = st;
    const tw = Math.min(W, maxTex);
    let th;
    if (st.image) {
      const img = st.image;
      const drawH = img.naturalHeight * (tw / img.naturalWidth);
      th = Math.min(maxTex, Math.max(H, Math.round(drawH)));
      srcCanvas.width = tw; srcCanvas.height = th;
      sctx.fillStyle = '#FFFFFF';
      sctx.fillRect(0, 0, tw, th);
      sctx.drawImage(img, 0, 0, tw, drawH);
    } else {
      const cssW = tw / dpr;
      const hCss = drawArticle(sctx, cssW, false);
      th = Math.min(maxTex, Math.max(H, Math.ceil(hCss * dpr)));
      srcCanvas.width = tw; srcCanvas.height = th;
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.fillStyle = '#FFFFFF';
      sctx.fillRect(0, 0, cssW, th / dpr);
      drawArticle(sctx, cssW, true);
      sctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    st.texW = tw; st.texH = th;
    st.scroll = Math.min(st.scroll, Math.max(0, th - H));
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(stage.clientWidth * dpr));
    const H = Math.max(1, Math.round(stage.clientHeight * dpr));
    const first = st.W === 1;
    const widthChanged = W !== st.W || dpr !== st.dpr;
    st.W = W; st.H = H; st.dpr = dpr;
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    if (first) {
      const cssMin = Math.min(W, H) / dpr;
      ui.size.value = Math.round(Math.max(70, Math.min(150, cssMin * 0.3)));
      syncOutputs();
      st.pos = [W * 0.5, H * 0.45];
      st.target = st.pos.slice();
      st.prevPos = st.pos.slice();
    }
    if (widthChanged || first) rebuildSource();
    else st.scroll = Math.min(st.scroll, Math.max(0, st.texH - H));
  }
  new ResizeObserver(resize).observe(stage);

  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('400 19px Newsreader'),
      document.fonts.load('700 44px Newsreader'),
      document.fonts.load('italic 400 21px Newsreader'),
      document.fonts.load('600 12px "IBM Plex Sans"'),
      document.fonts.load('400 13px "IBM Plex Mono"'),
    ]).then(() => { if (!st.image && st.W > 1) rebuildSource(); }).catch(() => {});
  }

  /* ---------- your own screenshot ---------- */
  const sampleBtn = document.getElementById('sample');
  function useFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      hint.textContent = 'That file is not an image. Choose a PNG, JPG or WebP screenshot.';
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      st.image = img;
      st.scroll = 0;
      rebuildSource();
      sampleBtn.hidden = false;
      hint.textContent = coarse ? 'Your screenshot is under the glass.' : 'Your screenshot is under the glass · scroll to see the rest';
    };
    img.onerror = () => { hint.textContent = 'That image could not be opened. Try a PNG or JPG.'; };
    img.src = url;
  }
  document.getElementById('file').addEventListener('change', (e) => useFile(e.target.files[0]));
  sampleBtn.addEventListener('click', () => {
    st.image = null; st.scroll = 0;
    rebuildSource();
    sampleBtn.hidden = true;
    hint.textContent = defaultHint;
  });
  stage.addEventListener('dragover', (e) => { e.preventDefault(); stage.classList.add('dropping'); });
  stage.addEventListener('dragleave', () => stage.classList.remove('dropping'));
  stage.addEventListener('drop', (e) => {
    e.preventDefault();
    stage.classList.remove('dropping');
    useFile(e.dataTransfer.files[0]);
  });
  window.addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) useFile(f);
  });

  /* ---------- steering ---------- */
  let dragging = false;
  function setTarget(e) {
    const rect = stage.getBoundingClientRect();
    st.target = [(e.clientX - rect.left) * st.dpr, (e.clientY - rect.top) * st.dpr];
    if (st.wander) setWander(false);
  }
  function kick(strength) {
    const a = Math.random() * Math.PI * 2;
    st.SV[0] += Math.cos(a) * strength;
    st.SV[1] += Math.sin(a) * strength;
  }
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || dragging) setTarget(e);
  });
  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    stage.setPointerCapture(e.pointerId);
    setTarget(e);
    kick(3.5);
  });
  const endDrag = () => { dragging = false; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? st.H / st.dpr : 1;
    st.scroll = Math.max(0, Math.min(st.texH - st.H, st.scroll + e.deltaY * unit * st.dpr));
    st.SV[1] += Math.sign(e.deltaY) * 0.4;
  }, { passive: false });

  stage.addEventListener('keydown', (e) => {
    const step = 24 * st.dpr;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      if (st.wander) setWander(false);
      st.target[0] = Math.max(0, Math.min(st.W, st.target[0] + moves[e.key][0]));
      st.target[1] = Math.max(0, Math.min(st.H, st.target[1] + moves[e.key][1]));
    } else if (e.key === ' ') {
      e.preventDefault(); kick(4);
    } else if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault();
      const d = (e.key === 'PageDown' ? 1 : -1) * st.H * 0.8;
      st.scroll = Math.max(0, Math.min(st.texH - st.H, st.scroll + d));
    }
  });

  /* ---------- loop ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    st.t += dt;
    const R = ui.size.value * st.dpr;

    if (st.wander) {
      st.wt += dt;
      st.target = [
        st.W * (0.5 + 0.3 * Math.sin(st.wt * 0.33)),
        st.H * (0.48 + 0.26 * Math.sin(st.wt * 0.51 + 1.2)),
      ];
    }

    // glass follows the target smoothly
    const k = 1 - Math.exp(-dt * (st.wander ? 3 : 14));
    st.prevPos = st.pos.slice();
    st.pos[0] += (st.target[0] - st.pos[0]) * k;
    st.pos[1] += (st.target[1] - st.pos[1]) * k;
    const vel = [(st.pos[0] - st.prevPos[0]) / dt, (st.pos[1] - st.prevPos[1]) / dt];
    for (let i = 0; i < 2; i++) {
      const a = (vel[i] - st.vel[i]) / dt;
      st.acc[i] += (a - st.acc[i]) * 0.3;
    }
    st.vel = vel;

    // liquid sloshes: a damped spring pushed opposite to the glass's acceleration
    for (let i = 0; i < 2; i++) {
      const force = -55 * st.S[i] - 4.2 * st.SV[i] - (st.acc[i] / R) * 0.3;
      st.SV[i] += force * dt;
      st.S[i] += st.SV[i] * dt;
    }
    const sl = Math.hypot(st.S[0], st.S[1]);
    if (sl > 0.55) { st.S[0] *= 0.55 / sl; st.S[1] *= 0.55 / sl; }
    const eTarget = Math.min(1, Math.hypot(st.SV[0], st.SV[1]) * 0.25 + Math.hypot(vel[0], vel[1]) / R * 0.04);
    st.energy += (eTarget - st.energy) * (1 - Math.exp(-dt * 5));
    const motion = reduceMotion ? 0.3 : 1;

    gl.uniform2f(U.uRes, st.W, st.H);
    gl.uniform2f(U.uTexSize, st.texW, st.texH);
    gl.uniform2f(U.uC, st.pos[0], st.pos[1]);
    gl.uniform2f(U.uSlosh, st.S[0] * motion, st.S[1] * motion);
    gl.uniform1f(U.uScroll, st.scroll);
    gl.uniform1f(U.uR, R);
    gl.uniform1f(U.uTime, st.t * motion);
    gl.uniform1f(U.uEnergy, st.energy * motion);
    gl.uniform1f(U.uTea, +ui.tea.value);
    gl.uniform1f(U.uMag, +ui.mag.value);
    gl.uniform1f(U.uWobble, +ui.wobble.value);
    gl.uniform1f(U.uDpr, st.dpr);
    gl.uniform3fv(U.uAbsorb, st.absorb);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  syncOutputs();
  resize();
  requestAnimationFrame(frame);
})();
