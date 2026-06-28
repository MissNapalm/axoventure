// Tint a sprite with a color, return offscreen canvas
function tintSprite(spr, color) {
  const oc = document.createElement('canvas');
  oc.width = spr.naturalWidth; oc.height = spr.naturalHeight;
  const c = oc.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(spr, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = color;
  c.fillRect(0, 0, oc.width, oc.height);
  return oc;
}

// platforms[1]=y175, [2]=y155, [3]=y135  (oneWay platforms near the start)
function makeEnemy(x, patrolLeft, patrolRight, platformY) {
  return {
    x, startX: x,
    w: 0, h: 0,
    get y() { return platformY - this.h; },
    platformY,
    patrolSpeed: 0.8,
    vx: 0.8,
    patrolLeft, patrolRight,
    hp: 2,
    shakeTimer: 0,
    stunTimer: 0,
    hitFlash: 0,
    hitTextTimer: 0,
    deathFlash: 0,
    frame: 0, frameTimer: 0,
    dead: false,
    respawnTimer: 0,
    particles: [],
  };
}

const enemies = [
  // upper section
  makeEnemy(100,   80,  155, 175),
  makeEnemy(530,  500,  585, 165),
  makeEnemy(680,  650,  720, 140),
  makeEnemy(950,  920, 995,  148),
  makeEnemy(1230, 1200, 1275, 155),
];

function makeRedEnemy(x, patrolLeft, patrolRight, platformY) {
  return {
    red: true,
    x, startX: x,
    w: 0, h: 0,
    get y() {
      if (this.carried) {
        const jumpExtra = player.onGround ? 0 : S.carryJumpY;
        return player.y - this.h + S.carryOffset + jumpExtra;
      }
      if (this.flipped || this.thrown) return this._y;
      return platformY - this.h;
    },
    _y: 0,
    platformY,
    patrolSpeed: 0.5,
    vx: 0.5, vy: 0,
    patrolLeft, patrolRight,
    dead: false,
    flipped: false,   // on back after homing hit
    flippedTimer: 0,  // counts up while flipped; resets to patrol after 3s
    flipping: false,  // mid-air arc before landing upside down
    carried: false,   // player is holding it
    thrown: false,    // in flight
    throwAngle: 0,
    hitFlash: 0,
    frame: 0, frameTimer: 0,
    jitterX: 0, jitterY: 0, jitterTimer: 0,
    particles: [],
  };
}

const redEnemies = [
  makeRedEnemy(300, 260, 380, GROUND_Y),
  makeRedEnemy(720, 680, 800, GROUND_Y),
];

// called from player.js when homing into a red enemy
function flipRedEnemy(e) {
  e.flipping = true;
  e.flipped = false;
  e._y = e.y;
  e.vy = -5;
  e.vx = 0;
  e.hitFlash = HIT_FLASH_FRAMES;
}

// called from player.js when walking into a flipped red enemy
function carryRedEnemy(e) {
  e.flipped = false;
  e.carried = true;
}

// called from player.js on M press while carrying
function throwRedEnemy(e) {
  e.carried = false;
  e.thrown = true;
  e._y = player.y - e.h / 2;
  e.vx = player.facingLeft ? -S.throwStrength : S.throwStrength;
  e.vy = -5;
}

function updateRedEnemies() {
  for (const e of redEnemies) {
    if (e.hitFlash > 0) e.hitFlash--;

    // particles — life only; physics handled in draw
    for (const p of e.particles) p.life--;
    e.particles = e.particles.filter(p => p.life > 0);

    if (e.dead) {
      const dist = Math.abs((e.startX + e.w / 2) - (player.x + player.w / 2));
      if (dist > VIEW_W) {
        e.x = e.startX; e._y = e.platformY - e.h;
        e.vx = e.patrolSpeed; e.vy = 0;
        e.dead = false; e.flipped = false; e.flippedTimer = 0; e.flipping = false; e.carried = false; e.thrown = false;
        e.hitFlash = 0; e.frame = 0; e.frameTimer = 0; e.throwAngle = 0;
        e.jitterX = 0; e.jitterY = 0; e.jitterTimer = 0; e.particles = [];
      }
      continue;
    }

    if (e.carried) {
      e.frameTimer++;
      if (e.frameTimer >= 10) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }
      const xOff = player.facingLeft ? S.carryOffsetL : S.carryOffsetR;
      e.x = player.x + player.w / 2 - e.w / 2 + xOff;
      // touching a normal enemy while carried kills both
      for (const ne of enemies) {
        if (ne.dead) continue;
        const ox = Math.min(e.x + e.w, ne.x + ne.w) - Math.max(e.x, ne.x);
        const oy = Math.min(e.y + e.h, ne.y + ne.h) - Math.max(e.y, ne.y);
        if (ox > 0 && oy > 0) {
          ne.dead = true; spawnDeathStars(ne);
          e.dead = true; spawnDeathStars(e);
          triggerLightning(Math.round(e.x + e.w / 2 - cameraX));
          screenShakeTimer = 6;
          player.carrying = null;
          player.killText = { text: 'THROW HIT!', timer: 50, x: e.x + e.w / 2, y: e.y - 12 };
          break;
        }
      }
      continue;
    }

    if (e.flipping) {
      e.throwAngle += 0.18;
      e.vy += S.redFlipGrav;
      e._y += e.vy;
      if (e._y + e.h >= e.platformY) {
        e._y = e.platformY - e.h;
        e.flipping = false;
        e.flipped = true; e.flippedTimer = 0;
        e.vy = 0; e.throwAngle = 0;
      }
      continue;
    }

    if (e.thrown) {
      e.throwAngle += e.vx * 0.07;
      e.vy += 0.25;
      e.x  += e.vx;
      e._y += e.vy;

      // check collision with normal enemies
      for (const ne of enemies) {
        if (ne.dead) continue;
        const ox = Math.min(e.x + e.w, ne.x + ne.w) - Math.max(e.x, ne.x);
        const oy = Math.min(e._y + e.h, ne.y + ne.h) - Math.max(e._y, ne.y);
        if (ox > 0 && oy > 0) {
          ne.dead = true; spawnDeathStars(ne);
          e.dead  = true; spawnDeathStars(e);
          triggerLightning(Math.round(e.x + e.w / 2 - cameraX));
          screenShakeTimer = 6;
          player.killText = { text: 'THROW HIT!', timer: 50, x: e.x + e.w / 2, y: e._y - 12 };
          break;
        }
      }
      if (e.dead) continue;

      // platform bounce
      for (const p of platforms) {
        const ox = Math.min(e.x + e.w, p.x + p.w) - Math.max(e.x, p.x);
        if (ox <= 0) continue;
        const prevBottom = e._y + e.h - e.vy;
        if (e.vy > 0 && prevBottom <= p.y + 1 && e._y + e.h >= p.y) {
          e._y = p.y - e.h;
          e.vy *= -0.5;
          e.vx *= 0.85;
          if (Math.abs(e.vy) < 1) { e.thrown = false; e.flipped = true; e.flippedTimer = 0; e.vx = 0; e.vy = 0; }
        }
      }

      // hit ground
      if (e._y + e.h >= e.platformY) {
        e._y = e.platformY - e.h;
        e.vy *= -0.45;
        e.vx *= 0.8;
        if (Math.abs(e.vy) < 1) { e.thrown = false; e.flipped = true; e.flippedTimer = 0; e.vx = 0; e.vy = 0; }
      }
      continue;
    }

    // always animate (flipped, carried, or patrolling)
    e.frameTimer++;
    if (e.frameTimer >= 10) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }

    if (e.flipped) {
      e.flippedTimer++;
      if (e.flippedTimer >= 180) {
        e.flipped = false;
        e.flippedTimer = 0;
        e._y = 0;
        e.patrolLeft  = e.x - 40;
        e.patrolRight = e.x + 40;
        e.vx = e.patrolSpeed;
      }
      continue;
    }

    // patrol
    e.x += e.vx;
    if (e.x <= e.patrolLeft)        { e.x = e.patrolLeft;        e.vx =  Math.abs(e.vx); }
    if (e.x + e.w >= e.patrolRight) { e.x = e.patrolRight - e.w; e.vx = -Math.abs(e.vx); }

    // contact with player: dashing/homing flips them, walking hurts Axo
    if (!player.dashing && !player.groundDashing) {
      const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
      const oy = Math.min(player.y + player.h, e.y + e.h) - Math.max(player.y, e.y);
      if (ox > 0 && oy > 0) {
        // push player out
        if (ox < oy) {
          player.x += player.x + player.w / 2 < e.x + e.w / 2 ? -ox : ox;
          player.vx = 0;
        } else {
          player.y += player.y + player.h / 2 < e.y + e.h / 2 ? -oy : oy;
          player.vy = 0;
        }
        if (player.hurtTimer === 0) hurtPlayer();
      }
    }
  }
}

