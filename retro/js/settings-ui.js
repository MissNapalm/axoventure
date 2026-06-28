let settingsOpen = false;
let dragging = null;
let settingsScroll = 0;

const settingsKeys = Object.keys(settings);

const PANEL_W   = 160;
const PANEL_PAD = 8;
const PANEL_ROW = 22;
const PANEL_X   = VIEW_W - PANEL_W - 6;
const PANEL_Y   = 6;
const PANEL_MAX_H = VIEW_H - 12;
const PANEL_CONTENT_H = PANEL_PAD + 14 + settingsKeys.length * PANEL_ROW + PANEL_PAD;
const PANEL_H   = Math.min(PANEL_CONTENT_H, PANEL_MAX_H);

function maxScroll() { return Math.max(0, PANEL_CONTENT_H - PANEL_H); }

function applyDrag(mx) {
  const s = settings[dragging.key];
  const t = Math.max(0, Math.min(1, (mx - dragging.trackX) / dragging.trackW));
  s.value = Math.round((s.min + t * (s.max - s.min)) / s.step) * s.step;
  s.value = Math.round(s.value * 1000) / 1000;
}

canvas.addEventListener('wheel', e => {
  if (!settingsOpen) return;
  e.preventDefault();
  settingsScroll = Math.max(0, Math.min(maxScroll(), settingsScroll + e.deltaY));
}, { passive: false });

canvas.addEventListener('mousedown', e => {
  if (!settingsOpen) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / SCALE;
  const my = (e.clientY - rect.top)  / SCALE;
  settingsKeys.forEach((key, i) => {
    const trackX = PANEL_X + PANEL_PAD;
    const trackW = PANEL_W - PANEL_PAD * 2;
    const rowY   = PANEL_Y + PANEL_PAD + 14 + i * PANEL_ROW - settingsScroll;
    const trackY = rowY + 12;
    if (rowY < PANEL_Y + 4 || rowY + PANEL_ROW > PANEL_Y + PANEL_H - 4) return;
    if (my >= trackY - 3 && my <= trackY + 5 && mx >= trackX && mx <= trackX + trackW) {
      dragging = { key, trackX, trackW };
      applyDrag(mx);
    }
  });
});

canvas.addEventListener('mousemove', e => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  applyDrag((e.clientX - rect.left) / SCALE);
});

canvas.addEventListener('mouseup', () => { dragging = null; });

function drawSettings() {
  if (!settingsOpen) return;

  ctx.fillStyle = 'rgba(8,3,24,0.95)';
  ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
  ctx.strokeStyle = '#7a50cc'; ctx.lineWidth = 2;
  ctx.strokeRect(PANEL_X + 1, PANEL_Y + 1, PANEL_W - 2, PANEL_H - 2);
  ctx.strokeStyle = '#4a2888'; ctx.lineWidth = 1;
  ctx.strokeRect(PANEL_X + 3, PANEL_Y + 3, PANEL_W - 6, PANEL_H - 6);

  ctx.font = PIXEL_FONT;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#c9a0ff';
  ctx.fillText('Settings', PANEL_X + PANEL_PAD, PANEL_Y + PANEL_PAD);

  ctx.save();
  ctx.beginPath();
  ctx.rect(PANEL_X + 4, PANEL_Y + 22, PANEL_W - 8, PANEL_H - 26);
  ctx.clip();

  settingsKeys.forEach((key, i) => {
    const s = settings[key];
    const ry = PANEL_Y + PANEL_PAD + 14 + i * PANEL_ROW - settingsScroll;
    const trackX = PANEL_X + PANEL_PAD;
    const trackW = PANEL_W - PANEL_PAD * 2;
    const t = (s.value - s.min) / (s.max - s.min);

    ctx.fillStyle = '#f0e6ff';
    ctx.font = '6px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(s.label, trackX, ry);
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(s.value * 100) / 100), PANEL_X + PANEL_W - PANEL_PAD, ry);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#2a1555';
    ctx.fillRect(trackX, ry + 11, trackW, 3);
    ctx.fillStyle = '#7a50cc';
    ctx.fillRect(trackX, ry + 11, Math.round(t * trackW), 3);
    ctx.fillStyle = '#f0e6ff';
    ctx.fillRect(trackX + Math.round(t * trackW) - 1, ry + 9, 3, 7);
  });

  ctx.restore();

  // scroll bar
  if (maxScroll() > 0) {
    const barH = Math.max(8, Math.round((PANEL_H / PANEL_CONTENT_H) * (PANEL_H - 8)));
    const barY = PANEL_Y + 4 + Math.round((settingsScroll / maxScroll()) * (PANEL_H - 8 - barH));
    ctx.fillStyle = '#2a1555';
    ctx.fillRect(PANEL_X + PANEL_W - 5, PANEL_Y + 4, 3, PANEL_H - 8);
    ctx.fillStyle = '#7a50cc';
    ctx.fillRect(PANEL_X + PANEL_W - 5, barY, 3, barH);
  }
}
