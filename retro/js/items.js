// Collectible items: orange + golden key + coins

const COIN_Y_WATER = WATER_ZONE.y - 90;
// groups of 10 coins spaced 18px apart, placed above the water
const _coinGroups = [1760, 2100, 2460, 2820, 3180, 3540];
const coins = _coinGroups.flatMap(startX =>
  Array.from({ length: 10 }, (_, i) => ({ x: startX + i * 18, y: COIN_Y_WATER }))
).map(c => ({ ...c, w: 8, h: 10, collected: false, bobPhase: Math.random() * Math.PI * 2 }));

const orange = {
  x: WATER_ZONE_2.x + WATER_ZONE_2.w / 2 - 6,
  y: WATER_ZONE_2.y + 560,
  w: 12, h: 12,
  collected: false,
  bobPhase: 0,
};

const goldenKey = {
  x: 1640,
  y: GROUND_Y - 20,
  w: 14, h: 10,
  active: false,
  collected: false,
  bobPhase: 0,
};

let levelComplete = false;
let levelCompleteTimer = 0;

function spawnGoldenKey() {
  goldenKey.active = true;
  goldenKey.collected = false;
  // spawns above Edwin's head
  goldenKey.x = 1560 + 43 / 2 - goldenKey.w / 2;
  goldenKey.y = GROUND_Y - 44 - 30;
}

function updateItems() {
  if (levelComplete) {
    levelCompleteTimer++;
    return;
  }

  const pcx = player.x + player.w / 2;
  const pcy = player.y + player.h / 2;

  // Coins
  for (const c of coins) {
    if (c.collected) continue;
    c.bobPhase += 0.07;
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2 + Math.sin(c.bobPhase) * 2;
    if (Math.abs(pcx - cx) < player.w / 2 + c.w / 2 + 2 &&
        Math.abs(pcy - cy) < player.h / 2 + c.h / 2 + 2) {
      c.collected = true;
    }
  }

  // Orange pick-up
  if (!orange.collected) {
    orange.bobPhase += 0.06;
    const ox = orange.x + orange.w / 2;
    const oy = orange.y + orange.h / 2 + Math.sin(orange.bobPhase) * 2;
    if (Math.abs(pcx - ox) < (player.w / 2 + orange.w / 2) &&
        Math.abs(pcy - oy) < (player.h / 2 + orange.h / 2)) {
      orange.collected = true;
      hasOrange = true;
      playSound('getorange');
    }
  }

  // Golden key pick-up
  if (goldenKey.active && !goldenKey.collected) {
    goldenKey.bobPhase += 0.07;
    const kx = goldenKey.x + goldenKey.w / 2;
    const ky = goldenKey.y + goldenKey.h / 2 + Math.sin(goldenKey.bobPhase) * 3;
    if (Math.abs(pcx - kx) < (player.w / 2 + goldenKey.w / 2 + 4) &&
        Math.abs(pcy - ky) < (player.h / 2 + goldenKey.h / 2 + 4)) {
      goldenKey.collected = true;
      levelComplete = true;
      levelCompleteTimer = 0;
    }
  }
}

function drawCoins() {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const c of coins) {
    if (c.collected) continue;
    const sx = Math.round(c.x - cameraX);
    const sy = Math.round(c.y - cameraY + Math.sin(c.bobPhase) * 2);
    if (sx + c.w < 0 || sx > VIEW_W) continue;
    // coin body
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(sx + 2, sy,     4, 1);
    ctx.fillRect(sx + 1, sy + 1, 6, 1);
    ctx.fillRect(sx,     sy + 2, 8, 5);
    ctx.fillRect(sx + 1, sy + 7, 6, 1);
    ctx.fillRect(sx + 2, sy + 8, 4, 1);
    // highlight
    ctx.fillStyle = '#ffe866';
    ctx.fillRect(sx + 2, sy + 1, 2, 3);
    // shade
    ctx.fillStyle = '#cc9900';
    ctx.fillRect(sx + 5, sy + 3, 2, 4);
    ctx.fillRect(sx + 4, sy + 6, 2, 2);
    // inner detail line
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(sx + 3, sy + 2, 1, 5);
  }
  ctx.restore();
}