function getRedSprites() {}  // sprites loaded via assets.js

function drawRedEnemy(e) {
  if (e.dead || e.w === 0) return;
  const rSpr1 = sprites['redguy1'];
  const rSpr2 = sprites['redguy2'];
  if (!rSpr1.naturalWidth) return;

  const drawY = e.carried
    ? (player.y - e.h + S.carryOffset + (player.onGround ? 0 : S.carryJumpY))
    : (e.flipped ? e._y + S.flippedGndY : (e.flipping || e.thrown) ? e._y : e.y);
  const sx = Math.round(e.x - cameraX);
  const sy = Math.round(drawY - cameraY);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (e.hitFlash > 0) ctx.globalAlpha = 0.5 + 0.5 * (e.hitFlash / HIT_FLASH_FRAMES);

  const walkSpr = e.frame === 0 ? rSpr1 : rSpr2;
  if (e.carried) {
    ctx.translate(sx + e.w / 2, sy + e.h / 2);
    ctx.rotate(Math.PI);
    ctx.drawImage(walkSpr, -e.w / 2, -e.h / 2, e.w, e.h);
  } else if (e.flipping || e.thrown) {
    ctx.translate(sx + e.w / 2, sy + e.h / 2);
    ctx.rotate(e.throwAngle);
    ctx.drawImage(walkSpr, -e.w / 2, -e.h / 2, e.w, e.h);
  } else if (e.flipped) {
    ctx.translate(sx + e.w / 2, sy + e.h / 2);
    ctx.rotate(Math.PI);
    ctx.drawImage(walkSpr, -e.w / 2, -e.h / 2, e.w, e.h);
  } else if (e.vx > 0) {
    ctx.scale(-1, 1);
    ctx.drawImage(walkSpr, -(sx + e.w), sy, e.w, e.h);
  } else {
    ctx.drawImage(walkSpr, sx, sy, e.w, e.h);
  }
  ctx.restore();

  if (e.flipped && !player.carrying) {
    const dist = Math.abs((e.x + e.w / 2) - (player.x + player.w / 2));
    if (dist < 50) {
      ctx.save();
      ctx.font = PIXEL_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#ffaa00';
      ctx.fillText('[walk] pick up', sx + e.w / 2, sy - 3);
      ctx.restore();
    }
  }
}

