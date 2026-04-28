// =====================================================
// Game 3: Horse Races
// =====================================================
const GameHorses = (() => {
  const PLACE_POINTS = [15, 12, 10, 8, 5, 3, 2];
  const HORSE_COLORS = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#fff'];
  const HORSE_NAMES = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'White'];

  let players = [], scores = [];
  let raceCount = 0, totalRaces = 0;
  let lastWinner = -1;       // index of player who won previous race
  let streak = 0;            // current streak length for lastWinner

  function start() {
    players = SessionManager.players();
    if (!players.length) { window.location.href = '/'; return; }
    scores = players.map(_ => 0);
    totalRaces = players.length;
    raceCount = 0;
    refreshSide();
    pickPhase();
  }

  function refreshSide() {
    GameCommon.renderSideboard(document.getElementById('score-side'), players, scores, -1, 'Total Score');
  }

  function pickPhase() {
    const phase = document.getElementById('phase');
    phase.innerHTML = `
      <div class="text-center">
        <h3 class="ttl text-white text-shadow-strong">
          Race ${raceCount + 1} of ${totalRaces} — pick your winner
        </h3>
      </div>
      <div id="picks-host" class="row justify-content-center mt-3"></div>
      <div class="text-center mt-3">
        <button class="btn btn-carnival" id="btn-start-race" disabled>Start Race</button>
      </div>`;
    const host = document.getElementById('picks-host');
    const picks = {};

    players.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'col-md-3 col-sm-6 mb-3';
      card.innerHTML = `
        <div class="glass-card text-center">
          <div class="d-flex align-items-center gap-2 justify-content-center mb-2">
            <img src="${p.photo_path}" style="width:32px;height:32px;border-radius:50%;border:2px solid var(--primary)">
            <strong>${escapeHtml(p.username)}</strong>
          </div>
          <select class="form-select pick-input">
            <option value="">-- pick a horse --</option>
            ${HORSE_NAMES.map((n, i) => `<option value="${i}">${n}</option>`).join('')}
          </select>
        </div>`;
      host.appendChild(card);
      const sel = card.querySelector('.pick-input');
      sel.addEventListener('change', () => {
        if (sel.value === '') delete picks[idx]; else picks[idx] = parseInt(sel.value, 10);
        document.getElementById('btn-start-race').disabled = Object.keys(picks).length !== players.length;
      });
    });

    document.getElementById('btn-start-race').addEventListener('click', () => runRace(picks));
  }

  function runRace(picks) {
    const phase = document.getElementById('phase');
    const winnerIdx = Math.floor(Math.random() * 7);

    phase.innerHTML = `
      <div class="text-center mb-2">
        <h4 class="ttl text-white text-shadow-strong">And they're off!</h4>
      </div>
      <div class="horse-track" id="track" style="max-width:920px;margin:0 auto;"></div>`;
    const track = document.getElementById('track');
    const trackWidth = track.clientWidth;
    const finishX = trackWidth - 100;

    // build lanes
    const sprites = [];
    for (let i = 0; i < 7; i++) {
      const lane = document.createElement('div');
      lane.className = 'horse-lane';
      lane.style.top = (i * 64) + 'px';
      const sp = document.createElement('div');
      sp.className = 'horse-sprite';
      sp.style.background = HORSE_COLORS[i];
      sp.style.borderRadius = '20px';
      sp.style.boxShadow = 'inset -6px -6px 12px rgba(0,0,0,0.4)';
      sp.innerHTML = `<div style="font-family:'Bungee',sans-serif;color:#000;text-align:center;line-height:56px;">${HORSE_NAMES[i][0]}</div>`;
      lane.appendChild(sp);
      track.appendChild(lane);
      sprites.push({ el: sp, x: 0 });
    }
    // finish line
    const fl = document.createElement('div');
    fl.className = 'finish-line';
    track.appendChild(fl);

    // race loop: predetermined winner
    const positions = sprites.map(_ => 0);
    let finished = [];
    const raceTick = setInterval(() => {
      sprites.forEach((s, i) => {
        if (finished.includes(i)) return;
        // base random speed
        let speed = 1 + Math.random() * 4;
        // make winner consistently fast-ish
        if (i === winnerIdx) speed += 0.6;
        // keep winner from finishing too early; cap others when close to finish
        if (i !== winnerIdx && positions[i] > finishX - 50 && !finished.includes(winnerIdx)) {
          speed = Math.min(speed, 0.4);
        }
        positions[i] = Math.min(finishX, positions[i] + speed);
        s.el.style.left = positions[i] + 'px';
      });

      // detect finishers
      sprites.forEach((s, i) => {
        if (!finished.includes(i) && positions[i] >= finishX) {
          // ensure winner finishes first
          if (finished.length === 0 && i !== winnerIdx) return;
          finished.push(i);
        }
      });

      if (finished.length === 7) {
        clearInterval(raceTick);
        setTimeout(() => awardRace(finished, picks, winnerIdx), 800);
      }
    }, 60);
  }

  function awardRace(finishOrder, picks, winnerIdx) {
    // Award points based on placement
    const phase = document.getElementById('phase');
    const summary = [];
    let raceWinnerPlayer = -1;
    let raceMaxScore = -1;

    players.forEach((p, idx) => {
      const pickedHorse = picks[idx];
      const place = finishOrder.indexOf(pickedHorse); // 0..6
      let points = PLACE_POINTS[place] || 0;
      summary.push({ player: p, horse: pickedHorse, place: place + 1, points });
      scores[idx] += points;
    });

    // streak bonus: who won this race? player with HIGHEST points awarded this race
    // (ties broken by first index)
    let winners = [];
    let maxPoints = Math.max(...summary.map(s => s.points));
    if (maxPoints > 0) {
      summary.forEach((s, idx) => { if (s.points === maxPoints) winners.push(idx); });
    }

    if (winners.length === 1) {
      const w = winners[0];
      if (w === lastWinner) {
        streak++;
        // bonus: 5 * streak (per game in a row beyond first)
        if (streak >= 1) {
          const bonus = 5 * streak;
          scores[w] += bonus;
          summary[w].points += bonus;
          summary[w].streak = streak;
        }
      } else {
        lastWinner = w;
        streak = 0;
      }
    } else {
      lastWinner = -1; streak = 0;
    }

    refreshSide();

    phase.innerHTML += `
      <div class="glass-card mt-3" style="max-width:720px;margin:1rem auto;">
        <h5 class="ttl">Race Results — ${HORSE_NAMES[winnerIdx]} won!</h5>
        <table class="score-table">
          <thead><tr><th>Player</th><th>Picked</th><th>Place</th><th>Points</th></tr></thead>
          <tbody>${summary.map(s => `
            <tr>
              <td><img src="${s.player.photo_path}" class="avatar"> ${escapeHtml(s.player.username)}</td>
              <td>${HORSE_NAMES[s.horse]}</td>
              <td>${s.place}</td>
              <td><strong>${s.points}</strong>${s.streak ? ` <em style="color:var(--accent)">(+streak)</em>` : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="text-center mt-2">
          <button class="btn btn-carnival" id="btn-next-race">${(raceCount + 1) >= totalRaces ? 'Finish' : 'Next Race'}</button>
        </div>
      </div>`;

    document.getElementById('btn-next-race').addEventListener('click', () => {
      raceCount++;
      if (raceCount >= totalRaces) endGameOrTie();
      else pickPhase();
    });
  }

  function endGameOrTie() {
    const max = Math.max(...scores);
    const tied = scores.map((s, i) => s === max ? i : -1).filter(i => i >= 0);
    if (tied.length > 1 && max > 0) {
      // tiebreaker: only tied players run another race for points (we'll just append one more race)
      totalRaces++;
      pickPhase();
      return;
    }
    endGame();
  }

  async function endGame() {
    const results = players.map((p, i) => ({ player: p, score: scores[i], won: false }));
    GameCommon.decideWinners(results);
    await GameCommon.commitResults('horses', results);
    const action = await GameCommon.showResults('Horse Races', results);
    if (action === 'again') {
      raceCount = 0; totalRaces = players.length;
      scores = players.map(_ => 0);
      lastWinner = -1; streak = 0;
      pickPhase();
    } else {
      window.location.href = '/games';
    }
  }

  return { start };
})();
