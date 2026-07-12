let cameraX = 0;
let cameraY = 0;
let hitFreezeTimer = 0;
let screenShakeTimer = 0;
let screenShakeMag = SCREEN_SHAKE_MAG; // can be overridden for big hits, decays per-frame

// Mario-style death sequence
const death = {
  active: false,
  timer: 0,       // counts up
  freezeEnd: 40,  // frames frozen before pop
  popVy: -8,      // initial upward velocity
  vy: 0,
  y: 0,           // player y during death fall
  x: 0,
};

// Water zone: player swims freely inside this rectangle
const WORLD_OFFSET_Y = 250;
const WATER_ZONE = { x: 1700, y: 230 + WORLD_OFFSET_Y, w: 2540, h: 600 };
// The seafloor/rock shelf that closes the bottom
const WATER_FLOOR_Y = WATER_ZONE.y + WATER_ZONE.h;

// Second land section ground level
const LAND2_Y = 210 + WORLD_OFFSET_Y;

// Second water zone: deep pool Edgar sits next to — swimmable, orange guarded at the bottom
const WATER_ZONE_2 = { x: 4480, y: 230 + WORLD_OFFSET_Y, w: 500, h: 700 };
const WATER_FLOOR_Y_2 = WATER_ZONE_2.y + WATER_ZONE_2.h;

const platforms = [
  // upper ground (original section)
  { x: -200, y: 210 + WORLD_OFFSET_Y, w: 1900, h: 400, color: '#3d2b1f' },
  // fill the 20px notch where land meets water zone wall
  { x: 1700, y: 210 + WORLD_OFFSET_Y, w: 40, h: 20, color: '#3d2b1f' },
  // floating platforms (original)
  { x: 80,   y: 155 + WORLD_OFFSET_Y, w: 110, h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 230,  y: 135 + WORLD_OFFSET_Y, w: 110, h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 370,  y: 115 + WORLD_OFFSET_Y, w: 100, h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 500,  y: 145 + WORLD_OFFSET_Y, w: 120, h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 650,  y: 120 + WORLD_OFFSET_Y, w: 105, h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 790,  y:  95 + WORLD_OFFSET_Y, w: 100, h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 920,  y: 128 + WORLD_OFFSET_Y, w: 110, h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 1060, y: 105 + WORLD_OFFSET_Y, w: 105, h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 1200, y: 135 + WORLD_OFFSET_Y, w: 110, h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 1340, y: 110 + WORLD_OFFSET_Y, w: 120, h: 8,  color: '#5c3d2e', oneWay: true },
  // step-down ledges leading into the water
  { x: 1700, y: 235 + WORLD_OFFSET_Y, w: 110, h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 1820, y: 260 + WORLD_OFFSET_Y, w: 110, h: 8,  color: '#5c3d2e', oneWay: true },
  // seafloor solid rock — closes the bottom of the water zone
  { x: WATER_ZONE.x, y: WATER_FLOOR_Y, w: WATER_ZONE.w, h: 80, color: '#1a1a2e' },
  // underwater rock shelves / ledges
  { x: 1850, y: 620 + WORLD_OFFSET_Y, w: 120, h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2050, y: 560 + WORLD_OFFSET_Y, w: 100, h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2220, y: 500 + WORLD_OFFSET_Y, w: 110, h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2400, y: 570 + WORLD_OFFSET_Y, w: 90,  h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2580, y: 520 + WORLD_OFFSET_Y, w: 100, h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2760, y: 590 + WORLD_OFFSET_Y, w: 110, h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2940, y: 540 + WORLD_OFFSET_Y, w: 90,  h: 8,  color: '#1e2a3a', oneWay: true },
  // left wall closing the water zone
  { x: WATER_ZONE.x - 40, y: WATER_ZONE.y, w: 40, h: WATER_ZONE.h + 80, color: '#1a1a2e' },
  // right wall closing the water zone
  { x: WATER_ZONE.x + WATER_ZONE.w, y: WATER_ZONE.y, w: 40, h: WATER_ZONE.h + 80, color: '#1a1a2e' },

  // ── Second land section ──────────────────────────────────────────────────
  // Left land chunk: right wall of water zone up to the pool
  { x: 4240, y: LAND2_Y, w: WATER_ZONE_2.x - 4240, h: 400, color: '#3d2b1f' },
  // Right land chunk: after the pool onward
  { x: WATER_ZONE_2.x + WATER_ZONE_2.w, y: LAND2_Y, w: 1200, h: 400, color: '#3d2b1f' },
  // Floor of the pool
  { x: WATER_ZONE_2.x, y: WATER_FLOOR_Y_2, w: WATER_ZONE_2.w, h: 80, color: '#1a1a2e' },
  // Left wall of the pool
  { x: WATER_ZONE_2.x - 20, y: WATER_ZONE_2.y, w: 20, h: WATER_ZONE_2.h + 80, color: '#1a1a2e' },
  // Right wall of the pool
  { x: WATER_ZONE_2.x + WATER_ZONE_2.w, y: WATER_ZONE_2.y, w: 20, h: WATER_ZONE_2.h + 80, color: '#1a1a2e' },
  // Ledges inside pool so player can climb out in stages
  { x: WATER_ZONE_2.x + 10,                  y: WATER_ZONE_2.y + 540, w: 70, h: 8, color: '#1e2a3a', oneWay: true },
  { x: WATER_ZONE_2.x + WATER_ZONE_2.w - 80, y: WATER_ZONE_2.y + 380, w: 70, h: 8, color: '#1e2a3a', oneWay: true },
  { x: WATER_ZONE_2.x + 20,                  y: WATER_ZONE_2.y + 230, w: 60, h: 8, color: '#1e2a3a', oneWay: true },
  { x: WATER_ZONE_2.x + WATER_ZONE_2.w - 80, y: WATER_ZONE_2.y + 110, w: 70, h: 8, color: '#1e2a3a', oneWay: true },
];

