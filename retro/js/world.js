let cameraX = 0;
let cameraY = 0;

const LOWER_Y = 310; // lower ground level after capybaras

const platforms = [
  // upper ground (original section)
  { x: -200, y: 210, w: 1900, h: 60, color: '#3d2b1f' },
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
  // step-down transition platforms (after capybaras ~x:1700)
  { x: 1700, y: 235, w: 80,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 1820, y: 260, w: 80,  h: 8,  color: '#5c3d2e', oneWay: true },
  { x: 1940, y: 285, w: 80,  h: 8,  color: '#5c3d2e', oneWay: true },
  // lower ground section
  { x: 1700, y: LOWER_Y, w: 2400, h: 60, color: '#2b1a10' },
  // lower section floating platforms
  { x: 2100, y: 275, w: 80,  h: 8,  color: '#4a2e1e', oneWay: true },
  { x: 2240, y: 255, w: 75,  h: 8,  color: '#4a2e1e', oneWay: true },
  { x: 2380, y: 270, w: 80,  h: 8,  color: '#4a2e1e', oneWay: true },
  { x: 2520, y: 250, w: 90,  h: 8,  color: '#4a2e1e', oneWay: true },
  { x: 2660, y: 265, w: 75,  h: 8,  color: '#4a2e1e', oneWay: true },
  { x: 2800, y: 248, w: 80,  h: 8,  color: '#4a2e1e', oneWay: true },
  { x: 2940, y: 270, w: 85,  h: 8,  color: '#4a2e1e', oneWay: true },
];

const WORLD_W = 4200;

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
    const sx = p.x - cameraX;
    const sy = p.y - cameraY;
    ctx.fillStyle = '#7a5544'; ctx.fillRect(sx, sy, p.w, 3);
    ctx.fillStyle = p.color;  ctx.fillRect(sx, sy + 3, p.w, p.h - 3);
    if (p.h <= 10) {
      ctx.fillStyle = '#5c8a3c';
      for (let gx = sx + 4; gx < sx + p.w - 4; gx += 8) ctx.fillRect(gx, sy, 2, 3);
    }
  }
}
