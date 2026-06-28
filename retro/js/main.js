canvas.width  = VIEW_W;
canvas.height = VIEW_H;
canvas.style.width  = VIEW_W * SCALE + 'px';
canvas.style.height = VIEW_H * SCALE + 'px';
ctx.imageSmoothingEnabled = false;

function loop() {
  updatePlayer();
  updateEnemies();
  updateRedEnemies();
  updateLightning();

  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawBg();
  drawLightning();
  drawRain();
  drawPlatforms();
  drawNpcs();
  drawEnemies();
  drawRedEnemies();
  drawPlayer();
  drawCarriedRedEnemies();
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
