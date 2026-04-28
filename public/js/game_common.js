// =====================================================
// Common helpers for all games
// =====================================================
const GameCommon = {
  // Submit ALL session score updates at the end of a game.
  // results = [{player, score, won}]
  async commitResults(gameCode, results) {
    // map game code to id once
    const games = await API.getGames();
    const game = games.find(g => g.code === gameCode);
    if (!game) return;
    for (const r of results) {
      try {
        await API.updateScore(r.player.id, game.id, r.score, r.won);
      } catch (e) { console.error('score commit failed', e); }
      if (r.won) SessionManager.awardMedal(r.player.id);
    }
  },

  // Render side scoreboard (used by ducks/darts/memory/striker)
  renderSideboard(hostEl, players, scores, activeIdx, title = 'Scores') {
    hostEl.innerHTML = `
      <div class="glass-card">
        <h5 class="ttl mb-2">${title}</h5>
        <div id="sb-list"></div>
      </div>`;
    const list = hostEl.querySelector('#sb-list');
    players.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'row-player' + (i === activeIdx ? ' active' : '');
      row.innerHTML = `
        <img src="${p.photo_path}">
        <span class="flex-grow-1">${escapeHtml(p.username)}</span>
        <strong>${scores[i] ?? 0}</strong>
      `;
      list.appendChild(row);
    });
  },

  // End-of-game summary modal. Takes [{player, score, won}], returns Promise resolved with action ('again'|'menu')
  async showResults(gameName, results, options = {}) {
    return new Promise(resolve => {
      const winner = results.find(r => r.won);
      const sorted = [...results].sort((a, b) => b.score - a.score);
      const modal = document.createElement('div');
      modal.className = 'modal show d-block';
      modal.style.background = 'rgba(0,0,0,0.7)';
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content glass-card">
            <h2 class="ttl text-center funky-shade mb-3">${escapeHtml(gameName)} — Results</h2>
            ${winner
              ? `<p class="text-center funky" style="color:var(--accent);font-size:1.6rem">
                   Winner: ${escapeHtml(winner.player.username)} 🏆
                 </p>`
              : `<p class="text-center">No winner this round</p>`}
            <table class="score-table mb-3">
              <thead><tr><th>#</th><th>Player</th><th>Score</th></tr></thead>
              <tbody>
                ${sorted.map((r, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><img src="${r.player.photo_path}" class="avatar"> ${escapeHtml(r.player.username)}</td>
                    <td><strong>${r.score}</strong></td>
                  </tr>`).join('')}
              </tbody>
            </table>
            <div class="d-flex gap-2 justify-content-center">
              <button class="btn btn-carnival" data-act="again">Play Again</button>
              <button class="btn btn-carnival secondary" data-act="menu">Back to Games</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => {
          const action = b.dataset.act;
          modal.remove();
          resolve(action);
        });
      });
    });
  },

  decideWinners(results) {
    // returns array of indices that tied at top, mark `won` true on each
    if (!results.length) return [];
    const max = Math.max(...results.map(r => r.score));
    if (max <= 0) return [];
    results.forEach(r => r.won = (r.score === max));
    return results.filter(r => r.won);
  },

  // generic shaking cursor utility (returns an offset vector; call each frame)
  shake(intensity = 6) {
    return {
      x: (Math.random() - 0.5) * intensity * 2,
      y: (Math.random() - 0.5) * intensity * 2
    };
  }
};

if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = function(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  };
}