function drawRedEnemies() {
  getRedSprites();
  for (const e of redEnemies) {
    drawParticles(e.particles);
    if (!e.carried) drawRedEnemy(e);
  }
}

function drawCarriedRedEnemies() {
  for (const e of redEnemies) {
    if (e.carried) drawRedEnemy(e);
  }
}

function spawnDeathStars(e) {
  const cx = e.x + e.w / 2;
  const cy = (e._y ? e._y : e.y) + e.h / 2;

  // wave 1 — massive fast white burst
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const speed = 4 + Math.random() * 9;
    e.particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 10 + Math.floor(Math.random() * 14),
      maxLife: 24,
      size: Math.random() < 0.4 ? 5 : Math.random() < 0.7 ? 3 : 2,
      color: '#ffffff',
      gravity: 0.22,
    });
  }

  // wave 2 — slower lingering white cloud
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    e.particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      life: 18 + Math.floor(Math.random() * 14),
      maxLife: 32,
      size: 3,
      color: '#ffffff',
      gravity: 0.06,
    });
  }

  // wave 3 — long white streaks
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const speed = 9 + Math.random() * 5;
    e.particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 8 + Math.floor(Math.random() * 4),
      maxLife: 12,
      size: 2, color: '#ffffff', gravity: 0, kind: 'line',
    });
  }
}

// ── Fish enemies ─────────────────────────────────────────────────────────────

function makeFish(x, y, swimLeft, swimRight) {
  return {
    fish: true,
    x, startX: x,
    y, startY: y,
    w: 20, h: 10,
    vx: 0.7, vy: 0,
    swimLeft, swimRight,
    bobPhase: Math.random() * Math.PI * 2,
    hp: 1,
    dead: false,
    hitFlash: 0,
    deathFlash: 0,
    particles: [],
  };
}

const fishEnemies = [
  makeFish(1900, 380, 1800, 2000),
  makeFish(2050, 450, 1950, 2200),
  makeFish(2250, 340, 2100, 2400),
  makeFish(2420, 500, 2300, 2550),
  makeFish(2600, 390, 2480, 2720),
  makeFish(2780, 460, 2650, 2900),
  makeFish(2950, 350, 2820, 3080),
  makeFish(1850, 560, 1750, 2050),
  makeFish(2150, 620, 2000, 2350),
  makeFish(2500, 580, 2380, 2650),
  makeFish(2750, 640, 2600, 2900),
];

