// =====================================================
// Palette switcher (persisted)
// =====================================================
const PALETTES = ['pink', 'fuchsia', 'bluepurple', 'mint', 'dark'];

const PaletteManager = {
  KEY: 'carnival_palette',
  apply(name) {
    if (!PALETTES.includes(name)) name = 'pink';
    document.body.dataset.palette = name === 'pink' ? '' : name;
    localStorage.setItem(this.KEY, name);
    document.querySelectorAll('.palette-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.palette === name);
    });
  },
  current() {
    return localStorage.getItem(this.KEY) || 'pink';
  },
  init() {
    this.apply(this.current());
  }
};

document.addEventListener('DOMContentLoaded', () => PaletteManager.init());