const WORLD_W = 6100;

// shooting stars
const _bgShoots = [];
let _bgShootCooldown = 0;

function _tickShoots() {
  _bgShootCooldown--;
  if (_bgShootCooldown <= 0) {
    // spawn from top-right area, travel down-left at a shallow angle
    const startX = VIEW_W * 0.3 + Math.random() * VIEW_W * 0.8;
    const startY = Math.random() * VIEW_H * 0.45;
    const spd    = 2.5 + Math.random() * 2.5;
    const angle  = Math.PI * (0.75 + Math.random() * 0.15); // mostly left, slightly down
    _bgShoots.push({
      x: startX, y: startY,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd * 0.35,
      life: 28 + Math.floor(Math.random() * 18),
      maxLife: 46,
      len: 6 + Math.floor(Math.random() * 7),
    });
    _bgShootCooldown = 600 + Math.floor(Math.random() * 600); // very infrequent
  }
  for (let i = _bgShoots.length - 1; i >= 0; i--) {
    const s = _bgShoots[i];
    s.x += s.vx; s.y += s.vy; s.life--;
    if (s.life <= 0 || s.x < -20 || s.y > VIEW_H) _bgShoots.splice(i, 1);
  }
}

const stars = Array.from({ length: 80 }, () => ({
  x:     Math.random() * WORLD_W,
  y:     Math.random() * VIEW_H * 0.75,
  r:     Math.random() < 0.3 ? 1.5 : 1,
  speed: Math.random() * 0.2 + 0.05,
}));

const clouds = Array.from({ length: 10 }, () => ({
  x:     Math.random() * WORLD_W,
  y:     Math.random() * 80 + 20,
  w:     Math.random() * 60 + 30,
  speed: Math.random() * 0.15 + 0.05,
}));

const raindrops = Array.from({ length: 60 }, () => ({
  x:     Math.floor(Math.random() * VIEW_W),
  y:     Math.floor(Math.random() * VIEW_H),
  len:   Math.floor(Math.random() * 3) + 2,
  speed: Math.floor(Math.random() * 2) + 2,
}));

