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
const WATER_ZONE_2 = { x: 4480, y: 230, w: 500, h: 520 };
const WATER_FLOOR_Y_2 = WATER_ZONE_2.y + WATER_ZONE_2.h;

const platforms = [
  // upper ground (original section)
  { x: -200, y: 210, w: 1900, h: 400, color: '#3d2b1f' },
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
  { x: WATER_ZONE_2.x + 10,                  y: WATER_ZONE_2.y + 320, w: 70, h: 8, color: '#1e2a3a', oneWay: true },
  { x: WATER_ZONE_2.x + WATER_ZONE_2.w - 80, y: WATER_ZONE_2.y + 200, w: 70, h: 8, color: '#1e2a3a', oneWay: true },
  { x: WATER_ZONE_2.x + 20,                  y: WATER_ZONE_2.y + 110, w: 60, h: 8, color: '#1e2a3a', oneWay: true },
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

function drawWater() {
  const wx = Math.round(WATER_ZONE.x - cameraX);
  const wy = Math.round(WATER_ZONE.y - cameraY);
  const ww = WATER_ZONE.w;
  const wh = WATER_ZONE.h;

  // deep water fill
  const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
  grad.addColorStop(0,   'rgba(20,80,140,0.82)');
  grad.addColorStop(0.5, 'rgba(8,40,90,0.90)');
  grad.addColorStop(1,   'rgba(4,18,50,0.97)');
  ctx.fillStyle = grad;
  ctx.fillRect(wx, wy, ww, wh);

  // surface shimmer lines
  const t = Date.now() * 0.001;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#7ec8e3';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const phase = (t * 0.6 + i * 1.1) % 1;
    const lineY = wy + phase * 14;
    const lineX = wx + (i * 43) % ww;
    ctx.beginPath();
    ctx.moveTo(lineX, lineY);
    ctx.lineTo(lineX + 22 + Math.sin(t + i) * 6, lineY);
    ctx.stroke();
  }
  ctx.restore();

  // bubbles drifting upward
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#a0e0ff';
  const bSeed = Math.floor(t * 0.5);
  for (let i = 0; i < 14; i++) {
    const bx = wx + ((i * 179 + bSeed * 37) % ww);
    const by = wy + wh - ((t * 20 + i * 47) % wh);
    const br = 1 + (i % 3);
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // caustic light patches on the surface band
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = '#c0f0ff';
  for (let i = 0; i < 8; i++) {
    const cx2 = wx + (i * 311 + Math.floor(t * 30) * 7) % ww;
    const cy2 = wy + 4 + (Math.sin(t * 1.2 + i) * 0.5 + 0.5) * 20;
    ctx.beginPath();
    ctx.ellipse(cx2, cy2, 10 + Math.sin(t + i) * 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWater2() {
  const wx = Math.round(WATER_ZONE_2.x - cameraX);
  const wy = Math.round(WATER_ZONE_2.y - cameraY);
  const ww = WATER_ZONE_2.w;
  const wh = WATER_ZONE_2.h;

  const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
  grad.addColorStop(0,   'rgba(20,80,140,0.82)');
  grad.addColorStop(0.5, 'rgba(8,40,90,0.90)');
  grad.addColorStop(1,   'rgba(4,18,50,0.97)');
  ctx.fillStyle = grad;
  ctx.fillRect(wx, wy, ww, wh);

  const t = Date.now() * 0.001;
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

function drawBg() {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#0d0521');
  grad.addColorStop(1, '#1a0a3e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = '#fff';
  for (const s of stars) {
    const sx = ((s.x - cameraX * s.speed) % WORLD_W + WORLD_W) % WORLD_W;
    ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.001 + s.x) * 0.3;
    ctx.beginPath(); ctx.arc(sx, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#2d1060';
  for (const c of clouds) {
    const cx = ((c.x - cameraX * c.speed) % WORLD_W + WORLD_W) % WORLD_W;
    ctx.beginPath(); ctx.ellipse(cx, c.y, c.w, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - c.w * 0.3, c.y + 4, c.w * 0.6, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + c.w * 0.3, c.y + 4, c.w * 0.5, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function drawRain() {
  ctx.save();
  for (const d of raindrops) {
    d.y += d.speed;
    d.x -= 1;
    if (d.y > VIEW_H) { d.y = -d.len; d.x = Math.floor(Math.random() * VIEW_W); }
    if (d.x < 0) d.x += VIEW_W;
    const x = Math.floor(d.x);
    const y = Math.floor(d.y);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#a0c4ff';
    ctx.fillRect(x, y, 1, d.len);
    ctx.globalAlpha = 0.28;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPlatforms() {
  for (const p of platforms) {
    const sx = Math.round(p.x - cameraX);
    const sy = Math.round(p.y - cameraY);

    if (p.oneWay) {
      // small floating platform — simple brown plank with grass tuft
      ctx.fillStyle = '#7a5544'; ctx.fillRect(sx, sy, p.w, 3);
      ctx.fillStyle = p.color;  ctx.fillRect(sx, sy + 3, p.w, p.h - 3);
      ctx.fillStyle = '#5c8a3c';
      for (let gx = sx + 4; gx < sx + p.w - 4; gx += 8) ctx.fillRect(gx, sy, 2, 3);
    } else {
      // tall ground slab — layered like a real cross-section
      const totalH = p.h;

      // grass top (3px)
      ctx.fillStyle = '#4a9e30';
      ctx.fillRect(sx, sy, p.w, 3);

      // bright grass detail (1px highlights every few pixels)
      ctx.fillStyle = '#6dc442';
      for (let gx = sx + 2; gx < sx + p.w; gx += 6) ctx.fillRect(gx, sy, 2, 2);

      // topsoil (next 10px, warm brown)
      ctx.fillStyle = '#7a4f2a';
      ctx.fillRect(sx, sy + 3, p.w, 10);

      // dirt layer 1 (darker, 20px)
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(sx, sy + 13, p.w, 20);

      // dirt layer 2 (darker still, 30px)
      ctx.fillStyle = '#3d2410';
      ctx.fillRect(sx, sy + 33, p.w, 30);

      // transition to wet dirt (20px, slight blue tint)
      ctx.fillStyle = '#2e2218';
      ctx.fillRect(sx, sy + 63, p.w, 20);

      // waterlogged / underground water layer (rest)
      if (totalH > 83) {
        ctx.fillStyle = '#1a2a3a';
        ctx.fillRect(sx, sy + 83, p.w, totalH - 83);
        // water shimmer lines
        ctx.fillStyle = '#1e3d5a';
        for (let wy = sy + 90; wy < sy + totalH; wy += 12) {
          for (let wx = sx + 3; wx < sx + p.w - 3; wx += 18) {
            ctx.fillRect(wx, wy, 8, 1);
          }
        }
      }

      // stone pebble details scattered in dirt
      ctx.fillStyle = '#4a3828';
      for (let dx = 10; dx < p.w - 10; dx += 23) {
        ctx.fillRect(sx + dx,      sy + 16, 3, 2);
        ctx.fillRect(sx + dx + 11, sy + 28, 2, 2);
        ctx.fillRect(sx + dx + 5,  sy + 42, 3, 2);
      }
    }
  }
}
