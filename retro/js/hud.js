let _fpsLast = 0, _fpsCount = 0, _fpsDisplay = 0;
let _framePrev = 0;
const _frameTimes = new Float32Array(60); // ring buffer of last 60 frame durations
let _frameIdx = 0;

function drawHUD() {
  // frame time tracking
  const _frameDt = frameNow - _framePrev;
  _framePrev = frameNow;
  if (_frameDt > 0 && _frameDt < 500) {
    _frameTimes[_frameIdx % 60] = _frameDt;
    _frameIdx++;
  }

  // FPS counter (avg over 0.5s)
  _fpsCount++;
  if (frameNow - _fpsLast >= 500) {
    _fpsDisplay = Math.round(_fpsCount * 1000 / (frameNow - _fpsLast));
    _fpsCount = 0;
    _fpsLast = frameNow;
  }

  // frame time graph — 60 bars in bottom-right, each = one frame duration
  // 16.6ms = 60fps = bar height 5px; spike to 33ms = bar height 10px
  const GW = 62, GH = 20, GX = VIEW_W - GW - 2, GY = VIEW_H - GH - 2;
  ctx.fillStyle = '#060210';
  ctx.fillRect(GX - 1, GY - 1, GW + 2, GH + 2);
  let _prevColor = '';
  for (let i = 0; i < 60; i++) {
    const idx = (_frameIdx - 60 + i + 60) % 60;
    const dt = _frameTimes[idx];
    const barH = Math.min(GH, Math.round(dt / 33.3 * GH));
    if (barH <= 0) continue;
    const color = dt <= 17 ? '#00ff88' : dt <= 25 ? '#ffaa00' : '#ff4444';
    if (color !== _prevColor) { ctx.fillStyle = color; _prevColor = color; }
    ctx.fillRect(GX + i, GY + GH - barH, 1, barH);
  }
  ctx.fillStyle = '#444444';
  ctx.fillRect(GX, GY + GH - Math.round(GH / 2), GW, 1);

  // fps number
  ctx.font = '8px monospace';
  ctx.fillStyle = _fpsDisplay >= 55 ? '#00ff88' : _fpsDisplay >= 40 ? '#ffaa00' : '#ff4444';
  ctx.textAlign = 'right';
  ctx.fillText(_fpsDisplay + 'fps', VIEW_W - 2, VIEW_H - GH - 5);
  ctx.textAlign = 'left';
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
  const _r = fill < 0.5 ? 255 : Math.round(255 * (1 - fill) * 2);
  const _g = fill > 0.5 ? 255 : Math.round(255 * fill * 2);
  ctx.fillStyle = 'rgb(' + _r + ',' + _g + ',40)';
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

  // fury meter
  {
    const FURY_BAR_W = 80;
    const FURY_BAR_H = 5;
    const FURY_BAR_X = Math.round((VIEW_W - FURY_BAR_W) / 2);
    const FURY_BAR_Y = 4;
    const frac = fury.active
      ? fury.timer / S.furyDuration
      : fury.kills / FURY_MAX;

    // background
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(FURY_BAR_X, FURY_BAR_Y, FURY_BAR_W, FURY_BAR_H);

    // fill
    const fillW = Math.round(FURY_BAR_W * frac);
    if (fury.active) {
      // pulsing gold during fury
      const pulse = 0.7 + Math.sin(fury.flashTimer * 0.15) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ffe566';
      ctx.fillRect(FURY_BAR_X, FURY_BAR_Y, fillW, FURY_BAR_H);
      ctx.globalAlpha = 1;
    } else {
      // orange fill while charging
      ctx.fillStyle = fury.ready ? '#ff8800' : '#ff4400';
      ctx.fillRect(FURY_BAR_X, FURY_BAR_Y, fillW, FURY_BAR_H);
    }

    // border
    ctx.strokeStyle = fury.ready || fury.active ? '#ffdd00' : '#7a50cc';
    ctx.lineWidth = 1;
    ctx.strokeRect(FURY_BAR_X + 0.5, FURY_BAR_Y + 0.5, FURY_BAR_W, FURY_BAR_H);

    // "PRESS F!" prompt when ready
    if (fury.ready && !fury.active) {
      const blink = Math.floor(frameNow / 350) % 2 === 0;
      if (blink) {
        ctx.font = PIXEL_FONT_SM;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffdd00';
        ctx.fillText('PRESS F!', VIEW_W / 2, FURY_BAR_Y + FURY_BAR_H + 9);
        ctx.textAlign = 'left';
      }
    }

    // "FURY!" label during active
    if (fury.active) {
      const pulse = Math.sin(fury.flashTimer / Math.max(1, S.furyFlashSpeed)) * 0.5 + 0.5;
      const _fg = Math.round(180 + pulse * 75), _fb = Math.round(pulse * 102);
      ctx.font = PIXEL_FONT_SM;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgb(255,' + _fg + ',' + _fb + ')';
      ctx.fillText('FURY!', VIEW_W / 2, FURY_BAR_Y + FURY_BAR_H + 9);
      ctx.textAlign = 'left';
    }
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
