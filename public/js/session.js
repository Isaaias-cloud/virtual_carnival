// =====================================================
// SessionManager: keeps current players + medals in memory + localStorage
// =====================================================
const SessionManager = {
  KEY: 'carnival_session',

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return { players: [], medals: {}, gameOrder: [] };
      return JSON.parse(raw);
    } catch (e) { return { players: [], medals: {}, gameOrder: [] }; }
  },

  save(state) {
    localStorage.setItem(this.KEY, JSON.stringify(state));
  },

  reset() {
    localStorage.removeItem(this.KEY);
  },

  state() {
    if (!this._state) this._state = this.load();
    return this._state;
  },

  setPlayers(players) {
    const s = this.state();
    s.players = players;
    if (!s.medals) s.medals = {};
    players.forEach(p => { if (!(p.id in s.medals)) s.medals[p.id] = 0; });
    this.save(s);
  },

  addPlayer(player) {
    const s = this.state();
    if (s.players.find(p => p.id === player.id)) return;
    s.players.push(player);
    if (!(player.id in s.medals)) s.medals[player.id] = 0;
    this.save(s);
  },

  removePlayer(id) {
    const s = this.state();
    s.players = s.players.filter(p => p.id !== id);
    delete s.medals[id];
    this.save(s);
  },

  awardMedal(playerId) {
    const s = this.state();
    s.medals[playerId] = (s.medals[playerId] || 0) + 1;
    this.save(s);
  },

  players() { return this.state().players; },
  medals()  { return this.state().medals;  }
};
