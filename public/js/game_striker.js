// =====================================================
// Game 5: High Striker
// =====================================================
const GameStriker = (() => {
  let players = [], order = [], scores = [], currentIdx = 0;
  let lastPerfect = false;
  let consecutiveClose = 0;

  function start() {
    players = SessionManager.players();
    if (!players.length) { window.location.href = '/'; return; }
    scores = players.map(_ => 0);
    DiceModule.animate(document.getElementById('phase'), players, ordered => {
      order = ordered;
      scores = ordered.map(_ => 0);
      currentIdx = 0;
      playNext();
    });
  }

  function refreshSide() {
    GameCommon.renderSideboard(document.getElementById('score-side'), order, scores, currentIdx, 'Scores');
  }

  function playNext() {
    if (currentIdx >= order.length) return endGameOrTie();
    const cur = order[currentIdx];
    const phase = document.getElementById('phase');
    phase.innerHTML = `
      <div class="text-center">
        <h3 class="ttl text-white text-shadow-strong">${escapeHtml(cur.username)}'s turn</h3>
        <p class="lbl text-white">Click to stop the marker as close to the yellow target as possible.<br>
          The faster you click, the bigger your multiplier.</p>
        <button class="btn btn-carnival" id="btn-go">Swing the maze!</button>
      </div>`;
    refreshSide();
    document.getElementById('btn-go').addEventListener('click', () => runTurn(cur));
  }

  function runTurn(player) {
    const phase = document.getElementById('phase');
    phase.innerHTML = `
      <div class="text-center">
        <h4 class="ttl text-white text-shadow-strong">${escapeHtml(player.username)} — STRIKE!</h4>
        <div class="striker-tower" id="tower">
          <div class="striker-bell"></div>
          <div class="striker-puck" id="puck"></div>
        </div>
        <div class="striker-lane" id="lane">
          <div class="striker-target" id="target"></div>
          <div class="striker-marker" id="marker"></div>
        </div>
        <p class="lbl text-white mt-2" id="hint">Click anywhere when the marker hits the yellow zone!</p>
      </div>`;

    const lane = document.getElementById('lane');
    const marker = document.getElementById('marker');
    const target = document.getElementById('target');
    const puck = document.getElementById('puck');

    // place target at random position 10%..90%
    const laneWidth = lane.clientWidth;
    const targetPctX = 0.10 + Math.random() * 0.80;
    const targetX = laneWidth * targetPctX;
    target.style.left = (targetX - 11) + 'px';

    // marker oscillates back and forth
    let pos = 0;
    let dir = 1;
    const speed = 6 + Math.random() * 2; // px per tick
    const startedAt = performance.now();
    let stopped = false;

    function tick() {
      if (stopped) return;
      pos += dir * speed;
      if (pos <= 0)        { pos = 0;        dir = 1; }
      if (pos >= laneWidth){ pos = laneWidth; dir = -1; }
      marker.style.left = (pos - 5) + 'px';
      requestAnimationFrame(tick);
    }
    tick();

    function onClick(e) {
      if (stopped) return;
      stopped = true;
      const elapsed = (performance.now() - startedAt) / 1000;
      // distance metric (0..1) from target
      const distPx = Math.abs(pos - targetX);
      const distNorm = Math.min(1, distPx / (laneWidth * 0.5));
      // raw 0..100
      const raw = Math.max(0, 100 * (1 - distNorm));
      // multiplier: faster click -> higher mult (1.0 .. 2.0)
      const mult = Math.max(1.0, 2.0 - (elapsed / 8.0));
      let final = Math.round(raw * mult);

      // bonus rules
      let bonusMsg = '';
      const perfect = distPx < 8;
      const close   = distPx < 30;
      if (perfect) {
        final += 25;
        bonusMsg = 'PERFECT HIT! +25 bonus';
      } else if (close && lastPerfect) {
        final += 10;
        bonusMsg = 'On fire! +10 bonus';
      }
      if (close) {
        consecutiveClose++;
        if (consecutiveClose >= 2) {
          final += 5 * consecutiveClose;
          bonusMsg += (bonusMsg ? ' | ' : '') + `Streak x${consecutiveClose}: +${5 * consecutiveClose}`;
        }
      } else {
        consecutiveClose = 0;
      }
      lastPerfect = perfect;

      // animate puck up to height proportional to score
      const towerH = document.getElementById('tower').clientHeight;
      const heightPx = Math.min(towerH - 60, (final / 200) * (towerH - 60));
      puck.style.bottom = heightPx + 'px';
      AudioManager.sfx('/audio/sfx_strike.mp3', 0.6);

      scores[currentIdx] += final;
      refreshSide();

      const hint = document.getElementById('hint');
      hint.innerHTML = `<strong style="color:var(--accent);font-size:1.4rem;">+${final} points</strong>` +
        (bonusMsg ? `<br><em>${bonusMsg}</em>` : '') +
        `<br><button class="btn btn-carnival mt-2" id="btn-cont">Continue</button>`;
      document.removeEventListener('click', onClick);
      document.getElementById('btn-cont').addEventListener('click', () => {
        currentIdx++;
        playNext();
      });
    }

    // small delay before accepting clicks
    setTimeout(() => document.addEventListener('click', onClick), 400);
  }

  async function endGameOrTie() {
    const max = Math.max(...scores);
    const tied = scores.map((s, i) => s === max ? i : -1).filter(i => i >= 0);
    if (tied.length > 1 && max > 0) {
      // tiebreaker round: only tied players
      order = tied.map(i => order[i]);
      scores = tied.map(_ => 0);
      currentIdx = 0;
      lastPerfect = false; consecutiveClose = 0;
      playNext();
      return;
    }
    const results = order.map((p, i) => ({ player: p, score: scores[i], won: false }));
    GameCommon.decideWinners(results);
    await GameCommon.commitResults('striker', results);
    const action = await GameCommon.showResults('High Striker', results);
    if (action === 'again') {
      players = SessionManager.players();
      order = [...players];
      scores = order.map(_ => 0);
      currentIdx = 0;
      lastPerfect = false; consecutiveClose = 0;
      DiceModule.animate(document.getElementById('phase'), players, ordered => {
        order = ordered;
        scores = ordered.map(_ => 0);
        currentIdx = 0;
        playNext();
      });
    } else {
      window.location.href = '/games';
    }
  }

  return { start };
})();
