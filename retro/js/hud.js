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

  // kill combo counter
  if (combo.count >= 2 || combo.displayTimer > 0) {
    const isExpiring = combo.displayTimer > 0;
    const alpha = isExpiring ? Math.min(1, combo.displayTimer / 30) : 1;
    const cx = VIEW_W - 6;
    const cy = 6;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'right';

    // combo count
    ctx.font = '16px "Press Start 2P"';
    ctx.fillStyle = combo.count >= 10 ? '#ff4400' : combo.count >= 5 ? '#ffaa00' : '#ffffff';
    ctx.fillText(`x${combo.count}`, cx, cy + 14);

    // label
    ctx.font = PIXEL_FONT_SM;
    ctx.fillStyle = '#b07aff';
    ctx.fillText('COMBO', cx, cy + 23);

    // timer bar below — shows how long until combo expires
    if (!isExpiring) {
      const barW = 40;
      const barH = 2;
      const barX = cx - barW;
      const barY = cy + 26;
      const frac = combo.timer / combo.WINDOW;
      ctx.fillStyle = '#1a0a2e';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = frac > 0.5 ? '#00ff88' : frac > 0.25 ? '#ffaa00' : '#ff4400';
      ctx.fillRect(barX, barY, Math.round(barW * frac), barH);
    }

    ctx.textAlign = 'left';
    ctx.restore();
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
