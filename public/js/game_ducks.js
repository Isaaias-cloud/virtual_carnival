// =====================================================
// Game 1: Pick the Ducks
// =====================================================
const GameDucks = (() => {
  const TOTAL_TIME_UNITS = 30;            // 30 -> 0
  const UNIT_MS = 1500;                   // 1.5s real per unit -> 45s total
  let players = [];
  let order   = [];
  let scores  = [];
  let currentIdx = 0;

  // canvas state
  let canvas, ctx, animId;
  let ducks = [];
  let blackSpawned = false;
  let timeUnits = TOTAL_TIME_UNITS;
  let timeStart;
  let lastSpawnAt;
  let runningGame = false;

  const DUCKS_TYPES = {
    yellow: { color:'#ffd84d', radius:34, minSpeed:1.0, maxSpeed:2.2, points:10, weight:0.50 },
    blue:   { color:'#3498db', radius:24, minSpeed:1.6, maxSpeed:3.2, points:15, weight:0.35 },
    pink:   { color:'#ff5edf', radius:14, minSpeed:3.0, maxSpeed:4.5, points:25, weight:0.15 },
    black:  { color:'#222',    radius:14, minSpeed:9.0, maxSpeed:11.0, points:50 }
  };

  function pickDuckType() {
    const r = Math.random();
    if (r < 0.50) return 'yellow';
    if (r < 0.85) return 'blue';
    return 'pink';
  }

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

  function playNext() {
    if (currentIdx >= order.length) return endGame();
    const phase = document.getElementById('phase');
    const cur = order[currentIdx];
    phase.innerHTML = `
      <div class="text-center">
        <h3 class="ttl text-white text-shadow-strong">It's <span style="color:var(--accent)">${escapeHtml(cur.username)}</span>'s turn!</h3>
        <button class="btn btn-carnival mt-2" id="btn-go">Go!</button>
      </div>`;
    document.getElementById('btn-go').addEventListener('click', () => runTurn(cur));
    refreshSide();
  }

  function refreshSide() {
    GameCommon.renderSideboard(document.getElementById('score-side'), order, scores, currentIdx, 'Scores');
  }

  function runTurn(player) {
    const phase = document.getElementById('phase');
    phase.innerHTML = `<canvas id="duckCanvas" class="game-canvas"></canvas>`;
    canvas = document.getElementById('duckCanvas');
    canvas.width = Math.min(window.innerWidth - 40, 1100);
    canvas.height = Math.min(window.innerHeight - 200, 560);
    ctx = canvas.getContext('2d');

    ducks = [];
    blackSpawned = false;
    timeUnits = TOTAL_TIME_UNITS;
    timeStart = performance.now();
    lastSpawnAt = 0;
    runningGame = true;

    document.getElementById('timer').textContent = TOTAL_TIME_UNITS;

    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('click', () => {
      // cursor offset is what player sees so use that hit point
      const sh = GameCommon.shake(8);
      const hitX = mouseX + sh.x;
      const hitY = mouseY + sh.y;
      // find closest duck under cursor
      for (let i = ducks.length - 1; i >= 0; i--) {
        const d = ducks[i];
        const dx = d.x - hitX, dy = d.y - hitY;
        if (dx * dx + dy * dy <= d.r * d.r) {
          scores[currentIdx] += d.points;
          ducks.splice(i, 1);
          AudioManager.sfx('/audio/sfx_quack.mp3', 0.6);
          refreshSide();
          break;
        }
      }
    });

    function spawn() {
      // random duck type
      let typeKey;
      // black duck appears once per game, after a random delay
      if (!blackSpawned && timeUnits <= 22 && Math.random() < 0.04) {
        typeKey = 'black';
        blackSpawned = true;
      } else {
        typeKey = pickDuckType();
      }
      const t = DUCKS_TYPES[typeKey];
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = t.minSpeed + Math.random() * (t.maxSpeed - t.minSpeed);
      const y = 80 + Math.random() * (canvas.height - 160);
      ducks.push({
        type: typeKey,
        x: dir === 1 ? -40 : canvas.width + 40,
        y, vx: dir * speed,
        r: t.radius, color: t.color, points: t.points
      });
    }

    function loop(now) {
      if (!runningGame) return;
      // update timer
      const elapsed = now - timeStart;
      const remainUnits = Math.max(0, Math.ceil((TOTAL_TIME_UNITS * UNIT_MS - elapsed) / UNIT_MS));
      if (remainUnits !== timeUnits) {
        timeUnits = remainUnits;
        document.getElementById('timer').textContent = timeUnits;
      }
      if (timeUnits <= 0) return finishTurn(player);

      // spawn cadence (gets faster as time runs)
      const progress = 1 - (timeUnits / TOTAL_TIME_UNITS);
      const spawnInterval = Math.max(220, 900 - progress * 700);
      if (now - lastSpawnAt > spawnInterval) {
        spawn();
        lastSpawnAt = now;
      }

      // update ducks
      ducks.forEach(d => d.x += d.vx);
      ducks = ducks.filter(d => d.x > -80 && d.x < canvas.width + 80);

      // draw river (animated stripes)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#1f6feb');
      grad.addColorStop(1, '#0a3d8c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // stripes
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      const t2 = now / 30;
      for (let y = 30; y < canvas.height; y += 50) {
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 6) {
          const yy = y + Math.sin((x + t2) * 0.04) * 5;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }

      // draw ducks
      ducks.forEach(d => {
        ctx.fillStyle = d.color;
        // body
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.r * 1.2, d.r, 0, 0, Math.PI * 2);
        ctx.fill();
        // head
        const hx = d.x + (d.vx > 0 ? d.r * 0.9 : -d.r * 0.9);
        ctx.beginPath();
        ctx.arc(hx, d.y - d.r * 0.5, d.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // beak
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.arc(hx + (d.vx > 0 ? d.r * 0.5 : -d.r * 0.5), d.y - d.r * 0.5, d.r * 0.25, 0, Math.PI * 2);
        ctx.fill();
        // eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(hx + (d.vx > 0 ? 4 : -4), d.y - d.r * 0.6, d.r * 0.15, 0, Math.PI * 2);
        ctx.fill();
      });

      // shaking bullseye cursor
      const sh = GameCommon.shake(8);
      const cx = mouseX + sh.x, cy = mouseY + sh.y;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,0,0,0.9)';
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - 30, cy); ctx.lineTo(cx + 30, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy + 30); ctx.stroke();

      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);
  }

  function finishTurn(player) {
    runningGame = false;
    cancelAnimationFrame(animId);
    currentIdx++;
    setTimeout(playNext, 400);
  }

  async function endGame() {
    const results = order.map((p, i) => ({ player: p, score: scores[i], won: false }));
    GameCommon.decideWinners(results);
    await GameCommon.commitResults('ducks', results);
    const action = await GameCommon.showResults('Pick the Ducks', results);
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