function updateFish() {
  for (const e of fishEnemies) {
    for (const p of e.particles) p.life--;
    e.particles = e.particles.filter(p => p.life > 0);

    if (e.hitFlash > 0) e.hitFlash--;
    if (e.deathFlash > 0) e.deathFlash--;

    if (e.dead) {
      // respawn when player moves away
      if (Math.abs(e.startX - (player.x + player.w / 2)) > VIEW_W) {
        e.x = e.startX; e.y = e.startY;
        e.vx = 0.7; e.vy = 0;
        e.hp = 1; e.dead = false;
        e.hitFlash = 0; e.deathFlash = 0; e.particles = [];
      }
      continue;
    }

    // sine-wave bob
    e.bobPhase += 0.05;
    e.y = e.startY + Math.sin(e.bobPhase) * 8;

    // horizontal patrol
    e.x += e.vx;
    if (e.x <= e.swimLeft)             { e.x = e.swimLeft;         e.vx =  Math.abs(e.vx); }
    if (e.x + e.w >= e.swimRight)      { e.x = e.swimRight - e.w;  e.vx = -Math.abs(e.vx); }

    // hurt player on contact unless dashing/homing
    if (!player.dashing && !player.groundDashing && player.hurtTimer === 0) {
      const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
      const oy = Math.min(player.y + player.h, e.y + e.h) - Math.max(player.y, e.y);
      if (ox > 0 && oy > 0) hurtPlayer();
    }
  }
}

