// =====================================================
// API helpers
// =====================================================
const API = {
  async getGames()              { return (await fetch('/api/games')).json(); },
  async getPlayers()            { return (await fetch('/api/players')).json(); },
  async getPlayer(id)           { return (await fetch(`/api/players/${id}`)).json(); },
  async getPlayerByUsername(u)  {
    const r = await fetch(`/api/players/by_username/${encodeURIComponent(u)}`);
    if (!r.ok) return null;
    return r.json();
  },
  async createPlayer(username) {
    const r = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    return r.json();
  },
  async renamePlayer(id, username) {
    const r = await fetch(`/api/players/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    return r.json();
  },
  async uploadPhoto(id, file) {
    const fd = new FormData();
    fd.append('photo', file);
    const r = await fetch(`/api/players/${id}/photo`, { method: 'POST', body: fd });
    return r.json();
  },
  async updateScore(playerId, gameId, score, won) {
    const r = await fetch(`/api/players/${playerId}/scores`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: gameId, score, won: !!won })
    });
    return r.json();
  },
  async resetScores(id)  { return (await fetch(`/api/players/${id}/scores`, { method: 'DELETE' })).json(); },
  async deletePlayer(id) { return (await fetch(`/api/players/${id}`,        { method: 'DELETE' })).json(); },
  async scoreboard(code) { return (await fetch(`/api/scoreboard/${code}`)).json(); },
  async allScoreboards() { return (await fetch('/api/scoreboards')).json(); }
};
