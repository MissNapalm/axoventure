const lightning = {
  boltEnd: 0, flashStart: 0, flashEnd: 0,
  nextIn: 300, cooldown: 0, bolt: null,
};

function makeBranchSet(cx, cy, forkChance, biasX, stepDX, stepDY, maxY, forkSteps) {
  const segs = [], branches = [];
  let x = cx, y = cy;
  while (y < maxY) {
    const dx = Math.floor(Math.random() * stepDX * 2 + 1) - stepDX + biasX;
    const dy = Math.floor(Math.random() * stepDY) + Math.ceil(stepDY * 0.5);
    segs.push({ x1: x, y1: y, x2: x + dx, y2: y + dy });
    x += dx; y += dy;
    if (Math.random() < forkChance && y < maxY * 0.75) {
      let bx = x, by = y;
      for (let i = 0; i < forkSteps; i++) {
        const fdx = Math.floor(Math.random() * stepDX * 2 + 1) - stepDX + biasX;
        const fdy = Math.floor(Math.random() * stepDY) + Math.ceil(stepDY * 0.5);
        branches.push({ x1: bx, y1: by, x2: bx + fdx, y2: by + fdy });
        bx += fdx; by += fdy;
      }
    }
  }
  return { segs, branches };
}

function makeBolt(x) {
  const count = Math.floor(Math.random() * 2) + 1; // 1 or 2 trunks
  const offsets = count === 1 ? [0] : [-6, 6];
  let segs = [], branches = [];
  for (const ox of offsets) {
    const b = makeBranchSet(x + ox, -VIEW_H, 0.45, ox < 0 ? -1 : ox > 0 ? 1 : 0, 3, 5, VIEW_H * 1.7, 4);
    segs = [...segs, ...b.segs];
    branches = [...branches, ...b.branches];
  }
  return { segs, branches };
}

function triggerLightning(screenX) {
  const now = performance.now();
  const boltMs  = S.boltDur  * (1000 / 60);
  const flashMs = S.flashDur * (1000 / 60);
  const delayMs = S.flashDelay * (1000 / 60);
  lightning.boltEnd    = now + boltMs;
  lightning.flashStart = now + delayMs;
  lightning.flashEnd   = now + delayMs + flashMs;
  lightning.bolt       = makeBolt(screenX !== undefined ? screenX : Math.floor(Math.random() * (VIEW_W - 60) + 30));
}

function updateLightning() {
  // lightning now only fires on kills via triggerLightning()
}

function drawLightning() {
  if (!lightning.bolt) return;
  if (player.inWater) return;

  const drawPixelLine = (x1, y1, x2, y2, color) => {
    ctx.fillStyle = color;
    const dx = x2 - x1, dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= steps; i++) {
      const s = steps === 0 ? 0 : i / steps;
      ctx.fillRect(Math.round(x1 + dx * s), Math.round(y1 + dy * s), 1, 1);
    }
  };

  const now = performance.now();

  if (S.boltDur > 0 && now < lightning.boltEnd) {
    const alpha = (lightning.boltEnd - now) / (S.boltDur * (1000 / 60));
    for (const s of lightning.bolt.segs) {
      ctx.globalAlpha = alpha;
      drawPixelLine(s.x1, s.y1, s.x2, s.y2, '#ffffff');
      ctx.globalAlpha = alpha * 0.4;
      drawPixelLine(s.x1 - 1, s.y1, s.x2 - 1, s.y2, '#aad4ff');
      drawPixelLine(s.x1 + 1, s.y1, s.x2 + 1, s.y2, '#aad4ff');
    }
    for (const b of lightning.bolt.branches) {
      ctx.globalAlpha = alpha * 0.7;
      drawPixelLine(b.x1, b.y1, b.x2, b.y2, '#ffffff');
      ctx.globalAlpha = alpha * 0.25;
      drawPixelLine(b.x1 + 1, b.y1, b.x2 + 1, b.y2, '#aad4ff');
    }
    ctx.globalAlpha = 1;

    // dim blue-white flash — not pure white, safe brightness
    const flashAlpha = alpha * alpha * 0.3;
    ctx.fillStyle = 'rgba(180,220,255,' + flashAlpha + ')';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

}