function drawFish() {
  for (const e of fishEnemies) {
    drawParticles(e.particles);
    if (e.dead && e.deathFlash <= 0) continue;

    const sx = Math.round(e.x - cameraX);
    const sy = Math.round(e.y - cameraY);
    const facingRight = e.vx > 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // white flash on hit/death
    const flashColor = (e.deathFlash > 0) ? 1 : (e.hitFlash > 0 ? e.hitFlash / HIT_FLASH_FRAMES : 0);

    ctx.translate(sx + e.w / 2, sy + e.h / 2);
    if (!facingRight) ctx.scale(-1, 1);

    // draw pixel fish body
    const d = ctx.createImageData(e.w, e.h);
    const px = d.data;
    // pixel layout (20×10): body=cyan-blue, fin=lighter, tail=darker, eye=white/black
    const body  = flashColor > 0 ? [255,255,255,255] : [40, 160, 200, 255];
    const fin   = flashColor > 0 ? [255,255,255,255] : [60, 200, 230, 255];
    const tail  = flashColor > 0 ? [255,255,255,255] : [20, 110, 160, 255];
    const eye   = flashColor > 0 ? [255,255,255,255] : [255, 255, 255, 255];
    const pupil = flashColor > 0 ? [255,255,255,255] : [10,  10,  10,  255];
    const set = (x2, y2, c) => {
      if (x2 < 0 || x2 >= e.w || y2 < 0 || y2 >= e.h) return;
      const i = (y2 * e.w + x2) * 4;
      px[i]=c[0]; px[i+1]=c[1]; px[i+2]=c[2]; px[i+3]=c[3];
    };
    // tail (left side, x 0-3)
    for (let y2 = 2; y2 <= 7; y2++) { set(0, y2, tail); set(1, y2, tail); }
    set(0, 1, tail); set(0, 8, tail);
    set(1, 1, tail); set(1, 8, tail);
    // body (x 2-15)
    for (let x2 = 2; x2 <= 15; x2++) {
      const top = x2 < 8 ? 2 : x2 < 12 ? 1 : 2;
      const bot = x2 < 8 ? 7 : x2 < 12 ? 8 : 7;
      for (let y2 = top; y2 <= bot; y2++) set(x2, y2, body);
    }
    // dorsal fin (x 5-9, y 0-1)
    for (let x2 = 5; x2 <= 9; x2++) { set(x2, 0, fin); set(x2, 1, fin); }
    // head bump (x 13-17)
    for (let x2 = 13; x2 <= 17; x2++) {
      const top = x2 < 16 ? 1 : 2;
      const bot = x2 < 16 ? 8 : 7;
      for (let y2 = top; y2 <= bot; y2++) set(x2, y2, fin);
    }
    // nose tip
    set(18, 3, fin); set(18, 4, fin); set(18, 5, fin); set(18, 6, fin);
    set(19, 4, fin); set(19, 5, fin);
    // eye
    set(15, 3, eye); set(16, 3, eye);
    set(15, 4, eye); set(16, 4, eye);
    set(15, 3, pupil);

    // create offscreen canvas from pixel data
    const oc = document.createElement('canvas');
    oc.width = e.w; oc.height = e.h;
    oc.getContext('2d').putImageData(d, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(oc, -e.w / 2, -e.h / 2, e.w, e.h);

    ctx.restore();
  }
}

function hitFish(e) {
  e.hp--;
  e.hitFlash = HIT_FLASH_FRAMES;
  if (e.hp <= 0) {
    e.deathFlash = 5;
    e.dead = true;
    spawnDeathStars(e);
    triggerLightning(Math.round(e.x + e.w / 2 - cameraX));
    screenShakeTimer = 6;
    if (player.dashing || player.groundDashing) player.killSpin = 10;
  }
}

function hitFishByHoming(e, impactX, impactY) {
  e.dead = true;
  e.deathFlash = 5;
  spawnDeathStars(e);
  triggerLightning(Math.round(impactX - cameraX));
  screenShakeTimer = 6;
  player.killSpin = 10;
  player.vx = player.x + player.w / 2 < impactX ? -S.redBounceBack : S.redBounceBack;
  player.vy = -3;
  hitFreezeTimer = HIT_FREEZE_FRAMES;
  spawnImpactVFX(impactX, impactY);
  player.killText = { text: 'HOMING HIT!', timer: 50, x: impactX, y: impactY - 12 };
}

function hitFishByDash(e, ex, ey) {
  e.dead = true;
  e.deathFlash = 5;
  spawnDeathStars(e);
  triggerLightning(Math.round(ex - cameraX));
  screenShakeTimer = 6;
  player.killSpin = 10;
  hitFreezeTimer = HIT_FREEZE_FRAMES;
  spawnImpactVFX(ex, ey);
  player.killText = { text: 'DASH HIT!', timer: 50, x: ex, y: ey - 12 };
}

// ── Big Fish enemies ──────────────────────────────────────────────────────────
// States: 'patrol' → 'windup' (invincible, telegraphs charge) → 'rush' → 'cooldown' → 'patrol'

const BIG_FISH_W = 28;
const BIG_FISH_H = 15;
const WINDUP_FRAMES  = 90;  // stun/telegraph duration
const RUSH_SPEED     = 9;
const RUSH_FRAMES    = 22;
const COOLDOWN_FRAMES = 60;
const PATROL_TRIGGER_DIST = 130; // how close player must be to trigger windup

function makeBigFish(x, y, swimLeft, swimRight) {
  return {
    bigFish: true,
    x, startX: x,
    y, startY: y,
    w: BIG_FISH_W, h: BIG_FISH_H,
    vx: 0.5, vy: 0,
    swimLeft, swimRight,
    bobPhase: Math.random() * Math.PI * 2,
    state: 'patrol', // 'patrol' | 'windup' | 'rush' | 'cooldown'
    stateTimer: 0,
    rushVx: 0, rushVy: 0,
    hp: 3,
    dead: false,
    deathFlash: 0,
    hitFlash: 0,
    particles: [],
  };
}

const bigFishEnemies = [
  makeBigFish(2000, 420, 1870, 2130),
  makeBigFish(2300, 500, 2170, 2450),
  makeBigFish(2650, 370, 2500, 2800),
  makeBigFish(3000, 480, 2860, 3150),
];

function updateBigFish() {
  for (const e of bigFishEnemies) {
    for (const p of e.particles) p.life--;
    e.particles = e.particles.filter(p => p.life > 0);

    if (e.deathFlash > 0) e.deathFlash--;
    if (e.hitFlash > 0) e.hitFlash--;

    if (e.dead) {
      if (Math.abs(e.startX - (player.x + player.w / 2)) > VIEW_W) {
        e.x = e.startX; e.y = e.startY;
        e.vx = 0.5; e.vy = 0;
        e.hp = 3; e.dead = false; e.deathFlash = 0; e.hitFlash = 0;
        e.state = 'patrol'; e.stateTimer = 0; e.particles = [];
        e.bobPhase = Math.random() * Math.PI * 2;
      }
      continue;
    }

    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;
    const ecx = e.x + e.w / 2;
    const ecy = e.y + e.h / 2;
    const dist = Math.hypot(pcx - ecx, pcy - ecy);

    if (e.state === 'patrol') {
      e.bobPhase += 0.04;
      e.y = e.startY + Math.sin(e.bobPhase) * 10;
      e.x += e.vx;
      if (e.x <= e.swimLeft)           { e.x = e.swimLeft;         e.vx =  Math.abs(e.vx); }
      if (e.x + e.w >= e.swimRight)    { e.x = e.swimRight - e.w;  e.vx = -Math.abs(e.vx); }


    } else if (e.state === 'windup') {
      // hold position, shake slightly, face player
      e.bobPhase += 0.15;
      e.y += Math.sin(e.bobPhase) * 0.8;
      e.vx = pcx > ecx ? 0.01 : -0.01; // just for facing direction
      e.stateTimer--;
      if (e.stateTimer <= 0) {
        // lock in rush direction toward player
        const angle = Math.atan2(pcy - ecy, pcx - ecx);
        e.rushVx = Math.cos(angle) * RUSH_SPEED;
        e.rushVy = Math.sin(angle) * RUSH_SPEED;
        e.vx = e.rushVx;
        e.state = 'rush';
        e.stateTimer = RUSH_FRAMES;
      }

    } else if (e.state === 'rush') {
      e.x += e.rushVx;
      e.y += e.rushVy;
      e.stateTimer--;

      // contact during rush always hurts — player must dash away
      const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
      const oy = Math.min(player.y + player.h, e.y + e.h) - Math.max(player.y, e.y);
      if (ox > 0 && oy > 0) {
        // knock player back hard
        player.vx = player.x + player.w / 2 < ecx ? -6 : 6;
        player.vy = player.y + player.h / 2 < ecy ? -4 : 4;
        player.knockbackTimer = 18;
        hurtPlayer();
        e.state = 'cooldown';
        e.stateTimer = COOLDOWN_FRAMES;
        e.rushVx = 0; e.rushVy = 0;
      }

      if (e.stateTimer <= 0) {
        e.state = 'cooldown';
        e.stateTimer = COOLDOWN_FRAMES;
        e.rushVx = 0; e.rushVy = 0;
      }

    } else if (e.state === 'cooldown') {
      // drift to a stop
      e.x += e.vx * 0.85;
      e.vx *= 0.85;
      e.y += e.vy;
      e.vy *= 0.85;
      e.bobPhase += 0.04;
      e.stateTimer--;
      if (e.stateTimer <= 0) {
        e.state = 'patrol';
        e.vx = 0.5;
        e.startY = e.y;
        // re-anchor patrol range around current position so it doesn't snap
        e.swimLeft  = e.x - 80;
        e.swimRight = e.x + 80 + e.w;
      }
    }

    // contact during patrol: push player out so they can't clip through
    if (e.state === 'patrol' && !player.dashing && !player.groundDashing) {
      const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
      const oy = Math.min(player.y + player.h, e.y + e.h) - Math.max(player.y, e.y);
      if (ox > 0 && oy > 0) {
        if (ox < oy) {
          player.x += player.x + player.w / 2 < e.x + e.w / 2 ? -ox : ox;
          player.vx = 0;
        } else {
          player.y += player.y + player.h / 2 < e.y + e.h / 2 ? -oy : oy;
          player.vy = 0;
        }
        if (player.hurtTimer === 0) hurtPlayer();
      }
    }
  }
}

function drawBigFish() {
  for (const e of bigFishEnemies) {
    drawParticles(e.particles);
    if (e.dead && e.deathFlash <= 0) continue;

    const sx = Math.round(e.x - cameraX);
    const sy = Math.round(e.y - cameraY);
    const facingRight = e.vx >= 0;
    const W = e.w, H = e.h;

    const isWindup  = e.state === 'windup';
    const isRush    = e.state === 'rush';
    const flash = e.deathFlash > 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(sx + W / 2, sy + H / 2);
    if (!facingRight) ctx.scale(-1, 1);

    // rush: motion lines behind fish
    if (isRush) {
      ctx.save();
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const lx = -W * 0.5 - i * 4;
        const ly = -H * 0.3 + i * (H * 0.2);
        const len = 4 + i * 2;
        ctx.globalAlpha = 0.7 - i * 0.15;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - len, ly);
        ctx.stroke();
      }
      ctx.restore();
    }

    // SNES-style pixel fish — exactly 28 wide × 15 tall
    // facing right: tail=left (col 0), head=right (col 27)
    const C = {
      K: flash ? [255,255,255,255] : [0,0,0,255],           // outline/dark
      D: flash ? [255,255,255,255] : isWindup||isRush ? [150,40,0,255]   : [15,80,130,255],  // dark body
      M: flash ? [255,255,255,255] : isWindup||isRush ? [210,80,10,255]  : [40,140,190,255], // mid body
      L: flash ? [255,255,255,255] : isWindup||isRush ? [240,130,40,255] : [80,190,230,255], // light body
      B: flash ? [255,255,255,255] : isWindup||isRush ? [255,180,90,255] : [160,225,245,255],// belly
      E: flash ? [255,255,255,255] : [255,255,255,255],      // eye white
      P: flash ? [255,255,255,255] : [10,10,10,255],         // pupil
    };
    // 28×15 map — each string must be exactly 28 chars
    const map = [
      'KK..........KKK.............',  // row 0  tail top prong + dorsal base
      '.KK.......KMMKK.............',  // row 1
      '..KK.....KMMMMLKK...........',  // row 2  dorsal fin
      'K..KK...KDDMMMLLKK..........',  // row 3
      'KK..KKKKDDDMMMLLLLKK........',  // row 4
      '.KK.KDDDDDMMMBBLLLKKK.......',  // row 5
      '..KKDDDDDDMMMBBLLLLKEPKKK...',  // row 6  eye row
      '..KKDDDDDDMMMBBLLLKKEPKLKK..',  // row 7  mouth row
      '..KKDDDDDDMMMBBLLLLKKKKLKK..',  // row 8
      '.KK.KDDDDDDMMMBBLLLKKKKK...',   // row 9  — 28 chars
      'KK..KKKKDDDDMMMLLLLKK.......',  // row 10
      'K..KK...KDDMMMLLLKK.........',  // row 11
      '..KK.....KMMMLKKK...........',  // row 12 ventral fin
      '.KK.......KMMKK.............',  // row 13
      'KK..........KK..............',  // row 14 tail bottom prong
    ];
    const d = ctx.createImageData(W, H);
    const px2 = d.data;
    for (let row = 0; row < H; row++) {
      const rowStr = map[row] || '';
      for (let col = 0; col < W; col++) {
        const ch = rowStr[col] || '.';
        const color = C[ch] || null;
        if (!color) continue;
        const i = (row * W + col) * 4;
        px2[i]=color[0]; px2[i+1]=color[1]; px2[i+2]=color[2]; px2[i+3]=color[3];
      }
    }
    // hitFlash tint overlay
    const oc2 = document.createElement('canvas');
    oc2.width = W; oc2.height = H;
    const oc2d = oc2.getContext('2d');
    oc2d.putImageData(d, 0, 0);
    if (e.hitFlash > 0 && !flash) {
      oc2d.globalCompositeOperation = 'source-atop';
      oc2d.globalAlpha = e.hitFlash / HIT_FLASH_FRAMES * 0.8;
      oc2d.fillStyle = '#ffffff';
      oc2d.fillRect(0, 0, W, H);
    }
    ctx.drawImage(oc2, -W/2, -H/2, W, H);

    ctx.restore();

    // warning exclamation during windup
    if (isWindup) {
      const pulse = Math.floor(Date.now() / 120) % 2 === 0;
      if (pulse) {
        ctx.save();
        ctx.font = PIXEL_FONT;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff4400';
        ctx.fillText('!', sx + W / 2, sy - 4);
        ctx.restore();
      }
    }
  }
}

