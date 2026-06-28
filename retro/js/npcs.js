const npcs = [
  {
    name: 'Edgar',
    sprite: 'cap',
    x: 1380, w: 43, h: 44,
    flipX: false,
    get y() { return GROUND_Y - this.h; },
    lines: [
      "Axo? You're up late.",
      "I come here at night\nsometimes to think...",
      "Sometimes things can be\nso overwhelming, and it\nhelps to be alone.",
      "Don't you think?",
    ],
  },
  {
    name: 'Enrique',
    sprite: 'capy2',
    x: 1560, w: 43, h: 44,
    flipX: true,
    get y() { return GROUND_Y - this.h; },
    lines: [
      "Things in this world are so fleeting.",
      "The things you love can go away so fast.\nIt's best to never get too attached.",
      "I don't like endings...",
      "But I do like the rain...",
    ],
  },
];

function nearNpc() {
  const playerCx = player.x + player.w / 2;
  return npcs.find(n => Math.abs(playerCx - (n.x + n.w / 2)) < TALK_DISTANCE) || null;
}

function drawNpcs() {
  const playerCx = player.x + player.w / 2;
  for (const npc of npcs) {
    if (!sprites[npc.sprite].naturalWidth) continue;
    const sx = Math.round(npc.x - cameraX);
    const sy = Math.round(npc.y - cameraY);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (npc.flipX) {
      ctx.scale(-1, 1);
      ctx.drawImage(sprites[npc.sprite], -(sx + npc.w), sy, npc.w, npc.h);
    } else {
      ctx.drawImage(sprites[npc.sprite], sx, sy, npc.w, npc.h);
    }
    ctx.restore();

    const nearby = Math.abs(playerCx - (npc.x + npc.w / 2)) < TALK_DISTANCE;
    if (nearby && !dialog.active) {
      ctx.font = PIXEL_FONT_SM;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#f8b4d9';
      ctx.fillText('[M] Talk', Math.round(sx + npc.w / 2), sy - 3);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }
}