let _waterOC = null;
let _waterFxOC = null;
let _waterFxFrame = -1;
function drawWater() {
  const wx = Math.round(WATER_ZONE.x - cameraX);
  const wy = Math.round(WATER_ZONE.y - cameraY);
  const ww = WATER_ZONE.w;
  const wh = WATER_ZONE.h;

  if (!_waterOC) {
    _waterOC = getOC('water_fill', ww, wh);
    const g = _waterOC._ctx.createLinearGradient(0, 0, 0, wh);
    g.addColorStop(0,   'rgba(20,80,140,0.82)');
    g.addColorStop(0.5, 'rgba(8,40,90,0.90)');
    g.addColorStop(1,   'rgba(4,18,50,0.97)');
    _waterOC._ctx.fillStyle = g;
    _waterOC._ctx.fillRect(0, 0, ww, wh);
  }
  ctx.drawImage(_waterOC, wx, wy);

  // animated fx — redrawn only every 3 frames into offscreen canvas
  const fxTick = Math.floor(frameNow / 50); // ~20fps for decorations
  if (fxTick !== _waterFxFrame) {
    _waterFxFrame = fxTick;
    if (!_waterFxOC) _waterFxOC = getOC('water_fx', VIEW_W, wh);
    const fc = _waterFxOC._ctx;
    fc.clearRect(0, 0, VIEW_W, wh);
    const t = frameNow * 0.001;

    // shimmer lines — use fillRect not stroke
    fc.globalAlpha = 0.35;
    fc.fillStyle = '#7ec8e3';
    for (let i = 0; i < 6; i++) {
      const phase = (t * 0.6 + i * 1.1) % 1;
      const lineY = Math.round(phase * 14);
      const lineX = (i * 43) % VIEW_W;
      const lineW = Math.round(22 + Math.sin(t + i) * 6);
      fc.fillRect(lineX, lineY, lineW, 1);
    }

    // bubbles — fillRect instead of arc
    fc.globalAlpha = 0.22;
    fc.fillStyle = '#a0e0ff';
    const bSeed = Math.floor(t * 0.5);
    for (let i = 0; i < 14; i++) {
      const bx = (i * 179 + bSeed * 37) % VIEW_W;
      const by = wh - ((t * 20 + i * 47) % wh);
      const br = 1 + (i % 3);
      fc.fillRect(Math.round(bx), Math.round(by), br, br);
    }

    // caustics — fillRect instead of ellipse
    fc.globalAlpha = 0.10;
    fc.fillStyle = '#c0f0ff';
    for (let i = 0; i < 8; i++) {
      const cx2 = (i * 311 + Math.floor(t * 30) * 7) % VIEW_W;
      const cy2 = Math.round(4 + (Math.sin(t * 1.2 + i) * 0.5 + 0.5) * 20);
      const cw = Math.round(10 + Math.sin(t + i) * 4);
      fc.fillRect(Math.round(cx2), cy2, cw * 2, 3);
    }
    fc.globalAlpha = 1;
  }
  if (_waterFxOC) ctx.drawImage(_waterFxOC, 0, wy);
}

let _water2OC = null;
function drawWater2() {
  const wx = Math.round(WATER_ZONE_2.x - cameraX);
  const wy = Math.round(WATER_ZONE_2.y - cameraY);
  const ww = WATER_ZONE_2.w;
  const wh = WATER_ZONE_2.h;

  if (!_water2OC) {
    _water2OC = getOC('water2_fill', ww, wh);
    const g = _water2OC._ctx.createLinearGradient(0, 0, 0, wh);
    g.addColorStop(0,   'rgba(20,80,140,0.82)');
    g.addColorStop(0.5, 'rgba(8,40,90,0.90)');
    g.addColorStop(1,   'rgba(4,18,50,0.97)');
    _water2OC._ctx.fillStyle = g;
    _water2OC._ctx.fillRect(0, 0, ww, wh);
  }
  ctx.drawImage(_water2OC, wx, wy);

  const t = frameNow * 0.001;
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = '#7ec8e3';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const lx = wx + (i * 80 + Math.sin(t * 0.6 + i) * 8) % ww;
    ctx.beginPath(); ctx.moveTo(lx, wy + 5); ctx.lineTo(lx + 18, wy + 5); ctx.stroke();
  }
  ctx.restore();
}