function drawOrange() {
  if (orange.collected) return;
  const bob = Math.sin(orange.bobPhase) * 2;
  const sx = Math.round(orange.x - cameraX);
  const sy = Math.round(orange.y - cameraY + bob);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // 12×12 pixel orange
  // Body
  ctx.fillStyle = '#ff8c00';
  ctx.fillRect(sx + 2, sy + 1, 8, 9);
  ctx.fillRect(sx + 1, sy + 2, 10, 7);
  // Highlight
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(sx + 3, sy + 2, 3, 3);
  // Shade
  ctx.fillStyle = '#cc6600';
  ctx.fillRect(sx + 7, sy + 5, 3, 4);
  ctx.fillRect(sx + 5, sy + 8, 4, 2);
  // Stem
  ctx.fillStyle = '#4a7c20';
  ctx.fillRect(sx + 5, sy,     2, 2);
  // Leaf
  ctx.fillStyle = '#5c9a28';
  ctx.fillRect(sx + 7, sy,     3, 1);
  ctx.fillRect(sx + 8, sy + 1, 2, 1);

  // Glow — pre-rendered radial gradient
  if (!drawOrange._glowOC) {
    drawOrange._glowOC = getOC('orange_glow', 20, 20);
    const gc = drawOrange._glowOC._ctx;
    const grd = gc.createRadialGradient(10, 10, 1, 10, 10, 10);
    grd.addColorStop(0, 'rgba(255,180,60,0.30)');
    grd.addColorStop(1, 'rgba(255,180,60,0)');
    gc.fillStyle = grd;
    gc.fillRect(0, 0, 20, 20);
  }
  ctx.drawImage(drawOrange._glowOC, sx - 4, sy - 4);
  ctx.restore();
}

function drawGoldenKey() {
  if (!goldenKey.active || goldenKey.collected) return;
  const bob = Math.sin(goldenKey.bobPhase) * 3;
  const sx = Math.round(goldenKey.x - cameraX);
  const sy = Math.round(goldenKey.y - cameraY + bob);

  const t = frameNow * 0.003;
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Shimmer glow
  ctx.globalAlpha = 0.22 + Math.sin(t) * 0.1;
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(sx - 3, sy - 3, goldenKey.w + 6, goldenKey.h + 6);
  ctx.globalAlpha = 1;

  // Key shaft
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(sx + 5, sy + 3, 9, 4);
  // Key bow (ring)
  ctx.fillRect(sx,     sy + 1, 6, 8);
  ctx.fillStyle = '#cc9900';
  ctx.fillRect(sx + 1, sy + 2, 4, 6); // inner shadow
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(sx + 2, sy + 3, 2, 4); // hole
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(sx + 2, sy + 3, 2, 4); // punch hole
  // Teeth on shaft
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(sx + 10, sy + 7, 2, 3);
  ctx.fillRect(sx + 13, sy + 7, 2, 2);
  // Highlight
  ctx.fillStyle = '#ffe866';
  ctx.fillRect(sx + 1, sy + 1, 3, 2);
  ctx.fillRect(sx + 6, sy + 3, 4, 1);

  ctx.restore();

  // Floating label
  ctx.save();
  ctx.font = PIXEL_FONT_SM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#ffd700';
  ctx.globalAlpha = 0.85 + Math.sin(t * 2) * 0.15;
  ctx.fillText('GOLDEN KEY', Math.round(sx + goldenKey.w / 2), sy - 4);
  ctx.restore();
}

function drawLevelComplete() {
  if (!levelComplete) return;

  const alpha = Math.min(levelCompleteTimer / 60, 1);

  // Dark overlay
  ctx.save();
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();

  if (levelCompleteTimer < 20) return;

  const ta = Math.min((levelCompleteTimer - 20) / 40, 1);

  ctx.save();
  ctx.globalAlpha = ta;

  // Main text
  ctx.font = '16px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Gold glow
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 12;
  ctx.fillText('LEVEL CLEAR!', VIEW_W / 2, VIEW_H / 2 - 18);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.font = PIXEL_FONT_SM;
  ctx.fillStyle = '#f0e6ff';
  ctx.fillText('Axo found Edwin\'s orange', VIEW_W / 2, VIEW_H / 2 + 8);
  ctx.fillText('and unlocked the way forward.', VIEW_W / 2, VIEW_H / 2 + 22);

  if (levelCompleteTimer > 120) {
    ctx.fillStyle = '#b07aff';
    ctx.fillText('Thanks for playing!', VIEW_W / 2, VIEW_H / 2 + 44);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
