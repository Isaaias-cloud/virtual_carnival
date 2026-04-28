// =====================================================
// Game 4: Scam Memory Cups
// =====================================================
const GameMemory = (() => {
  const STARTING_MONEY = 1000;
  const TRIES_PER_TURN = 4;

  let players = [], order = [], money = [], currentIdx = 0;
  let triesLeft = 0;
  let triesPerTurn = TRIES_PER_TURN;

  function start() {
    players = SessionManager.players();
    if (!players.length) { window.location.href = '/'; return; }
    money = players.map(_ => STARTING_MONEY);
    DiceModule.animate(document.getElementById('phase'), players, ordered => {
      order = ordered;
      // remap money index to follow `order`
      money = ordered.map(p => STARTING_MONEY);
      currentIdx = 0;
      playNext();
    });
  }

  function refreshSide() {
    GameCommon.renderSideboard(document.getElementById('score-side'), order, money, currentIdx, 'Bankroll');
  }

  function moneyFmt(v) { return '$' + v; }

  function playNext() {
    if (currentIdx >= order.length) return endRoundOrFinish();
    const cur = order[currentIdx];
    if (money[currentIdx] <= 0) {
      // bankrupt - skip
      currentIdx++;
      return playNext();
    }
    triesLeft = triesPerTurn;
    refreshSide();
    document.getElementById('bankroll').textContent = '$' + money[currentIdx];
    runTry(cur);
  }

  function runTry(player) {
    if (triesLeft <= 0 || money[currentIdx] <= 0) {
      currentIdx++;
      return playNext();
    }
    const phase = document.getElementById('phase');
    phase.innerHTML = `
      <div class="text-center">
        <h4 class="ttl text-white text-shadow-strong">${escapeHtml(player.username)} — try ${triesPerTurn - triesLeft + 1}/${triesPerTurn}</h4>
        <p class="lbl text-white">Bankroll: <strong style="color:var(--accent)">$${money[currentIdx]}</strong></p>
        <div class="d-inline-block glass-card">
          <label class="lbl">Bet amount</label>
          <input type="number" id="bet-input" class="form-control mb-2" min="1" max="${money[currentIdx]}" value="${Math.min(100, money[currentIdx])}">
          <button class="btn btn-carnival" id="btn-place-bet">Place Bet</button>
        </div>
      </div>
      <div id="cup-area" class="mt-3"></div>`;
    document.getElementById('btn-place-bet').addEventListener('click', () => {
      const v = parseInt(document.getElementById('bet-input').value, 10);
      if (!v || v <= 0 || v > money[currentIdx]) { alert('Invalid bet'); return; }
      runShuffle(player, v);
    });
  }

  function runShuffle(player, bet) {
    const area = document.getElementById('cup-area');
    area.innerHTML = `<div class="cup-table" id="cup-table">
      <div class="ball" id="ball" style="left:330px"></div>
      <div class="cup" id="cup-0" style="left:40px"></div>
      <div class="cup" id="cup-1" style="left:280px"></div>
      <div class="cup" id="cup-2" style="left:520px"></div>
    </div>
    <p class="lbl text-center text-white">Watch carefully...</p>`;

    const cups = [
      document.getElementById('cup-0'),
      document.getElementById('cup-1'),
      document.getElementById('cup-2')
    ];
    const ball = document.getElementById('ball');
    const positions = [40, 280, 520];

    // Step 1: lift middle cup, ball appears under
    setTimeout(() => {
      cups[1].classList.add('lifted');
      ball.style.left = (positions[1] + 50) + 'px';
    }, 500);

    setTimeout(() => {
      cups[1].classList.remove('lifted');
      ball.style.opacity = '0';
    }, 1700);

    // Step 2: shuffle a few times
    let order = [0, 1, 2];
    let shuffleCount = 0;
    const maxShuffles = 6;

    function shuffleOnce() {
      // pick two cups to swap
      const i = Math.floor(Math.random() * 3);
      let j = Math.floor(Math.random() * 3);
      while (j === i) j = Math.floor(Math.random() * 3);

      // swap their array positions
      [order[i], order[j]] = [order[j], order[i]];
      cups[order[i]].style.left = positions[i] + 'px';
      cups[order[j]].style.left = positions[j] + 'px';
      shuffleCount++;
      if (shuffleCount < maxShuffles) setTimeout(shuffleOnce, 650);
      else setTimeout(showPickPhase, 700);
    }
    setTimeout(shuffleOnce, 2200);

    function showPickPhase() {
      // disclose: ball is under a RANDOM cup (the scam)
      const correctCup = Math.floor(Math.random() * 3);
      cups.forEach((c, idx) => {
        c.style.cursor = 'pointer';
        c.onclick = () => revealOutcome(idx, correctCup, bet);
      });
      const lbl = area.querySelector('p');
      lbl.innerHTML = '<strong>Pick a cup!</strong>';
    }
  }

  function revealOutcome(picked, correctCup, bet) {
    const cups = [
      document.getElementById('cup-0'),
      document.getElementById('cup-1'),
      document.getElementById('cup-2')
    ];
    const ball = document.getElementById('ball');
    const positions = [40, 280, 520];

    cups.forEach(c => c.onclick = null);
    // ball appears under correctCup's CURRENT position
    const correctEl = cups[correctCup];
    const leftPx = parseInt(correctEl.style.left, 10);
    ball.style.left = (leftPx + 50) + 'px';
    ball.style.opacity = '1';
    correctEl.classList.add('lifted');

    const win = (picked === correctCup);
    if (win) {
      money[currentIdx] += bet;
      AudioManager.sfx('/audio/sfx_win.mp3', 0.6);
    } else {
      money[currentIdx] -= bet;
      AudioManager.sfx('/audio/sfx_lose.mp3', 0.6);
    }
    refreshSide();
    document.getElementById('bankroll').textContent = '$' + money[currentIdx];

    const overlay = document.createElement('div');
    overlay.className = 'glass-card text-center mt-3';
    overlay.style.maxWidth = '420px';
    overlay.style.margin = '1rem auto';
    overlay.innerHTML = `
      <h4 class="ttl funky" style="color:${win ? 'var(--accent)' : '#ff5252'}">${win ? 'You won!' : 'You lost!'}</h4>
      <p class="lbl">Bankroll: <strong>$${money[currentIdx]}</strong></p>
      <button class="btn btn-carnival" id="btn-cont">Continue</button>`;
    document.getElementById('cup-area').appendChild(overlay);
    overlay.querySelector('#btn-cont').addEventListener('click', () => {
      triesLeft--;
      runTry(order[currentIdx]);
    });
  }

  async function endRoundOrFinish() {
    const max = Math.max(...money);
    if (max <= 0) {
      // all bankrupt, nobody wins
      const results = order.map((p, i) => ({ player: p, score: money[i], won: false }));
      await GameCommon.commitResults('memory', results);
      const action = await GameCommon.showResults('Scam Memory', results);
      return (action === 'again') ? restart() : window.location.href = '/games';
    }
    const tied = money.map((m, i) => m === max ? i : -1).filter(i => i >= 0);
    if (tied.length > 1) {
      // tiebreaker round: only tied players, 1 try each, fresh small bankroll equal to current
      order = tied.map(i => order[i]);
      money = tied.map(i => money[i]);
      currentIdx = 0;
      triesPerTurn = 1;
      playNext();
      return;
    }
    // single winner
    const results = order.map((p, i) => ({ player: p, score: money[i], won: false }));
    GameCommon.decideWinners(results);
    await GameCommon.commitResults('memory', results);
    const action = await GameCommon.showResults('Scam Memory', results);
    if (action === 'again') restart();
    else window.location.href = '/games';
  }

  function restart() {
    money = order.map(_ => STARTING_MONEY);
    triesPerTurn = TRIES_PER_TURN;
    currentIdx = 0;
    playNext();
  }

  return { start };
})();