function damageBigFish(e, impactX, impactY, text, bounceBack) {
  e.hp--;
  e.hitFlash = HIT_FLASH_FRAMES;
  hitFreezeTimer = HIT_FREEZE_FRAMES;
  spawnImpactVFX(impactX, impactY);
  screenShakeTimer = 4;
  if (bounceBack) {
    player.vx = player.x + player.w / 2 < impactX ? -S.redBounceBack : S.redBounceBack;
    player.vy = -3;
  }
  if (e.hp <= 0) {
    e.dead = true;
    e.deathFlash = 5;
    spawnDeathStars(e);
    triggerLightning(Math.round(impactX - cameraX));
    screenShakeTimer = 6;
    player.killSpin = 10;
    player.killText = { text, timer: 50, x: impactX, y: impactY - 12 };
  } else {
    // still alive — re-enter windup to charge again
    e.state = 'windup';
    e.stateTimer = WINDUP_FRAMES;
    e.vx = 0; e.rushVx = 0; e.rushVy = 0;
  }
}

function hitBigFishByHoming(e, impactX, impactY) {
  if (e.state === 'windup' || e.state === 'rush') return;
  damageBigFish(e, impactX, impactY, 'HOMING HIT!', true);
}

function hitBigFishByDash(e, ex, ey) {
  if (e.state === 'windup' || e.state === 'rush') return;
  damageBigFish(e, ex, ey, 'DASH HIT!', false);
}

