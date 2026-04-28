// =====================================================
// AudioManager: page music + small SFX
// =====================================================
const AudioManager = {
  bgm: null,
  init(src, volume = 0.4) {
    if (this.bgm) { try { this.bgm.pause(); } catch(e) {} }
    if (!src) return;
    this.bgm = new Audio(src);
    this.bgm.loop = true;
    this.bgm.volume = volume;
    // Browsers block autoplay until user interacts
    const tryPlay = () => {
      this.bgm.play().catch(() => {});
      document.removeEventListener('click', tryPlay);
      document.removeEventListener('keydown', tryPlay);
    };
    this.bgm.play().catch(() => {
      document.addEventListener('click', tryPlay,    { once: true });
      document.addEventListener('keydown', tryPlay,  { once: true });
    });
  },
  stop() {
    if (this.bgm) { try { this.bgm.pause(); } catch(e) {} this.bgm = null; }
  },
  sfx(src, volume = 0.6) {
    if (!src) return;
    const a = new Audio(src);
    a.volume = volume;
    a.play().catch(() => {});
  }
};
