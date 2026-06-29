let cameraX = 0;
let cameraY = 0;
let hitFreezeTimer = 0;
let screenShakeTimer = 0;

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
const WATER_ZONE = { x: 1700, y: 230, w: 2540, h: 600 };
// The seafloor/rock shelf that closes the bottom
const WATER_FLOOR_Y = WATER_ZONE.y + WATER_ZONE.h;

// Second land section ground level
const LAND2_Y = 210;

// Second water zone: deep pool Edgar sits next to — swimmable, orange guarded at the bottom
const WATER_ZONE_2 = { x: 4480, y: 230, w: 500, h: 700 };
const WATER_FLOOR_Y_2 = WATER_ZONE_2.y + WATER_ZONE_2.h;

const platforms = [
  // upper ground (original section)
  { x: -200, y: 210, w: 1900, h: 400, color: '#3d2b1f' },
  // fill the 20px notch where land meets water zone wall
  { x: 1700, y: 210, w: 40, h: 20, color: '#3d2b1f' },
  // floating platforms (original)
  { x: 80,   y: 175, w: 80,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 230,  y: 155, w: 80,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 370,  y: 135, w: 70,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 500,  y: 165, w: 90,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 650,  y: 140, w: 75,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 790,  y: 115, w: 70,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 920,  y: 148, w: 80,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 1060, y: 125, w: 75,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 1200, y: 155, w: 80,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 1340, y: 130, w: 90,  h: 8,  color: '#5c3d2e', oneWay: true },
  // step-down ledges leading into the water
  { x: 1700, y: 235, w: 80,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 1820, y: 260, w: 80,  h: 8,  color: '#5c3d2e', oneWay: true },
  // seafloor solid rock — closes the bottom of the water zone
  { x: WATER_ZONE.x, y: WATER_FLOOR_Y, w: WATER_ZONE.w, h: 80, color: '#1a1a2e' },
  // underwater rock shelves / ledges
  { x: 1850, y: 620, w: 120, h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2050, y: 560, w: 100, h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2220, y: 500, w: 110, h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2400, y: 570, w: 90,  h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2580, y: 520, w: 100, h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2760, y: 590, w: 110, h: 8,  color: '#1e2a3a', oneWay: true },
  { x: 2940, y: 540, w: 90,  h: 8,  color: '#1e2a3a', oneWay: true },
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
    g.addColorStop(0, '#0d0521');
    g.addColorStop(1, '#1a0a3e');
    _bgOC._ctx.fillStyle = g;
    _bgOC._ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.drawImage(_bgOC, 0, 0);

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

  // clouds — blit pre-baked cloud sprites
  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i];
    const oc = _cloudOCs[i];
    const cx = ((c.x - cameraX * c.speed) % WORLD_W + WORLD_W) % WORLD_W;
    ctx.drawImage(oc, Math.round(cx - oc._cw / 2), Math.round(c.y - 10));
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

function _bakePlatform(p) {
  const oc = getOC('plat_' + p.x + '_' + p.y, p.w, p.h);
  const fc = oc._ctx;
  // pool walls, floors, and rock slabs use their raw color — no grass
  const isRock = p.color === '#1a1a2e' || p.color === '#1a2a3a';
  if (p.oneWay) {
    fc.fillStyle = '#7a5544'; fc.fillRect(0, 0, p.w, 3);
    fc.fillStyle = p.color;  fc.fillRect(0, 3, p.w, p.h - 3);
    fc.fillStyle = '#5c8a3c';
    for (let gx = 4; gx < p.w - 4; gx += 8) fc.fillRect(gx, 0, 2, 3);
  } else if (isRock) {
    fc.fillStyle = p.color; fc.fillRect(0, 0, p.w, p.h);
  } else {
    const totalH = p.h;
    fc.fillStyle = '#4a9e30'; fc.fillRect(0, 0, p.w, 3);
    fc.fillStyle = '#6dc442';
    for (let gx = 2; gx < p.w; gx += 6) fc.fillRect(gx, 0, 2, 2);
    fc.fillStyle = '#7a4f2a'; fc.fillRect(0, 3, p.w, 10);
    fc.fillStyle = '#5c3a1e'; fc.fillRect(0, 13, p.w, 20);
    fc.fillStyle = '#3d2410'; fc.fillRect(0, 33, p.w, 30);
    fc.fillStyle = '#2e2218'; fc.fillRect(0, 63, p.w, 20);
    if (totalH > 83) {
      fc.fillStyle = '#1a2a3a'; fc.fillRect(0, 83, p.w, totalH - 83);
      fc.fillStyle = '#1e3d5a';
      for (let wy2 = 90; wy2 < totalH; wy2 += 12)
        for (let wx2 = 3; wx2 < p.w - 3; wx2 += 18)
          fc.fillRect(wx2, wy2, 8, 1);
    }
    fc.fillStyle = '#4a3828';
    for (let dx = 10; dx < p.w - 10; dx += 23) {
      fc.fillRect(dx,      16, 3, 2);
      fc.fillRect(dx + 11, 28, 2, 2);
      fc.fillRect(dx + 5,  42, 3, 2);
    }
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
