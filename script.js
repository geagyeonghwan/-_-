(function () {
  const namesArea = document.getElementById('namesArea');
  const countLabel = document.getElementById('countLabel');
  const decBtn = document.getElementById('decBtn');
  const incBtn = document.getElementById('incBtn');
  const buildBtn = document.getElementById('buildBtn');
  const rerollBtn = document.getElementById('rerollBtn');
  const revealAllBtn = document.getElementById('revealAllBtn');
  const canvas = document.getElementById('ladderCanvas');
  const ctx = canvas.getContext('2d');
  const resultPanel = document.getElementById('resultPanel');

  const MIN_N = 2;
  const MAX_N = 8;
  let n = 4;

  const colColors = ['#4f7cff', '#ff6b6b', '#2bb673', '#ffb020', '#a56dff', '#00b8d9', '#ff5fa2', '#7c8b9c'];

  let ladder = null;
  let animating = false;
  let colX = [];
  let rowY = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  const topGap = 60;
  const bottomGap = 60;
  const sideGap = 40;
  let rowCount = 18;
  let rowHeight = 26;

  function renderInputs() {
    namesArea.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const nameGroup = document.createElement('div');
      nameGroup.className = 'field-group';
      nameGroup.innerHTML = `
        <span class="label">참가자 ${i + 1}</span>
        <input type="text" id="name-${i}" placeholder="이름" value="참가자${i + 1}">
      `;
      const resultGroup = document.createElement('div');
      resultGroup.className = 'field-group';
      resultGroup.innerHTML = `
        <span class="label">결과 ${i + 1}</span>
        <input type="text" id="result-${i}" placeholder="결과" value="꽝">
      `;
      namesArea.appendChild(nameGroup);
      namesArea.appendChild(resultGroup);
    }
    countLabel.textContent = n;
  }

  decBtn.addEventListener('click', () => {
    if (n > MIN_N && !animating) { n--; renderInputs(); if (ladder) buildLadder(); }
  });
  incBtn.addEventListener('click', () => {
    if (n < MAX_N && !animating) { n++; renderInputs(); if (ladder) buildLadder(); }
  });

  function getNames() {
    const names = [];
    for (let i = 0; i < n; i++) names.push(document.getElementById(`name-${i}`).value.trim() || `참가자${i + 1}`);
    return names;
  }
  function getResults() {
    const results = [];
    for (let i = 0; i < n; i++) results.push(document.getElementById(`result-${i}`).value.trim() || `결과${i + 1}`);
    return results;
  }

  function generateLadder() {
    const rungs = [];
    for (let r = 0; r < rowCount; r++) {
      const rowRungs = [];
      let c = 0;
      while (c < n - 1) {
        if (Math.random() < 0.35) {
          rowRungs.push(c);
          c += 2;
        } else {
          c += 1;
        }
      }
      rungs.push(rowRungs);
    }
    return { n, rungs };
  }

  function traceFromTop(startCol, rungs) {
    let col = startCol;
    const path = [{ row: 0, col }];
    for (let r = 0; r < rungs.length; r++) {
      const rowRungs = rungs[r];
      if (rowRungs.includes(col)) {
        col = col + 1;
      } else if (rowRungs.includes(col - 1)) {
        col = col - 1;
      }
      path.push({ row: r + 1, col });
    }
    return { endCol: col, path };
  }

  function layout() {
    const width = Math.max(360, n * 90);
    const height = topGap + bottomGap + rowCount * rowHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    colX = [];
    const usableWidth = width - sideGap * 2;
    for (let i = 0; i < n; i++) {
      colX.push(sideGap + (n === 1 ? usableWidth / 2 : (usableWidth * i) / (n - 1)));
    }
    rowY = [];
    for (let r = 0; r <= rowCount; r++) {
      rowY.push(topGap + r * rowHeight);
    }
    canvasWidth = width;
    canvasHeight = height;
    return { width, height };
  }

  function draw(highlightPaths) {
    layout();
    renderScene(highlightPaths);
  }

  function renderScene(highlightPaths) {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const lineColor = isDark ? '#c8ccd4' : '#2b2f38';
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = lineColor;
    ctx.font = '600 14px sans-serif';
    ctx.textAlign = 'center';

    const names = getNames();
    const results = getResults();

    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(colX[i], rowY[0]);
      ctx.lineTo(colX[i], rowY[rowCount]);
      ctx.stroke();
    }

    ctx.strokeStyle = lineColor;
    ladder.rungs.forEach((rowRungs, r) => {
      rowRungs.forEach((c) => {
        ctx.beginPath();
        ctx.moveTo(colX[c], rowY[r]);
        ctx.lineTo(colX[c + 1], rowY[r]);
        ctx.stroke();
      });
    });

    if (highlightPaths) {
      highlightPaths.forEach(({ path, color }) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 7;
        ctx.beginPath();
        path.forEach((p, idx) => {
          const x = colX[p.col];
          const y = rowY[p.row];
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
    }

    ctx.fillStyle = isDark ? '#eceef2' : '#1c1e21';
    for (let i = 0; i < n; i++) {
      ctx.fillText(names[i], colX[i], rowY[0] - 20);
      ctx.fillText(results[i], colX[i], rowY[rowCount] + 34);
    }
  }

  function animatePath(startCol, onDone) {
    const { endCol, path } = traceFromTop(startCol, ladder.rungs);
    const color = colColors[startCol % colColors.length];
    const totalSegments = path.length - 1;
    const duration = Math.max(500, totalSegments * 45);
    const startTime = performance.now();

    function frame(now) {
      try {
        const t = Math.min(1, (now - startTime) / duration);
        const progress = t * totalSegments;
        const fullIdx = Math.floor(progress);
        const frac = progress - fullIdx;

        const points = path.slice(0, fullIdx + 1).map((p) => ({ x: colX[p.col], y: rowY[p.row] }));
        if (fullIdx < totalSegments) {
          const p1 = path[fullIdx];
          const p2 = path[fullIdx + 1];
          const x1 = colX[p1.col], y1 = rowY[p1.row];
          const x2 = colX[p2.col], y2 = rowY[p2.row];
          points.push({ x: x1 + (x2 - x1) * frac, y: y1 + (y2 - y1) * frac });
        }

        renderScene(null);
        ctx.strokeStyle = color;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        if (t < 1) {
          setTimeout(() => frame(performance.now()), 16);
        } else {
          onDone(endCol);
        }
      } catch (err) {
        console.error('사다리 애니메이션 오류:', err);
        onDone(endCol);
      }
    }
    frame(startTime);
  }

  function setControlsDisabled(disabled) {
    buildBtn.disabled = disabled;
    rerollBtn.disabled = disabled || !ladder;
    revealAllBtn.disabled = disabled || !ladder;
  }

  function onCanvasClick(evt) {
    if (!ladder || animating) return;
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    if (y > 40) return;
    let closest = 0;
    let minDist = Infinity;
    colX.forEach((cx, i) => {
      const d = Math.abs(cx - x);
      if (d < minDist) { minDist = d; closest = i; }
    });
    if (minDist > 40) return;

    animating = true;
    setControlsDisabled(true);
    resultPanel.innerHTML = '';
    animatePath(closest, (endCol) => {
      animating = false;
      setControlsDisabled(false);
      const names = getNames();
      const results = getResults();
      const line = document.createElement('div');
      line.className = 'result-line';
      line.innerHTML = `<span>${names[closest]}</span><b>${results[endCol]}</b>`;
      resultPanel.appendChild(line);
    });
  }

  function revealAll() {
    if (!ladder) return;
    const names = getNames();
    const results = getResults();
    const paths = [];
    resultPanel.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const { endCol, path } = traceFromTop(i, ladder.rungs);
      paths.push({ path, color: colColors[i % colColors.length] });
      const line = document.createElement('div');
      line.className = 'result-line';
      line.style.animationDelay = (i * 0.06) + 's';
      line.innerHTML = `<span style="color:${colColors[i % colColors.length]}">${names[i]}</span><b>${results[endCol]}</b>`;
      resultPanel.appendChild(line);
    }
    draw(paths);
  }

  function buildLadder() {
    ladder = generateLadder();
    layout();
    draw(null);
    resultPanel.innerHTML = '';
    rerollBtn.disabled = false;
    revealAllBtn.disabled = false;
  }

  buildBtn.addEventListener('click', buildLadder);
  rerollBtn.addEventListener('click', buildLadder);
  revealAllBtn.addEventListener('click', revealAll);
  canvas.addEventListener('click', onCanvasClick);

  renderInputs();
  layout();
})();
