// =====================================================
// 18-sided dice for turn order. Returns ordered array of players.
// =====================================================
const DiceModule = {
  rollOrder(players) {
    const rolls = players.map(p => ({ player: p, roll: Math.floor(Math.random() * 18) + 1 }));
    // Sort desc; ties broken randomly
    rolls.sort((a, b) => {
      if (b.roll !== a.roll) return b.roll - a.roll;
      return Math.random() - 0.5;
    });
    return rolls;
  },

  // Animated dice display. callback(playerOrder) when done.
  // hostEl: container (cleared and used). players: array.
  animate(hostEl, players, callback) {
    hostEl.innerHTML = `
      <h2 class="ttl mb-3" style="color:#fff;text-shadow:2px 2px 0 var(--primary-strong);">
        Rolling for turn order...
      </h2>
      <div id="dice-list" class="d-flex flex-wrap gap-3 justify-content-center"></div>
      <button id="dice-continue" class="btn btn-carnival mt-4" disabled>Continue</button>
    `;
    const list = hostEl.querySelector('#dice-list');
    const result = this.rollOrder(players);

    result.forEach(r => {
      const card = document.createElement('div');
      card.className = 'glass-card text-center';
      card.style.minWidth = '180px';
      card.innerHTML = `
        <div class="d-flex align-items-center gap-2 justify-content-center mb-2">
          <img src="${r.player.photo_path}" class="rounded-circle" style="width:36px;height:36px;object-fit:cover;border:2px solid var(--primary)">
          <strong>${escapeHtml(r.player.username)}</strong>
        </div>
        <div class="dice-face dice-rolling">?</div>
      `;
      list.appendChild(card);
      const face = card.querySelector('.dice-face');
      let ticks = 0;
      const iv = setInterval(() => {
        face.textContent = (Math.floor(Math.random() * 18) + 1);
        ticks++;
        if (ticks > 20 + Math.floor(Math.random() * 10)) {
          clearInterval(iv);
          face.classList.remove('dice-rolling');
          face.textContent = r.roll;
        }
      }, 60);
    });

    // After ~3s, enable continue
    setTimeout(() => {
      const btn = hostEl.querySelector('#dice-continue');
      btn.disabled = false;
      btn.addEventListener('click', () => callback(result.map(r => r.player)));
    }, 2800);
  }
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}
