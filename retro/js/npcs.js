// Quest state
let hasOrange = false;
let edwinGaveKey = false;

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
    name: 'Edwin',
    id: 'edwin',
    sprite: 'capy2',
    x: 1560, w: 43, h: 44,
    flipX: true,
    get y() { return GROUND_Y - this.h; },
    get lines() {
      if (!hasOrange) {
        return [
          "Things in this world are so fleeting.",
          "The things you love can go away so fast.\nIt's best to never get too attached.",
          "I don't like endings...",
          "But I do like the rain...",
        ];
      } else if (!edwinGaveKey) {
        return [
          "Axo...",
          "Where did you find this?",
          "Did you go looking for this...for me?",
          "I don't know what to say...",
          "I didn't know anyone even\nthought of me anymore.",
          "This means so much.",
          "Thank you, Axo. You are\ncourageous and kind.",
          "I owe you.",
          "It may not mean much, but\ntake this golden key.\nI found it in the reeds.",
        ];
      } else {
        return [
          "Thank you, Axo.",
        ];
      }
    },
  },
  // Second land section: Edgar only (no second Edwin)
  {
    name: 'Edgar',
    id: 'edgar2',
    sprite: 'cap',
    x: 4390, w: 43, h: 44,
    flipX: false,
    get y() { return LAND2_Y - this.h; },
    lines: [
      "I'm sorry about Edwin.\nHe's lost so much.",
      "He lost his whole family in\nthe freeze last winter, and I\nthink he's just starting to\nrealize they aren't coming back",
      "He even lost his orange...",
      "Can you help find it for him?",
      "It may not do much but...",
      "It's worth a try",
    ],
  },
];

// Decorative pool fish — swim inside WATER_ZONE_2
const poolFish = Array.from({ length: 5 }, (_, i) => ({
  x: WATER_ZONE_2.x + 20 + i * 30,
  phase: (i * 1.3),
  speed: 0.35 + i * 0.06,
  dir: i % 2 === 0 ? 1 : -1,
}));

function nearNpc() {
  const playerCx = player.x + player.w / 2;
  return npcs.find(n => Math.abs(playerCx - (n.x + n.w / 2)) < TALK_DISTANCE) || null;
}

function onDialogClose(npc) {
  if (npc.id === 'edwin' && hasOrange && !edwinGaveKey) {
    edwinGaveKey = true;
    npc.sprite = 'cap';
    spawnGoldenKey();
  }
}

function drawPoolFish() {
  const t = Date.now() * 0.001;
  const POOL_X = WATER_ZONE_2.x;
  const POOL_W = WATER_ZONE_2.w;
  const FISH_Y_BASE = WATER_ZONE_2.y + 40;

  for (const f of poolFish) {
    f.x += f.speed * f.dir * 0.4;
    const relX = f.x - POOL_X;
    if (relX < 8)           { f.x = POOL_X + 8;         f.dir = 1; }
    if (relX > POOL_W - 12) { f.x = POOL_X + POOL_W - 12; f.dir = -1; }

    const fx = Math.round(f.x - cameraX);
    const fy = Math.round(FISH_Y_BASE - cameraY + Math.sin(t * f.speed + f.phase) * 5);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (f.dir < 0) { ctx.scale(-1, 1); }
    const d = f.dir < 0 ? -fx - 5 : fx;
    // body
    ctx.fillStyle = '#f4c430';
    ctx.fillRect(d + 1, fy,     3, 1);
    ctx.fillRect(d,     fy + 1, 4, 1);
    ctx.fillRect(d + 1, fy + 2, 2, 1);
    // eye
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(d + 3, fy + 1, 1, 1);
    // tail
    ctx.fillStyle = '#c8a000';
    ctx.fillRect(d - 1, fy,     1, 1);
    ctx.fillRect(d - 1, fy + 2, 1, 1);
    ctx.restore();
  }
}

function drawNpcs() {
  // draw pool fish (only when visible near pool)
  const poolSx = WATER_ZONE_2.x - cameraX;
  if (poolSx > -WATER_ZONE_2.w && poolSx < VIEW_W + WATER_ZONE_2.w) {
    drawPoolFish();
  }

  const playerCx = player.x + player.w / 2;
  for (const npc of npcs) {
    const sprKey = npc.sprite;
    if (!sprites[sprKey] || !sprites[sprKey].naturalWidth) continue;
    const sx = Math.round(npc.x - cameraX);
    const sy = Math.round(npc.y - cameraY);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (npc.flipX) {
      ctx.scale(-1, 1);
      ctx.drawImage(sprites[sprKey], -(sx + npc.w), sy, npc.w, npc.h);
    } else {
      ctx.drawImage(sprites[sprKey], sx, sy, npc.w, npc.h);
    }
    ctx.restore();

    // Orange on Edwin's head when he says "This means so much."
    if (npc.id === 'edwin' && dialog.active && dialog.npc === npc &&
        hasOrange && !edwinGaveKey && dialog.page === 5) {
      const ox = sx + Math.floor(npc.w / 2) - 5;
      const oy = sy - 11;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#ff8c00';
      ctx.fillRect(ox + 1, oy + 1, 7, 7);
      ctx.fillRect(ox,     oy + 2, 9, 5);
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(ox + 2, oy + 2, 2, 2);
      ctx.fillStyle = '#cc6600';
      ctx.fillRect(ox + 6, oy + 4, 2, 3);
      ctx.fillStyle = '#4a7c20';
      ctx.fillRect(ox + 4, oy,     1, 2);
      ctx.restore();
    }

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
