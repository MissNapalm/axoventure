function drawHUD() {
  // controls bar
  ctx.font = PIXEL_FONT_SM;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(4, 4, 300, 12);
  ctx.fillStyle = '#f8b4d9';
  ctx.fillText('S/C move  D/L jump  M run/throw  Tab settings', 6, 13);

  // health meter
  const METER_X = 6;
  const METER_Y = 20;
  const METER_W = 48;
  const METER_H = 7;
  const fill = Math.max(0, Math.min(1, player.hp / PLAYER_MAX_HP));

  // background
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(METER_X, METER_Y, METER_W, METER_H);

  // fill — color shifts red→yellow→green with hp
  const r = fill < 0.5 ? 255 : Math.round(255 * (1 - fill) * 2);
  const g = fill > 0.5 ? 255 : Math.round(255 * fill * 2);
  ctx.fillStyle = `rgb(${r},${g},40)`;
  ctx.fillRect(METER_X, METER_Y, Math.round(METER_W * fill), METER_H);

  // segment ticks (one per max HP pip)
  ctx.fillStyle = '#0d0521';
  for (let i = 1; i < PLAYER_MAX_HP; i++) {
    const tx = METER_X + Math.round(METER_W * i / PLAYER_MAX_HP);
    ctx.fillRect(tx, METER_Y, 1, METER_H);
  }

  // border
  ctx.strokeStyle = '#7a50cc';
  ctx.lineWidth = 1;
  ctx.strokeRect(METER_X + 0.5, METER_Y + 0.5, METER_W, METER_H);

  // regen shimmer when regenning
  if (player.hurtTimer === 0 && player.hp < PLAYER_MAX_HP) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    const shimX = METER_X + Math.round(METER_W * fill) - 2;
    ctx.fillRect(Math.max(METER_X, shimX), METER_Y, 2, METER_H);
  }

  // coder mode indicator
  if (coderMode) {
    ctx.font = PIXEL_FONT_SM;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(VIEW_W - 82, VIEW_H - 14, 78, 10);
    ctx.fillStyle = '#00ffaa';
    ctx.textAlign = 'right';
    ctx.fillText('CODER MODE', VIEW_W - 4, VIEW_H - 5);
    ctx.textAlign = 'left';
  }
}
