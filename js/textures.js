// Textures dessinées par le code : bois, faces des dés, cuir, pièces, flammes et halos.

import { CONFIG } from './config.js';
import { clamp, fbm, lerp, makeCanvas, makeNoise, mulberry32, roundRectPath, smoothstep } from './outils.js';
import { canvasTex } from './scene.js';
import { TANKARD_FOOT } from './decor.js';

// Auréole laissée par le pied d’une chope : un léger voile et deux arcs plus sombres, un peu décalés.
// `ring` : rayons en pixels (en largeur, en hauteur) ; `rnd` : tirage (graine du bois, ou vrai hasard).
function drawRing(c, x, y, ring, S, rnd) {
  const k = 0.97 + rnd() * 0.06, rx = ring[0] * k, ry = ring[1] * k;
  c.fillStyle = 'rgba(25,12,5,0.07)'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
  for (let j = 0; j < 2; j++) {
    const a0 = rnd() * Math.PI * 2, f = 0.96 + j * 0.05;
    c.strokeStyle = `rgba(18,8,3,${0.14 + rnd() * 0.12})`; c.lineWidth = (4 + rnd() * 7) * S;
    c.beginPath(); c.ellipse(x + (rnd() - 0.5) * 10 * S, y + (rnd() - 0.5) * 10 * S, rx * f, ry * f, 0, a0, a0 + Math.PI * (1.2 + rnd() * 0.8)); c.stroke();
  }
}

