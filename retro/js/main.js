canvas.width  = VIEW_W;
canvas.height = VIEW_H;
canvas.style.width  = VIEW_W * SCALE + 'px';
canvas.style.height = VIEW_H * SCALE + 'px';
ctx.imageSmoothingEnabled = false;

function loop() {
  // hit freeze: skip all updates while frozen
  if (hitFreezeTimer > 0) {
    hitFreezeTimer--;
  } else {
    updatePlayer();
    updateEnemies();
    updateRedEnemies();
    updateFish();
    updateBigFish();
    updateLightning();
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
  drawPlatforms();
  drawNpcs();
  drawEnemies();
  drawRedEnemies();
  drawFish();
  drawBigFish();
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
