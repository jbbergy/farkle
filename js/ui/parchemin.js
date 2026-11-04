// Fenêtres en parchemin : bords déchirés, grain, et fenêtres qui se resserrent sur un petit écran.

import { fbm, makeCanvas, makeNoise } from '../outils.js';

// Menu et fin de partie sur un petit écran (ou avec de grands caractères) : on retire les éléments
// facultatifs (data-opt) un niveau après l’autre, jusqu’à ce que la fenêtre tienne sans défiler
export function fitModal(modal) {
  const body = modal.querySelector('.modal-body');
  const levels = Math.max(0, ...[...modal.querySelectorAll('[data-opt]')].map((e) => +e.dataset.opt));
  for (let level = 0; level <= levels; level++) {
    modal.dataset.trim = level;
    if (body.scrollHeight <= body.clientHeight + 1) return;
  }
}

// Bords déchirés des parchemins : un tracé bruité, recalculé seulement quand le panneau change de taille,
// sert de masque (--edge) au fond du parchemin. Mêmes déchirures qu’avant (environ ±4 px, grain de 30 px).
const EDGE_PAD = 6; // débord du fond autour du panneau, comme `inset: -6px` dans le CSS
const edgeNoise = makeNoise(7);
function edgeMask(w, h, seed) {
  const per = 2 * (w + h), n = Math.max(16, Math.round(per / 2.5));
  let d = '';
  for (let i = 0; i < n; i++) {
    const s = (i / n) * per;
    // point du bord, et normale vers l’extérieur
    let x, y, nx = 0, ny = 0;
    if (s < w) { x = s; y = 0; ny = -1; }
    else if (s < w + h) { x = w; y = s - w; nx = 1; }
    else if (s < 2 * w + h) { x = 2 * w + h - s; y = h; ny = 1; }
    else { x = 0; y = per - s; nx = -1; }
    const off = (fbm(edgeNoise, s * 0.035, seed * 7.3, 4) - 0.5) * 13;
    d += `${i ? 'L' : 'M'}${(EDGE_PAD + x + nx * off).toFixed(1)} ${(EDGE_PAD + y + ny * off).toFixed(1)}`;
  }
  const W = w + 2 * EDGE_PAD, H = h + 2 * EDGE_PAD;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'><path d='${d}Z'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
const edgeSizes = new WeakMap();
function roughenEdge(el) {
  const w = el.offsetWidth, h = el.offsetHeight, size = `${w}×${h}`;
  if (!w || !h || edgeSizes.get(el) === size) return;
  edgeSizes.set(el, size);
  el.style.setProperty('--edge', edgeMask(w, h, +el.dataset.edgeSeed));
}
const edgeObserver = new ResizeObserver((entries) => entries.forEach((e) => roughenEdge(e.target)));
document.querySelectorAll('.parchment').forEach((el, i) => { el.dataset.edgeSeed = i + 1; edgeObserver.observe(el); });

// Les grains du parchemin sont des SVG à filtre de turbulence : on les rend une fois en PNG, pour que
// le navigateur n’ait pas à recalculer la turbulence à chaque repeinte d’un panneau (Safari surtout).
export async function bakeParchmentNoise() {
  const root = document.documentElement, css = getComputedStyle(root);
  for (const name of ['--noise-fine', '--noise-blot']) {
    try {
      const src = css.getPropertyValue(name).trim().match(/^url\(["']?(.*?)["']?\)$/)[1];
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = makeCanvas(img.naturalWidth, img.naturalHeight), ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      // un navigateur qui n’a pas su dessiner le filtre rendrait une image vide : on garde alors le SVG
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      let alpha = 0;
      for (let i = 3; i < px.length; i += 400) alpha += px[i];
      if (!alpha) continue;
      const blob = await new Promise((r) => c.toBlob(r));
      if (blob) root.style.setProperty(name, `url(${URL.createObjectURL(blob)})`);
    } catch { /* on garde le SVG */ }
  }
}