// Bois : veinage par anneaux déformés + planches, rayures, taches, usure.
// `stains` auréoles de chopes de rayon `ring` (voir drawRing), placées selon la graine.
export function generateWood({ w, h, planks, base, dark, light, seed, ring = null, grain = 16, scratches = 300, stains = 3, burns = 2, edgeShade = 0, fineLines = 150, decorate = null }) {
  const rng = mulberry32(seed);
  const nA = makeNoise(seed * 7 + 1), nB = makeNoise(seed * 13 + 5);
  const LW = w >> 1, LH = h >> 1;
  const low = makeCanvas(LW, LH), lowB = makeCanvas(LW, LH);
  const lctx = low.getContext('2d'), lbctx = lowB.getContext('2d');
  const img = lctx.createImageData(LW, LH), imgB = lbctx.createImageData(LW, LH);
  const D = img.data, DB = imgB.data;
  const ph = LH / planks;
  const P = Array.from({ length: planks }, () => ({
    tint: 0.86 + rng() * 0.26, off: rng() * 500, freq: grain * (0.75 + rng() * 0.5), phase: rng() * 10,
    joint: rng() < 0.6 ? 0.15 + rng() * 0.7 : -1,
  }));
  for (let y = 0; y < LH; y++) {
    const pi = Math.min(planks - 1, (y / ph) | 0);
    const p = P[pi];
    const py = (y - pi * ph) / ph;
    const edgeDist = Math.min(y - pi * ph, (pi + 1) * ph - y);
    for (let x = 0; x < LW; x++) {
      const px = x / LW;
      const warp = fbm(nA, px * 2.5 + p.off, py * 1.3 + p.off, 3);
      const r = py * p.freq + warp * 5.5 + nB(px * 22 + p.off, py * 5) * 0.35 + p.phase;
      const f = r - Math.floor(r);
      const ring = Math.pow(f, 4.5);
      const blot = fbm(nB, px * 5 + p.off * 0.3, py * 2.2 + pi * 3.1, 2);
      const t = ring * 0.62 + (blot - 0.5) * 0.7;
      let cr, cg, cb;
      if (t >= 0) { cr = lerp(base[0], dark[0], t); cg = lerp(base[1], dark[1], t); cb = lerp(base[2], dark[2], t); }
      else { cr = lerp(base[0], light[0], -t); cg = lerp(base[1], light[1], -t); cb = lerp(base[2], light[2], -t); }
      let shade = p.tint, hgt = 175 - ring * 55 - (blot - 0.5) * 40;
      if (edgeDist < 1.6) { shade *= 0.25 + 0.45 * (edgeDist / 1.6); hgt *= (edgeDist / 1.6) * 0.6; }
      if (p.joint > 0 && Math.abs(px - p.joint) * LW < 1.2) { shade *= 0.3; hgt *= 0.3; }
      const i = (y * LW + x) * 4;
      D[i] = cr * shade; D[i + 1] = cg * shade; D[i + 2] = cb * shade; D[i + 3] = 255;
      DB[i] = DB[i + 1] = DB[i + 2] = hgt; DB[i + 3] = 255;
    }
  }
  lctx.putImageData(img, 0, 0); lbctx.putImageData(imgB, 0, 0);

  const color = makeCanvas(w, h), bump = makeCanvas(w, h);
  const c = color.getContext('2d'), b = bump.getContext('2d');
  c.imageSmoothingQuality = 'high'; b.imageSmoothingQuality = 'high';
  c.drawImage(low, 0, 0, w, h); b.drawImage(lowB, 0, 0, w, h);
  const S = w / 2048; // échelle des détails

  // fibres fines
  const PH = h / planks;
  for (let pi = 0; pi < planks; pi++) {
    for (let k = 0; k < fineLines; k++) {
      let yy = pi * PH + 3 + rng() * (PH - 6);
      const isDark = rng() < 0.7;
      const a = 0.03 + rng() * 0.09;
      c.strokeStyle = isDark ? `rgba(${(dark[0] * 0.6) | 0},${(dark[1] * 0.6) | 0},${(dark[2] * 0.6) | 0},${a})` : `rgba(${light[0]},${light[1]},${light[2]},${a * 0.8})`;
      b.strokeStyle = isDark ? `rgba(0,0,0,${a * 1.5})` : `rgba(255,255,255,${a})`;
      c.lineWidth = b.lineWidth = (0.5 + rng() * 1.4) * S;
      const x0 = rng() * w * 0.4 - w * 0.15, len = w * (0.3 + rng() * 0.9);
      c.beginPath(); b.beginPath(); c.moveTo(x0, yy); b.moveTo(x0, yy);
      for (let x = x0; x < x0 + len; x += 30 * S) {
        yy = clamp(yy + (rng() - 0.5) * 1.2 * S, pi * PH + 2, (pi + 1) * PH - 2);
        c.lineTo(x, yy); b.lineTo(x, yy);
      }
      c.stroke(); b.stroke();
    }
  }
  // auréoles de chopes, à la taille du pied des chopes posées sur la table
  for (let i = 0; i < stains; i++) drawRing(c, rng() * w, rng() * h, ring, S, rng);
  // brûlures
  for (let i = 0; i < burns; i++) {
    const x = rng() * w, y = rng() * h, R = (25 + rng() * 45) * S;
    const g = c.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, 'rgba(8,3,1,0.55)'); g.addColorStop(0.6, 'rgba(14,6,2,0.25)'); g.addColorStop(1, 'rgba(14,6,2,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill();
  }
  // rayures et entailles
  for (let i = 0; i < scratches; i++) {
    const x = rng() * w, y = rng() * h;
    const len = (12 + Math.pow(rng(), 2.2) * 260) * S;
    const ang = rng() < 0.45 ? rng() * Math.PI * 2 : (rng() - 0.5) * 0.5 + (rng() < 0.5 ? 0 : Math.PI);
    const bend = (rng() - 0.5) * 0.5;
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    const mx = (x + ex) / 2 + Math.cos(ang + Math.PI / 2) * len * bend * 0.3, my = (y + ey) / 2 + Math.sin(ang + Math.PI / 2) * len * bend * 0.3;
    const a = 0.05 + rng() * 0.17;
    c.strokeStyle = `rgba(${light[0] + 70},${light[1] + 50},${light[2] + 35},${a})`;
    b.strokeStyle = `rgba(0,0,0,${0.25 + a * 1.5})`;
    c.lineWidth = b.lineWidth = (0.5 + rng() * 1.3) * S;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
    b.beginPath(); b.moveTo(x, y); b.quadraticCurveTo(mx, my, ex, ey); b.stroke();
  }
  // petits chocs
  for (let i = 0; i < scratches * 0.25; i++) {
    const x = rng() * w, y = rng() * h, r = (1 + rng() * 3) * S;
    c.fillStyle = `rgba(10,5,2,${0.15 + rng() * 0.2})`; c.beginPath(); c.ellipse(x, y, r * 1.6, r, rng() * 3, 0, Math.PI * 2); c.fill();
    b.fillStyle = 'rgba(0,0,0,0.5)'; b.beginPath(); b.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2); b.fill();
  }
  if (decorate) decorate(c, b, rng, w, h);
  if (edgeShade) {
    const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(8,4,1,${edgeShade})`);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  return { color, bump };
}

// Gravures du plateau : rainure de la zone de jeu, rosace au compas, marques d’angle.
export function decorateBoard(c, b, rng, w, h) {
  const ppu = w / CONFIG.board.w;
  const S = w / 2048; // tailles prévues pour une texture de 2048 px de large
  const inset = (CONFIG.board.w / 2 - CONFIG.play.halfW) * ppu;
  const groove = (off, width, alpha) => {
    const x = inset + off, y = inset + off, ww = w - 2 * x, hh = h - 2 * y, r = 18 * S;
    c.lineJoin = 'round';
    roundRectPath(c, x, y, ww, hh, r); c.strokeStyle = `rgba(12,6,2,${alpha})`; c.lineWidth = width; c.stroke();
    roundRectPath(c, x + width * 0.55, y + width * 0.55, ww - width * 1.1, hh - width * 1.1, r);
    c.strokeStyle = `rgba(235,180,120,${alpha * 0.16})`; c.lineWidth = Math.max(1, width * 0.3); c.stroke();
    b.save(); b.filter = `blur(${1.5 * S}px)`; roundRectPath(b, x, y, ww, hh, r); b.strokeStyle = '#000'; b.lineWidth = width; b.stroke(); b.restore();
  };
  groove(0, 8 * S, 0.75);
  groove(18 * S, 3 * S, 0.5);
  // rosace hexapétale (« marque de sorcière » tracée au compas)
  const cx = w / 2, cy = h / 2, R = 1.15 * ppu;
  const daisy = (ctx, stroke, lw) => {
    ctx.save(); ctx.strokeStyle = stroke; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      ctx.beginPath(); ctx.arc(cx + R * Math.cos(a), cy + R * Math.sin(a), R, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  };
  daisy(c, 'rgba(14,7,3,0.3)', 3.5 * S);
  b.save(); b.filter = `blur(${S}px)`; daisy(b, 'rgba(0,0,0,0.8)', 4 * S); b.restore();
  // cercles pointés dans les angles (même motif que les dés)
  const m = inset + 48 * S;
  for (const [x, y] of [[m, m], [w - m, m], [m, h - m], [w - m, h - m]]) {
    for (const ctx of [c, b]) {
      ctx.strokeStyle = ctx === c ? 'rgba(14,7,3,0.5)' : '#000'; ctx.lineWidth = 3 * S;
      ctx.beginPath(); ctx.arc(x, y, 11 * S, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(x, y, 3.5 * S, 0, Math.PI * 2); ctx.fill();
    }
  }
  // une à trois auréoles de chopes, tirées au vrai hasard à chaque chargement, n’importe où dans l’aire de jeu
  const foot = TANKARD_FOOT * ppu, n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const x = inset + foot + Math.random() * (w - 2 * (inset + foot)), y = inset + foot + Math.random() * (h - 2 * (inset + foot));
    drawRing(c, x, y, [foot, foot], S, Math.random);
  }
}

// Faces des dés : os poli jauni, fibres, crasse dans les angles, points creusés et encrés.
const PIP_LAYOUT = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.27, 0.5], [0.27, 0.75], [0.73, 0.25], [0.73, 0.5], [0.73, 0.75]],
};
// `ink` : couleur des points d’un dé spécial (sinon brou presque noir) ; `b` : relief, facultatif.
// Points pleins et larges, pour se lire de loin et sur un petit écran ; le 1, plus gros, garde un cercle gravé autour.
export function drawPips(c, b, v, S, ink = null) {
  const big = v === 1;
  for (const [px, py] of PIP_LAYOUT[v]) {
    const x = px * S, y = py * S;
    const R = (big ? 0.13 : 0.088) * S;
    // couleur : creux encré, avec un reflet sur le bord bas
    c.strokeStyle = 'rgba(255,248,230,0.45)'; c.lineWidth = 0.012 * S;
    c.beginPath(); c.arc(x, y, R + 0.01 * S, 0.1 * Math.PI, 0.6 * Math.PI); c.stroke();
    if (ink) c.fillStyle = ink;
    else {
      const g = c.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R);
      g.addColorStop(0, '#0b0503'); g.addColorStop(0.8, '#1c0e05'); g.addColorStop(1, '#3a2312');
      c.fillStyle = g;
    }
    c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fill();
    if (big) {
      c.lineWidth = 0.014 * S; c.strokeStyle = ink || 'rgba(46,26,12,0.85)';
      c.beginPath(); c.arc(x, y, R * 1.45, 0, Math.PI * 2); c.stroke();
    }
    // relief : creux
    if (!b) continue;
    b.save(); b.filter = `blur(${S / 256}px)`;
    b.fillStyle = '#000'; b.beginPath(); b.arc(x, y, R, 0, Math.PI * 2); b.fill();
    if (big) { b.strokeStyle = '#000'; b.lineWidth = 0.016 * S; b.beginPath(); b.arc(x, y, R * 1.45, 0, Math.PI * 2); b.stroke(); }
    b.restore();
  }
}
// Rend aussi l’os nu, sans les points (colorBase, bumpBase), que les dés spéciaux teintent et gravent à leur façon.
export function generateDieFaces(seed, S = 512) {
  const L = S / 2, k = S / 512;
  const rng = mulberry32(seed);
  const nz = makeNoise(seed + 3), nz2 = makeNoise(seed + 9);
  const color = {}, bump = {}, colorBase = {}, bumpBase = {};
  for (let v = 1; v <= 6; v++) {
    const low = makeCanvas(L, L), lctx = low.getContext('2d');
    const img = lctx.createImageData(L, L), D = img.data;
    const ang = rng() * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang), o = v * 17.3;
    for (let y = 0; y < L; y++) {
      for (let x = 0; x < L; x++) {
        const u = x / L, w = y / L;
        const al = u * ca + w * sa, ac = -u * sa + w * ca;
        const fiber = fbm(nz, al * 2.5 + o, ac * 38 + o, 2);
        const patch = fbm(nz2, u * 2.6 + o, w * 2.6 - o, 3);
        const speck = nz2(x * 0.7 + o * 9, y * 0.7);
        const e = Math.min(u, 1 - u, w, 1 - w);
        const grime = 1 - smoothstep(0, 0.16, e);
        const yel = clamp(patch * 0.9 + fiber * 0.5 - 0.45, 0, 1);
        const s = (speck - 0.5) * 18 + (fiber - 0.5) * 16;
        const i = (y * L + x) * 4;
        D[i] = 238 - yel * 26 - grime * 60 + s;
        D[i + 1] = 228 - yel * 36 - grime * 70 + s;
        D[i + 2] = 204 - yel * 58 - grime * 80 + s * 0.9;
        D[i + 3] = 255;
      }
    }
    lctx.putImageData(img, 0, 0);
    const cc = makeCanvas(S, S), c = cc.getContext('2d');
    c.drawImage(low, 0, 0, S, S);
    const bc = makeCanvas(S, S), b = bc.getContext('2d');
    b.fillStyle = '#c8c8c8'; b.fillRect(0, 0, S, S);
    // fines fêlures de l’os
    for (let k = 0; k < 9; k++) {
      let x = rng() * S, y = rng() * S;
      const a = rng() * Math.PI * 2, n = 3 + ((rng() * 5) | 0);
      c.strokeStyle = `rgba(90,60,35,${0.12 + rng() * 0.15})`; b.strokeStyle = 'rgba(0,0,0,0.35)';
      c.lineWidth = b.lineWidth = (0.6 + rng() * 0.8) * k;
      c.beginPath(); b.beginPath(); c.moveTo(x, y); b.moveTo(x, y);
      for (let j = 0; j < n; j++) {
        x += Math.cos(a + (rng() - 0.5) * 0.9) * 9 * k; y += Math.sin(a + (rng() - 0.5) * 0.9) * 9 * k;
        c.lineTo(x, y); b.lineTo(x, y);
      }
      c.stroke(); b.stroke();
    }
    colorBase[v] = makeCanvas(S, S); colorBase[v].getContext('2d').drawImage(cc, 0, 0);
    bumpBase[v] = makeCanvas(S, S); bumpBase[v].getContext('2d').drawImage(bc, 0, 0);
    drawPips(c, b, v, S);
    color[v] = cc; bump[v] = bc;
  }
  return { color, bump, colorBase, bumpBase };
}
// Tête cornue gravée à la place d’un chiffre (joker du Dé du Cornu)
export function drawHorns(c, b, S, ink) {
  const k = S / 100;
  for (const ctx of b ? [c, b] : [c]) {
    const col = ctx === c ? ink : '#000';
    ctx.save();
    if (ctx === b) ctx.filter = `blur(${S / 256}px)`;
    ctx.fillStyle = ctx.strokeStyle = col;
    // cornes
    ctx.beginPath();
    ctx.moveTo(38 * k, 46 * k); ctx.quadraticCurveTo(23 * k, 37 * k, 22 * k, 14 * k); ctx.quadraticCurveTo(33 * k, 31 * k, 46 * k, 40 * k); ctx.closePath();
    ctx.moveTo(62 * k, 46 * k); ctx.quadraticCurveTo(77 * k, 37 * k, 78 * k, 14 * k); ctx.quadraticCurveTo(67 * k, 31 * k, 54 * k, 40 * k); ctx.closePath();
    ctx.fill();
    // tête
    ctx.lineWidth = 3.2 * k;
    ctx.beginPath(); ctx.ellipse(50 * k, 57 * k, 17 * k, 19 * k, 0, 0, Math.PI * 2); ctx.stroke();
    // yeux en amande et sourire
    ctx.beginPath(); ctx.ellipse(43 * k, 53 * k, 4.2 * k, 2.4 * k, 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(57 * k, 53 * k, 4.2 * k, 2.4 * k, -0.45, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2.6 * k;
    ctx.beginPath(); ctx.arc(50 * k, 60 * k, 8 * k, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.restore();
  }
}
// Les six faces d’un dé réunies dans une texture de 3 × 2 cases (face « 1 » en haut à gauche) :
// un seul matériau par dé, donc un seul appel de dessin au lieu de six.
// `urls` : images personnalisées (index 0 = face « 1 »), sinon les faces procédurales `canvases`.
export function faceAtlas(urls, canvases, isColor) {
  if (!urls && !canvases) return null;
  const S = canvases ? canvases[1].width : 512;
  const atlas = makeCanvas(3 * S, 2 * S), ctx = atlas.getContext('2d');
  const tex = canvasTex(atlas, isColor);
  for (let v = 1; v <= 6; v++) {
    const x = ((v - 1) % 3) * S, y = (((v - 1) / 3) | 0) * S;
    if (!urls) { ctx.drawImage(canvases[v], x, y); continue; }
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, x, y, S, S); tex.needsUpdate = true; };
    img.src = urls[v - 1];
  }
  return tex;
}

export function generateLeather(seed) {
  const w = 1024, h = 166;
  const nz = makeNoise(seed), nz2 = makeNoise(seed + 1);
  const color = makeCanvas(w, h), bump = makeCanvas(w, h);
  const c = color.getContext('2d'), b = bump.getContext('2d');
  const img = c.createImageData(w, h), imgB = b.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const patch = fbm(nz, x / 160, y / 160, 3);
      const pore = nz2(x * 0.45, y * 0.45);
      const e = Math.min(x, w - x, y, h - y);
      const edge = 1 - smoothstep(0, 22, e);
      const k = 0.8 + patch * 0.45 - edge * 0.45 + (pore - 0.5) * 0.12;
      const i = (y * w + x) * 4;
      img.data[i] = 96 * k; img.data[i + 1] = 54 * k; img.data[i + 2] = 30 * k; img.data[i + 3] = 255;
      imgB.data[i] = imgB.data[i + 1] = imgB.data[i + 2] = 150 + (pore - 0.5) * 90 + patch * 40 - edge * 60; imgB.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0); b.putImageData(imgB, 0, 0);
  for (const ctx of [c, b]) {
    ctx.setLineDash([9, 7]); ctx.lineWidth = 2.2;
    ctx.strokeStyle = ctx === c ? 'rgba(214,176,120,0.75)' : '#fff';
    roundRectPath(ctx, 14, 14, w - 28, h - 28, 10); ctx.stroke();
    ctx.setLineDash([]);
  }
  return { color, bump };
}

export function generateCoinFace() {
  const S = 128, c = makeCanvas(S, S), x = c.getContext('2d');
  x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, S, S);
  x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.arc(64, 64, 52, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2; for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; x.beginPath(); x.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); x.lineTo(64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48); x.stroke(); }
  x.lineWidth = 9; x.beginPath(); x.moveTo(64, 30); x.lineTo(64, 98); x.moveTo(30, 64); x.lineTo(98, 64); x.stroke();
  x.fillStyle = '#fff'; for (const [a, b] of [[44, 44], [84, 44], [44, 84], [84, 84]]) { x.beginPath(); x.arc(a, b, 5, 0, Math.PI * 2); x.fill(); }
  return c;
}

export function generateFlame() {
  const c = makeCanvas(64, 128), x = c.getContext('2d');
  const g = x.createRadialGradient(32, 92, 2, 32, 80, 60);
  g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.2, 'rgba(255,236,170,1)');
  g.addColorStop(0.45, 'rgba(255,170,70,0.85)'); g.addColorStop(0.75, 'rgba(255,90,20,0.25)'); g.addColorStop(1, 'rgba(255,60,0,0)');
  x.fillStyle = g;
  x.beginPath(); x.moveTo(32, 4);
  x.bezierCurveTo(46, 40, 60, 74, 50, 102); x.bezierCurveTo(44, 124, 20, 124, 14, 102);
  x.bezierCurveTo(4, 74, 18, 40, 32, 4); x.fill();
  const bl = x.createRadialGradient(32, 106, 0, 32, 106, 12);
  bl.addColorStop(0, 'rgba(90,120,255,0.55)'); bl.addColorStop(1, 'rgba(90,120,255,0)');
  x.fillStyle = bl; x.fillRect(0, 90, 64, 30);
  return c;
}
export function generateGlow(inner = 'rgba(255,170,90,0.75)') {
  const c = makeCanvas(128, 128), x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(0.35, 'rgba(255,120,40,0.22)'); g.addColorStop(1, 'rgba(255,90,20,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return c;
}
