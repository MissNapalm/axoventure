// Quest state
let hasOrange = false;
let edwinGaveKey = false;
let edwinPhase = 'pre'; // 'pre' | 'thanked'

// Edgar (second land section) dialog depends on quest phase
function edgarLand2Lines() {
  return [
    "Oh! Axo, you made it\nthrough the water!",
    "My brother Edwin is just\nover there. He's been very\nsad lately...",
    "He lost his family in\nthe great freeze, and now\nhe's lost his orange too.",
    "It's a special orange.\nHe dropped it in that\nlittle pool back there.",
    "Could you dive in and\nfind it for him?",
  ];
}

function edwinLand2Lines() {
  if (!hasOrange) {
    return [
      "...",
      "I lost everything in\nthe freeze. My family...",
      "And now even my orange\nis gone. It fell into\nthe pool.",
      "It was the last thing\nI had left of home.",
    ];
  } else if (!edwinGaveKey) {
    return [
      "My orange...! You found it!",
      "I can't believe it.\nThank you, Axo.",
      "Here. Take this.\nI've been holding onto it\nbut I think you need\nit more than I do.",
      "It's a golden key.\nI don't know what it\nopens, but it feels\nimportant.",
    ];
  } else {
    return [
      "Thank you for everything,\nAxo. Really.",
      "I think things might\nbe okay after all.",
    ];
  }
}

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
  // Second land section NPCs
  {
    name: 'Edgar',
    id: 'edgar2',
    sprite: 'cap',
    x: 4360, w: 43, h: 44,
    flipX: false,
    get y() { return LAND2_Y - this.h; },
    get lines() { return edgarLand2Lines(); },
  },
  {
    name: 'Edwin',
    id: 'edwin2',
    sprite: 'capy2',   // will switch to 'cap' after giving orange
    x: 4900, w: 43, h: 44,
    flipX: true,
    get y() { return LAND2_Y - this.h; },
    get lines() { return edwinLand2Lines(); },
  },
];

// Decorative pool fish (tiny, harmless, just visuals)
const poolFish = Array.from({ length: 6 }, (_, i) => ({
  x: 4480 + i * 22,
  phase: Math.random() * Math.PI * 2,
  speed: 0.4 + Math.random() * 0.3,
  dir: i % 2 === 0 ? 1 : -1,
}));

function nearNpc() {
  const playerCx = player.x + player.w / 2;
  return npcs.find(n => Math.abs(playerCx - (n.x + n.w / 2)) < TALK_DISTANCE) || null;
}

function onDialogClose(npc) {
  if (npc.id === 'edwin2' && hasOrange && !edwinGaveKey) {
    edwinGaveKey = true;
    npc.sprite = 'cap'; // sprite change: Edwin now holds orange, uses cap sprite
    spawnGoldenKey();
  }
}

function drawDecorativePool() {
  // Pool: a small indentation in the land at x=4460–4620, depth ~30px
  const POOL_X = 4460;
  const POOL_W = 160;
  const POOL_Y = LAND2_Y;
  const POOL_D = 28; // visual depth

  const sx = Math.round(POOL_X - cameraX);
  const sy = Math.round(POOL_Y - cameraY);

  // Water fill
  const g = ctx.createLinearGradient(sx, sy, sx, sy + POOL_D);
  g.addColorStop(0, 'rgba(40,120,200,0.75)');
  g.addColorStop(1, 'rgba(10,40,100,0.90)');
  ctx.fillStyle = g;
  ctx.fillRect(sx, sy, POOL_W, POOL_D);

  // Shimmer
  const t = Date.now() * 0.001;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#7ec8e3';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const lx = sx + 8 + (i * 50 + Math.sin(t + i) * 6) % (POOL_W - 16);
    ctx.beginPath(); ctx.moveTo(lx, sy + 4); ctx.lineTo(lx + 16, sy + 4); ctx.stroke();
  }
  ctx.restore();

  // Pool rim / edges (dark soil walls)
  ctx.fillStyle = '#2e2218';
  ctx.fillRect(sx - 4, sy, 4, POOL_D);
  ctx.fillRect(sx + POOL_W, sy, 4, POOL_D);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(sx, sy + POOL_D, POOL_W, 4);

  // Tiny decorative fish inside the pool
  const FISH_Y = sy + POOL_D / 2;
  for (let i = 0; i < poolFish.length; i++) {
    const f = poolFish[i];
    // bob & swim
    f.x += f.speed * f.dir * 0.5;
    const relX = f.x - POOL_X;
    if (relX < 6)  { f.x = POOL_X + 6;       f.dir = 1; }
    if (relX > POOL_W - 10) { f.x = POOL_X + POOL_W - 10; f.dir = -1; }

    const fx = Math.round(f.x - cameraX);
    const fy = Math.round(FISH_Y + Math.sin(t * f.speed + f.phase) * 3);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // tiny 5×3 fish pixel art
    if (f.dir < 0) { ctx.scale(-1, 1); }
    const draw = f.dir < 0 ? -fx - 5 : fx;
    ctx.fillStyle = '#f4c430'; // golden-yellow tiny fish
    ctx.fillRect(draw + 1, fy,     3, 1);
    ctx.fillRect(draw,     fy + 1, 4, 1);
    ctx.fillRect(draw + 1, fy + 2, 2, 1);
    ctx.fillStyle = '#1a1a2e'; // eye
    ctx.fillRect(draw + 3, fy + 1, 1, 1);
    // tail
    ctx.fillStyle = '#c8a000';
    ctx.fillRect(draw - 1, fy,     1, 1);
    ctx.fillRect(draw - 1, fy + 2, 1, 1);
    ctx.restore();
  }
}

function drawNpcs() {
  drawDecorativePool();

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
