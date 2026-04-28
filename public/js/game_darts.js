// =====================================================
// Game 2: Balloon Darts
// =====================================================
const GameDarts = (() => {
  const TOTAL_TIME_UNITS = 30;
  const UNIT_MS = 1500;
  const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];

  let players = [], order = [], scores = [], currentIdx = 0;
  let canvas, ctx, animId;
  let timeUnits = TOTAL_TIME_UNITS;
  let timeStart;
  let runningGame = false;
  let lastThrowAt = 0;
  let balloons = [];
  let darts = [];
  let mouseX = 0, mouseY = 0;
  let currentGrid = 5;

  function start() {
    players = SessionManager.players();
    if (!players.length) { window.location.href = '/'; return; }
    scores = players.map(_ => 0);
    DiceModule.animate(document.getElementById('phase'), players, ordered => {
      order = ordered;
      currentIdx = 0;
      playNext();
    });
  }

  function refreshSide() {
    GameCommon.renderSideboard(document.getElementById('score-side'), order, scores, currentIdx, 'Scores');
  }

  function playNext() {
    if (currentIdx >= order.length) return endGame();
    const cur = order[currentIdx];
    const phase = document.getElementById('phase');
    phase.innerHTML = `
      <div class="text-center">
        <h3 class="ttl text-white text-shadow-strong">It's <span style="color:var(--accent)">${escapeHtml(cur.username)}</span>'s turn!</h3>
        <button class="btn btn-carnival mt-2" id="btn-go">Throw!</button>
      </div>`;
    document.getElementById('btn-go').addEventListener('click', () => runTurn(cur));
    refreshSide();
  }

  function makeWall(grid) {
    const wall = [];
    const margin = 40;
    const w = canvas.width  - margin * 2;
    const h = canvas.height - margin * 2;
    const cellW = w / grid, cellH = h / grid;
    for (let i = 0; i < grid; i++) {
      for (let j = 0; j < grid; j++) {
        wall.push({
          x: margin + cellW * i + cellW / 2,
          y: margin + cellH * j + cellH / 2,
          r: Math.min(cellW, cellH) * 0.38,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          alive: true
        });
      }
    }
    return wall;
  }

  function runTurn(player) {
    const phase = document.getElementById('phase');
    phase.innerHTML = `<canvas id="dartsCanvas" class="game-canvas"></canvas>`;
    canvas = document.getElementById('dartsCanvas');
    canvas.width  = Math.min(window.innerWidth - 40, 1100);
    canvas.height = Math.min(window.innerHeight - 200, 560);
    ctx = canvas.getContext('2d');

    timeUnits = TOTAL_TIME_UNITS;
    timeStart = performance.now();
    runningGame = true;
    lastThrowAt = 0;
    currentGrid = 5;
    balloons = makeWall(currentGrid);
    darts = [];

    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      mouseX = e.clientX - r.left;
      mouseY = e.clientY - r.top;
    });

    canvas.addEventListener('click', () => {
      const now = performance.now();
      if (now - lastThrowAt < 500) return; // 0.5s delay
      lastThrowAt = now;
      const sh = GameCommon.shake(11);
      const tx = mouseX + sh.x;
      const ty = mouseY + sh.y;
      const dart = { x: tx, y: ty, t: now };
      darts.push(dart);
      // collision detection
      for (const b of balloons) {
        if (!b.alive) continue;
        const dx = b.x - tx, dy = b.y - ty;
        if (dx * dx + dy * dy <= b.r * b.r) {
          b.alive = false;
          scores[currentIdx] += 1;
          AudioManager.sfx('/audio/sfx_pop.mp3', 0.6);
          refreshSide();
          break;
        }
      }
    });

    function loop(now) {
      if (!runningGame) return;
      const elapsed = now - timeStart;
      const remainUnits = Math.max(0, Math.ceil((TOTAL_TIME_UNITS * UNIT_MS - elapsed) / UNIT_MS));
      if (remainUnits !== timeUnits) {
        timeUnits = remainUnits;
        document.getElementById('timer').textContent = timeUnits;
      }
      if (timeUnits <= 0) return finishTurn();

      // grid scaling: 5 -> 7 at unit 20 (10 elapsed) -> 10 at unit 10 (20 elapsed)
      let target = 5;
      if (timeUnits <= 20) target = 7;
      if (timeUnits <= 10) target = 10;
      if (target !== currentGrid) {
        currentGrid = target;
        balloons = makeWall(currentGrid);
      }

      // Wood background
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#7a4a1a');
      grad.addColorStop(1, '#3e2410');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // wood grain
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      for (let y = 0; y < canvas.height; y += 14) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y + Math.sin(y) * 3); ctx.stroke();
      }

      // balloons
      balloons.forEach(b => {
        if (!b.alive) return;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.r * 0.85, b.r, 0, 0, Math.PI * 2);
        ctx.fill();
        // highlight
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(b.x - b.r * 0.3, b.y - b.r * 0.4, b.r * 0.2, b.r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        // string
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(b.x, b.y + b.r); ctx.lineTo(b.x, b.y + b.r + 10); ctx.stroke();
      });

      // dart marks
      const cutoff = now - 700;
      darts = darts.filter(d => d.t > cutoff);
      darts.forEach(d => {
        const a = (d.t - cutoff) / 700;
        ctx.fillStyle = `rgba(0,0,0,${0.6 * a})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,0,${a})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(d.x, d.y, 10, 0, Math.PI * 2); ctx.stroke();
      });

      // shaking cursor (more aggressive)
      const sh = GameCommon.shake(11);
      const cx = mouseX + sh.x, cy = mouseY + sh.y;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'red';
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - 30, cy); ctx.lineTo(cx + 30, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy + 30); ctx.stroke();

      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);
  }

  function finishTurn() {
    runningGame = false;
    cancelAnimationFrame(animId);
    currentIdx++;
    setTimeout(playNext, 400);
  }

  async function endGame() {
    const results = order.map((p, i) => ({ player: p, score: scores[i], won: false }));
    GameCommon.decideWinners(results);
    await GameCommon.commitResults('darts', results);
    const action = await GameCommon.showResults('Balloon Darts', results);
    if (action === 'again') {
      currentIdx = 0;
      scores = order.map(_ => 0);
      playNext();
    } else {
      window.location.href = '/games';
    }
  }

  return { start };
})();