let _cloudOCs = null;
let _bgOC = null;
let _starFrame = -1;
let _starOC = null;
function drawBg() {
  if (!_cloudOCs) {
    _cloudOCs = clouds.map((c, idx) => {
      const cw = Math.ceil(c.w * 2 + 4), ch = 28;
      const oc = getOC('cloud_' + idx, cw, ch);
      const fc = oc._ctx;
      fc.fillStyle = '#2d1060';
      const cx = cw / 2;
      fc.beginPath(); fc.ellipse(cx, 10, c.w, 10, 0, 0, Math.PI * 2); fc.fill();
      fc.beginPath(); fc.ellipse(cx - c.w * 0.3, 14, c.w * 0.6, 8, 0, 0, Math.PI * 2); fc.fill();
      fc.beginPath(); fc.ellipse(cx + c.w * 0.3, 14, c.w * 0.5, 7, 0, 0, Math.PI * 2); fc.fill();
      oc._cw = cw; oc._ch = ch;
      return oc;
    });
  }
  if (!_bgOC) {
    _bgOC = getOC('bg_grad', VIEW_W, VIEW_H);
    const g = _bgOC._ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#1a0a3a');
    g.addColorStop(0.5, '#2a1255');
    g.addColorStop(1, '#3a1a6e');
    _bgOC._ctx.fillStyle = g;
    _bgOC._ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.drawImage(_bgOC, 0, 0);

  // in BW mode overlay a light grey to lift the dark sky
  if (typeof gameboyMode !== 'undefined' && gameboyMode) {
    ctx.fillStyle = 'rgba(180,180,180,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // stars — update alpha at ~15fps, bake into offscreen
  const starTick = Math.floor(frameNow / 66);
  if (starTick !== _starFrame) {
    _starFrame = starTick;
    if (!_starOC) _starOC = getOC('stars_baked', VIEW_W, VIEW_H);
    const fc = _starOC._ctx;
    fc.clearRect(0, 0, VIEW_W, VIEW_H);
    const t = frameNow * 0.001;
    fc.fillStyle = '#fff';
    for (const s of stars) {
      const sx = ((s.x - cameraX * s.speed) % WORLD_W + WORLD_W) % WORLD_W;
      fc.globalAlpha = 0.7 + Math.sin(t + s.x) * 0.3;
      fc.fillRect(Math.round(sx), s.y, s.r <= 1 ? 1 : 2, s.r <= 1 ? 1 : 2);
    }
    fc.globalAlpha = 1;
  }
  if (_starOC) ctx.drawImage(_starOC, 0, 0);

  // shooting stars
  _tickShoots();
  for (const s of _bgShoots) {
    const a = (s.life / s.maxLife) * 0.45; // subtle
    ctx.globalAlpha = a;
    // pixelated trail — draw as discrete 1px dots stepping back along velocity
    ctx.fillStyle = '#cce8ff';
    for (let t = 0; t < s.len; t++) {
      const ta = 1 - t / s.len;
      ctx.globalAlpha = a * ta;
      ctx.fillRect(Math.round(s.x - s.vx * t * 0.6), Math.round(s.y - s.vy * t * 0.6), 1, 1);
    }
    // bright head pixel
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
  }
  ctx.globalAlpha = 1;

  // clouds — blit pre-baked cloud sprites (hidden in BW mode)
  if (!(typeof gameboyMode !== 'undefined' && gameboyMode)) {
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      const oc = _cloudOCs[i];
      const cx = ((c.x - cameraX * c.speed) % WORLD_W + WORLD_W) % WORLD_W;
      ctx.drawImage(oc, Math.round(cx - oc._cw / 2), Math.round(c.y - 10));
    }
  }
}

function drawRain() {
  // update positions
  for (const d of raindrops) {
    d.y += d.speed; d.x -= 1;
    if (d.y > VIEW_H) { d.y = -d.len; d.x = Math.floor(Math.random() * VIEW_W); }
    if (d.x < 0) d.x += VIEW_W;
  }
  // draw all streaks in one pass, then all tips in one pass
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#a0c4ff';
  for (const d of raindrops) ctx.fillRect(Math.floor(d.x), Math.floor(d.y), 1, d.len);
  ctx.globalAlpha = 0.28;
  for (const d of raindrops) ctx.fillRect(Math.floor(d.x), Math.floor(d.y), 1, 1);
  ctx.globalAlpha = 1;
}

const VINE_OVERFLOW = 16; // extra canvas height for hanging vines

const TILE_SZ = 16;

function _drawTile(fc, key, dx, dy, dw, dh) {
  const img = sprites['tile_' + key];
  if (!img || !img.naturalWidth) return;
  fc.imageSmoothingEnabled = false;
  for (let ty = 0; ty < dh; ty += TILE_SZ)
    for (let tx = 0; tx < dw; tx += TILE_SZ)
      fc.drawImage(img, dx + tx, dy + ty, Math.min(TILE_SZ, dw - tx), Math.min(TILE_SZ, dh - ty));
}

function _tileRow(fc, y, w, h, lKey, mKey, rKey) {
  const T2 = TILE_SZ;
  if (w <= T2 * 2) { _drawTile(fc, mKey, 0, y, w, h); return; }
  _drawTile(fc, lKey, 0,       y, T2,       h);
  _drawTile(fc, mKey, T2,      y, w - T2*2, h);
  _drawTile(fc, rKey, w - T2,  y, T2,       h);
}

function _bakePlatform(p) {
  const isRock = p.color === '#1a1a2e' || p.color === '#1a2a3a' || p.color === '#1e2a3a';
  const isUnderwater = isRock && p.oneWay;
  const canvasH = (p.oneWay && !isRock) ? p.h + VINE_OVERFLOW : p.h;
  const oc = getOC('plat_' + p.x + '_' + p.y, p.w, canvasH);
  const fc = oc._ctx;
  fc.imageSmoothingEnabled = false;

  if (isUnderwater) {
    // underwater rock ledge — keep procedural
    fc.fillStyle = '#1c2e40'; fc.fillRect(0, 0, p.w, p.h);
    fc.fillStyle = '#243848';
    for (let rx = 0; rx < p.w; rx += 14) { fc.fillRect(rx, 0, 7, 2); fc.fillRect(rx + 5, 3, 5, 2); }
    fc.fillStyle = '#162230'; fc.fillRect(0, p.h - 2, p.w, 2);
    fc.fillStyle = '#1a5a3a';
    for (let ax = 3; ax < p.w - 3; ax += 9) fc.fillRect(ax, 0, 2, 3);
    fc.fillStyle = '#228844';
    for (let ax = 6; ax < p.w - 6; ax += 11) fc.fillRect(ax, 0, 1, 4);

  } else if (isRock) {
    // solid rock — keep procedural
    fc.fillStyle = p.color; fc.fillRect(0, 0, p.w, p.h);
    fc.fillStyle = '#22334a';
    for (let ry = 4; ry < p.h; ry += 10)
      for (let rx = 3; rx < p.w - 3; rx += 20) fc.fillRect(rx, ry, 9, 2);
    fc.fillStyle = '#141e2e';
    for (let ry = 9; ry < p.h; ry += 10)
      for (let rx = 11; rx < p.w - 3; rx += 20) fc.fillRect(rx, ry, 6, 1);

  } else if (p.oneWay) {
    // floating platform — grass tiles on top, solid brown below
    const W = p.w, H = p.h;
    const T2 = TILE_SZ;
    if (H > T2) {
      fc.fillStyle = '#3d1f0a';
      fc.fillRect(0, T2, W, H - T2);
    }
    _tileRow(fc, 0, W, Math.min(T2, H), 'grassL', 'grassM', 'grassR');

    // hanging vines
    const vineColors = ['#2a7a1a', '#1e6012', '#3a9a22', '#228818'];
    let vx = 6, vi = 0;
    while (vx < W - 4) {
      const vineLen = 6 + ((vx * 7 + vi * 13) % 10);
      fc.fillStyle = vineColors[vi % vineColors.length];
      for (let vy = H; vy < H + vineLen; vy++) fc.fillRect(vx, vy, 1, 1);
      if (vineLen > 8) {
        fc.fillStyle = '#44bb22';
        fc.fillRect(vx - 1, H + 4, 1, 1);
        fc.fillRect(vx + 1, H + 7, 1, 1);
      }
      vx += 5 + ((vx * 3 + vi) % 6); vi++;
    }

  } else {
    // ground slab — deep tile pattern below, grass on top
    const W = p.w, totalH = p.h;
    const T2 = TILE_SZ;
    // dirt fill for everything below grass row
    const dirtImg = sprites['tile_dirtM'];
    if (dirtImg && dirtImg.naturalWidth) {
      fc.save();
      fc.translate(0, T2);
      const dirtPat = fc.createPattern(dirtImg, 'repeat');
      fc.fillStyle = dirtPat;
      fc.fillRect(0, 0, W, totalH - T2);
      fc.restore();
    } else {
      fc.fillStyle = '#2e1608';
      fc.fillRect(0, T2, W, totalH - T2);
    }
    // one row of deep tiles just under grass (drawn on top of brownground)
    const deepImg = sprites['tile_deepM'];
    if (deepImg && deepImg.naturalWidth) {
      const deepH = deepImg.naturalHeight;
      fc.save();
      fc.translate(0, T2);
      const pat = fc.createPattern(deepImg, 'repeat');
      fc.fillStyle = pat;
      fc.fillRect(0, 0, W, deepH);
      fc.restore();
    }
    // grass top row
    _tileRow(fc, 0, W, T2, 'grassL', 'grassM', 'grassR');
  }
  p._oc = oc;
}

function drawPlatforms() {
  for (const p of platforms) {
    const sx = Math.round(p.x - cameraX);
    const sy = Math.round(p.y - cameraY);
    if (sx + p.w < 0 || sx > VIEW_W || sy + p.h < 0 || sy > VIEW_H) continue;
    if (!p._oc) _bakePlatform(p);
    ctx.drawImage(p._oc, sx, sy);
  }
}
