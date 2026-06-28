canvas.width  = VIEW_W;
canvas.height = VIEW_H;
canvas.style.width  = VIEW_W * SCALE + 'px';
canvas.style.height = VIEW_H * SCALE + 'px';
ctx.imageSmoothingEnabled = false;

function loop() {
  if (levelComplete) {
    updateItems(); // keeps timer ticking
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawBg(); drawLightning(); drawRain(); drawWater(); drawWater2(); drawPlatforms();
    drawNpcs(); drawEnemies(); drawRedEnemies(); drawFish(); drawBigFish();
    drawOrange(); drawGoldenKey();
    drawPlayer();
    drawCarriedRedEnemies();
    drawDialog();
    drawSettings();
    drawHUD();
    drawLevelComplete();
    requestAnimationFrame(loop);
    return;
  }

  if (death.active) {
    death.timer++;
    if (death.timer < death.freezeEnd) {
      // frozen pause before pop — do nothing
    } else {
      // pop up then fall
      if (death.timer === death.freezeEnd) death.vy = death.popVy;
      death.vy += 0.35;
      death.y  += death.vy;
    }
    // after falling off screen, reset
    if (death.timer > death.freezeEnd && death.y - cameraY > VIEW_H + 40) {
      death.active = false;
      resetLevel();
    }

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawBg(); drawRain(); drawWater(); drawWater2(); drawPlatforms();

    // draw axo frozen/dead — use walk1, no flicker, centred where he died
    if (assetsReady()) {
      const spr = sprites['walk1'];
      const sx = Math.round(death.x - cameraX);
      const sy = Math.round(death.y - cameraY);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      // white tint like a death flash
      const oc = getOC('death_flash', spr.naturalWidth, spr.naturalHeight);
      const oc2d = oc._ctx;
      oc2d.clearRect(0, 0, oc.width, oc.height);
      oc2d.globalCompositeOperation = 'source-over';
      oc2d.globalAlpha = 1;
      oc2d.imageSmoothingEnabled = false;
      oc2d.drawImage(spr, 0, 0);
      if (death.timer < death.freezeEnd) {
        oc2d.globalCompositeOperation = 'source-atop';
        oc2d.fillStyle = `rgba(255,255,255,${0.8 - (death.timer / death.freezeEnd) * 0.8})`;
        oc2d.fillRect(0, 0, oc.width, oc.height);
        oc2d.globalCompositeOperation = 'source-over';
      }
      ctx.drawImage(oc, sx, sy);
      ctx.restore();
    }

    drawHUD();
    requestAnimationFrame(loop);
    return;
  }

  // hit freeze: skip all updates while frozen
  if (hitFreezeTimer > 0) {
    hitFreezeTimer--;
  } else {
    updatePlayer();
    updateEnemies();
    updateRedEnemies();
    updateFish();
    updateBigFish();
    updateCombo();
    updateLightning();
    updateItems();
  }

  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  // screen shake: translate canvas before all draws
  let shakeX = 0, shakeY = 0;
  if (screenShakeTimer > 0) {
    screenShakeTimer--;
    shakeX = (Math.random() * 2 - 1) * SCREEN_SHAKE_MAG;
    shakeY = (Math.random() * 2 - 1) * SCREEN_SHAKE_MAG;
    ctx.save();
    ctx.translate(shakeX, shakeY);
  }

  drawBg();
  drawLightning();
  drawRain();
  drawWater();
  drawWater2();
  drawPlatforms();
  drawNpcs();
  drawEnemies();
  drawRedEnemies();
  drawFish();
  drawBigFish();
  drawOrange();
  drawGoldenKey();
  drawPlayer();
  drawCarriedRedEnemies();

  if (screenShakeTimer > 0 || shakeX !== 0 || shakeY !== 0) ctx.restore();

  drawDialog();
  drawSettings();
  drawHUD();

  requestAnimationFrame(loop);
}

function waitAndStart() {
  if (assetsReady()) {
    player.w = sprites['walk1'].naturalWidth;
    player.h = sprites['walk1'].naturalHeight;
    const bw = sprites['badguy1'].naturalWidth;
    const bh = sprites['badguy1'].naturalHeight;
    for (const e of enemies) { e.w = bw; e.h = bh; }
    const rw = sprites['redguy1'].naturalWidth;
    const rh = sprites['redguy1'].naturalHeight;
    for (const e of redEnemies) { e.w = rw; e.h = rh; e._y = e.platformY - rh; }
    document.fonts.ready.then(() => loop());
  } else {
    setTimeout(waitAndStart, 50);
  }
}

waitAndStart();
