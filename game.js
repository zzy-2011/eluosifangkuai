/* 俄罗斯方块 — 纯 Canvas 实现 */
(() => {
  'use strict';
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const ncv = document.getElementById('next');
  const nctx = ncv.getContext('2d');
  const COLS = 10, ROWS = 20, CELL = 24;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  cv.width = COLS * CELL * dpr; cv.height = ROWS * CELL * dpr; ctx.scale(dpr, dpr);
  ncv.width = 96 * dpr; ncv.height = 96 * dpr; nctx.scale(dpr, dpr);

  const scoreEl = document.getElementById('score'), linesEl = document.getElementById('lines'), levelEl = document.getElementById('level');
  const overlay = document.getElementById('overlay'), ovTitle = document.getElementById('ov-title'), ovSub = document.getElementById('ov-sub');

  const SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]]
  };
  const COLORS = { I:'#4fd1ff', O:'#ffd23f', T:'#b15cff', S:'#43d97a', Z:'#ff5c7a', J:'#4f7bff', L:'#ff9f43' };
  const TYPES = Object.keys(SHAPES);

  let board, cur, nextType, score, lines, level, dropInt, acc, last, alive, paused;

  function clone(m) { return m.map(r => r.slice()); }
  function rotate(m) {
    const n = m.length, r = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) r[j][n - 1 - i] = m[i][j];
    return r;
  }
  function randType() { return TYPES[Math.floor(Math.random() * TYPES.length)]; }

  function reset() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0; lines = 0; level = 1; dropInt = 800; acc = 0; alive = true; paused = false;
    nextType = randType();
    scoreEl.textContent = '0'; linesEl.textContent = '0'; levelEl.textContent = '1';
    overlay.classList.add('hidden');
    spawn();
    last = performance.now();
  }

  function spawn() {
    cur = { type: nextType, m: clone(SHAPES[nextType]), x: 3, y: 0 };
    nextType = randType();
    if (collide(cur.m, cur.x, cur.y)) gameOver();
  }

  function collide(m, x, y) {
    for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const bx = x + c, by = y + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
    return false;
  }

  function move(dx) {
    if (!alive || paused) return;
    if (!collide(cur.m, cur.x + dx, cur.y)) cur.x += dx;
  }
  function softDrop() {
    if (!alive || paused) return;
    if (!collide(cur.m, cur.x, cur.y + 1)) { cur.y++; acc = 0; }
    else lock();
  }
  function hardDrop() {
    if (!alive || paused) return;
    while (!collide(cur.m, cur.x, cur.y + 1)) cur.y++;
    lock();
  }
  function rotateCur() {
    if (!alive || paused) return;
    const rm = rotate(cur.m);
    for (const k of [0, -1, 1, -2, 2]) {
      if (!collide(rm, cur.x + k, cur.y)) { cur.m = rm; cur.x += k; return; }
    }
  }

  function lock() {
    for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m[r].length; c++) {
      if (cur.m[r][c]) {
        const by = cur.y + r;
        if (by < 0) return gameOver();
        board[by][cur.x + c] = cur.type;
      }
    }
    clearLines();
    spawn();
  }

  function clearLines() {
    let cleared = 0;
    const nb = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every(v => v)) cleared++;
      else nb.push(board[r]);
    }
    while (nb.length < ROWS) nb.unshift(Array(COLS).fill(0));
    board = nb;
    if (cleared) {
      const pts = [0, 100, 300, 500, 800][cleared] * level;
      score += pts; lines += cleared; level = Math.floor(lines / 10) + 1;
      dropInt = Math.max(80, 800 - (level - 1) * 70);
      scoreEl.textContent = score; linesEl.textContent = lines; levelEl.textContent = level;
    }
  }

  function gameOver() {
    alive = false;
    ovTitle.textContent = '游戏结束';
    ovSub.textContent = '得分 ' + score + ' · 消行 ' + lines;
    overlay.classList.remove('hidden');
  }

  function drawCell(g, x, y, type, size) {
    g.fillStyle = COLORS[type];
    g.fillRect(x + 1, y + 1, size - 2, size - 2);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(x + 1, y + 1, size - 2, 4);
  }

  function draw() {
    ctx.fillStyle = '#1a1c3a'; ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    ctx.strokeStyle = '#252850'; ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke(); }
    for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, ROWS * CELL); ctx.stroke(); }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c]) drawCell(ctx, c * CELL, r * CELL, board[r][c], CELL);
    if (cur && alive) {
      for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m[r].length; c++)
        if (cur.m[r][c]) { const by = cur.y + r; if (by >= 0) drawCell(ctx, (cur.x + c) * CELL, by * CELL, cur.type, CELL); }
    }
    // next
    nctx.fillStyle = '#1a1c3a'; nctx.fillRect(0, 0, 96, 96);
    const nm = SHAPES[nextType], ns = 22, off = 16;
    const cc = nm[0].length, rr = nm.length;
    let minR = rr, maxR = -1, minC = cc, maxC = -1;
    for (let r = 0; r < rr; r++) for (let c = 0; c < cc; c++) if (nm[r][c]) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
    const pw = (maxC - minC + 1) * ns, ph = (maxR - minR + 1) * ns;
    const ox = (96 - pw) / 2 - minC * ns, oy = (96 - ph) / 2 - minR * ns;
    for (let r = 0; r < rr; r++) for (let c = 0; c < cc; c++) if (nm[r][c]) nctx.fillStyle = COLORS[nextType], nctx.fillRect(ox + c * ns + 1, oy + r * ns + 1, ns - 2, ns - 2);
  }

  function loop(t) {
    const dt = Math.min(50, t - last); last = t;
    if (alive && !paused) {
      acc += dt;
      while (acc >= dropInt) { acc -= dropInt; if (!collide(cur.m, cur.x, cur.y + 1)) cur.y++; else lock(); }
    }
    draw();
    requestAnimationFrame(loop);
  }

  // 输入
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); move(-1); break;
      case 'ArrowRight': case 'd': case 'D': e.preventDefault(); move(1); break;
      case 'ArrowDown': case 's': case 'S': e.preventDefault(); softDrop(); break;
      case 'ArrowUp': case 'x': case 'X': case 'w': case 'W': e.preventDefault(); rotateCur(); break;
      case ' ': e.preventDefault(); hardDrop(); break;
      case 'p': case 'P': togglePause(); break;
    }
  });
  let sx = 0, sy = 0, st = 0;
  cv.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
  cv.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) { rotateCur(); return; }
    if (Math.abs(dx) > Math.abs(dy)) { if (dx > 0) move(1); else move(-1); }
    else { if (dy > 0) softDrop(); else rotateCur(); }
  }, { passive: true });

  function togglePause() {
    if (!alive) return;
    paused = !paused;
    if (paused) { ovTitle.textContent = '已暂停'; ovSub.textContent = '按 P 或继续'; overlay.classList.remove('hidden'); }
    else { overlay.classList.add('hidden'); last = performance.now(); }
  }

  document.getElementById('new').addEventListener('click', reset);
  document.getElementById('pause').addEventListener('click', togglePause);
  document.getElementById('ov-btn').addEventListener('click', reset);

  reset();
  requestAnimationFrame(loop);
})();