// ─────────────────────────────────────────────────────────────────────────────

function hitEnemy(e) {
  e.hp--;
  e.hitFlash = HIT_FLASH_FRAMES;
  e.hitTextTimer = 40;
  e.vx = (e.x + e.w / 2 > player.x + player.w / 2) ? 4 : -4;
  if (e.hp <= 0) {
    e.deathFlash = 5;
    e.dead = true;
    spawnDeathStars(e);
    triggerLightning(Math.round(e.x + e.w / 2 - cameraX));
    screenShakeTimer = 6;
    if (player.dashing || player.groundDashing) player.killSpin = 10;
  } else {
    e.shakeTimer = 30;
  }
}

function updateEnemies() {
  for (const e of enemies) {
    // particles — life only; physics handled in draw
    for (const p of e.particles) p.life--;
    e.particles = e.particles.filter(p => p.life > 0);

    if (e.hitTextTimer > 0) e.hitTextTimer--;
    if (e.deathFlash > 0) e.deathFlash--;
    if (e.dead) {
      const distToPlayer = Math.abs((e.startX + e.w / 2) - (player.x + player.w / 2));
      if (distToPlayer > VIEW_W) {
        // player has walked away — respawn
        e.x = e.startX;
        e.vx = e.patrolSpeed;
        e.hp = 2;
        e.dead = false;
        e.shakeTimer = 0;
        e.stunTimer = 0;
        e.hitFlash = 0;
        e.frame = 0; e.frameTimer = 0;
        e.particles = [];
      }
      continue;
    }
    if (e.hitFlash > 0) e.hitFlash--;
    if (e.shakeTimer > 0) {
      e.shakeTimer--;
      if (e.shakeTimer === 0) e.stunTimer = S.stunFrames;
      continue;
    }
    if (e.stunTimer > 0) {
      e.stunTimer--;
      if (e.stunTimer === 0) {
        e.vx = e.vx >= 0 ? e.patrolSpeed : -e.patrolSpeed;
      }
      continue;
    }

    e.x += e.vx;
    if (e.x <= e.patrolLeft)        { e.x = e.patrolLeft;         e.vx =  Math.abs(e.vx); }
    if (e.x + e.w >= e.patrolRight) { e.x = e.patrolRight - e.w;  e.vx = -Math.abs(e.vx); }

    e.frameTimer++;
    if (e.frameTimer >= 10) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }

    // hurt player on contact unless dashing or homing
    if (!player.dashing && !player.groundDashing && player.hurtTimer === 0) {
      const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
      const oy = Math.min(player.y + player.h, e.y + e.h) - Math.max(player.y, e.y);
      if (ox > 0 && oy > 0) hurtPlayer();
    }
  }
}

function drawParticles(particles) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const alpha = p.life / p.maxLife;
    const sx = Math.round(p.x - cameraX);
    const sy = Math.round(p.y - cameraY);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.kind === 'circle') {
      p.r += p.speed;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'line') {
      ctx.strokeStyle = p.color || '#ffffff';
      ctx.lineWidth = p.size || 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      p.x += p.vx; p.y += p.vy;
      ctx.lineTo(Math.round(p.x - cameraX), Math.round(p.y - cameraY));
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color || '#ffffff';
      const s = p.size || 2;
      ctx.fillRect(sx - (s / 2 | 0), sy - (s / 2 | 0), s, s);
      if (p.gravity) p.vy += p.gravity;
      p.x += p.vx; p.y += p.vy;
    }
    ctx.restore();
  }
}

function drawEnemies() {
  for (const e of enemies) {
    drawParticles(e.particles);

    if (e.w === 0) continue;
    if (e.dead && e.deathFlash <= 0) continue;
    const sx = Math.round(e.x - cameraX);
    const sy = Math.round(e.y - cameraY);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const spr = e.deathFlash > 0
      ? sprites[e.frame === 0 ? 'badguy1' : 'badguy2']
      : (e.stunTimer > 0 || e.shakeTimer > 0)
        ? sprites[e.stunTimer > 0 ? 'badguy3' : (e.frame === 0 ? 'badguy1' : 'badguy2')]
        : sprites[e.frame === 0 ? 'badguy1' : 'badguy2'];

    // shake offset
    const shakeX = e.shakeTimer > 0 ? (Math.floor(e.shakeTimer / 3) % 2 === 0 ? 2 : -2) : 0;

    let drawX = sx + shakeX;

    if (e.hitFlash > 0 || e.deathFlash > 0) {
      const oc = document.createElement('canvas');
      oc.width = e.w; oc.height = e.h;
      const oc2d = oc.getContext('2d');
      oc2d.imageSmoothingEnabled = false;
      if (e.vx > 0) {
        oc2d.scale(-1, 1);
        oc2d.drawImage(spr, -e.w, 0, e.w, e.h);
      } else {
        oc2d.drawImage(spr, 0, 0, e.w, e.h);
      }
      oc2d.globalCompositeOperation = 'source-atop';
      oc2d.fillStyle = e.deathFlash > 0 ? 'rgba(255,255,255,1)' : `rgba(255,255,255,${e.hitFlash / HIT_FLASH_FRAMES})`;
      oc2d.fillRect(0, 0, e.w, e.h);
      ctx.drawImage(oc, drawX, sy);
    } else if (e.vx > 0) {
      ctx.scale(-1, 1);
      ctx.drawImage(spr, -(drawX + e.w), sy, e.w, e.h);
    } else {
      ctx.drawImage(spr, drawX, sy, e.w, e.h);
    }

    ctx.restore();

    // HIT! text floats up above enemy
    if (e.hitTextTimer > 0) {
      const progress = 1 - e.hitTextTimer / 40;
      const floatY = sy - 4 - Math.round(progress * 12);
      ctx.save();
      ctx.font = PIXEL_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.globalAlpha = e.hitTextTimer / 40;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('HIT!', sx + e.w / 2, floatY);
      ctx.restore();
    }
  }
}
