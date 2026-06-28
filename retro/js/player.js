const PLAYER_START = { x: -100, y: 170 };

let coderMode = false;

const player = {
  x: PLAYER_START.x, y: PLAYER_START.y,
  w: 48, h: 26,
  vx: 0, vy: 0,
  onGround: false,
  facingLeft: false,
  frame: 0,
  frameTimer: 0,
  moving: false,
  dashing: false,
  dashTarget: null,
  dashAngle: 0,
  wasOnGround: false,
  homingUsed: false,
  hp: PLAYER_MAX_HP,
  hurtTimer: 0,
  trail: [],
  carrying: null,
  groundDashing: false,
  groundDashTimer: 0,
  groundDashAngle: 0,
  airDashUsed: false,
  knockbackTimer: 0,
  homingWindup: 0,
  homingWindupTarget: null,
  shockwaves: [],
  sparks: [],
  impactFlash: 0,
  killSpin: 0,
  killText: null, // { text, timer, x, y }
  inWater: false,
  wasInWater: false,
  bubbles: [],
  bubbleTimer: 0,
  postDashTimer: 0,
  swimBobPhase: 0,
  waterExitSpin: 0,   // spin angle when launched out of water by dash
  splash: [],         // splash particles
};

function resetLevel() {
  player.x  = PLAYER_START.x;
  player.y  = PLAYER_START.y;
  player.vx = 0; player.vy = 0;
  player.hp = PLAYER_MAX_HP;
  player.hurtTimer = 0;
  player.dashing = false; player.dashTarget = null;
  player.homingWindup = 0; player.homingWindupTarget = null;
  player.shockwaves = [];
  player.sparks = [];
  player.impactFlash = 0;
  player.killSpin = 0;
  player.killText = null;
  player.carrying = null;
  player.groundDashing = false; player.groundDashTimer = 0; player.airDashUsed = false; player.knockbackTimer = 0;
  player.inWater = false;
  player.wasInWater = false;
  player.waterExitSpin = 0;
  player.splash = [];
  player.bubbles = [];
  player.bubbleTimer = 0;
  player.postDashTimer = 0;
  cameraX = 0;
  cameraY = 0;
  hitFreezeTimer = 0;
  screenShakeTimer = 0;
  // reset quest state
  hasOrange = false;
  edwinGaveKey = false;
  orange.collected = false;
  goldenKey.active = false;
  goldenKey.collected = false;
  levelComplete = false;
  levelCompleteTimer = 0;
  // reset Edwin sprite back to capy2
  const edwinNpc = npcs.find(n => n.id === 'edwin');
  if (edwinNpc) edwinNpc.sprite = 'capy2';
  // reset big fish
  for (const e of bigFishEnemies) {
    e.x = e.startX; e.y = e.startY;
    e.vx = 0.5; e.vy = 0;
    e.hp = 3; e.dead = false; e.deathFlash = 0; e.hitFlash = 0; e.proximityTimer = 0;
    e.state = 'patrol'; e.stateTimer = 0; e.particles = [];
    e.bobPhase = Math.random() * Math.PI * 2;
  }
  // reset fish
  for (const e of fishEnemies) {
    e.x = e.startX; e.y = e.startY;
    e.vx = e.dart ? 2.2 : 0.7; e.vy = 0;
    e.hp = 1; e.dead = false;
    e.hitFlash = 0; e.deathFlash = 0; e.particles = [];
    e.bobPhase = Math.random() * Math.PI * 2;
  }
  // reset enemies
  for (const e of enemies) {
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
}

function hurtPlayer() {
  if (player.hurtTimer > 0 || player.postDashTimer > 0 || coderMode || player.dashing || player.groundDashing || player.homingWindup > 0) return;
  player.hp--;
  player.hurtTimer = HURT_FRAMES;
  player.dashing = false; player.dashTarget = null;
  if (player.hp <= 0) startDeathSequence();
}

function startDeathSequence() {
  death.active = true;
  death.timer = 0;
  death.vy = 0;
  death.y = player.y;
  death.x = player.x;
  player.vx = 0; player.vy = 0;
  player.dashing = false; player.dashTarget = null;
  player.groundDashing = false;
  hitFreezeTimer = 0;
}

const WALK_SEQ = ['walk1', 'walk2', 'walk3', 'walk4'];

function resolveCollisions() {
  player.onGround = false;
  for (const p of platforms) {
    const ox = Math.min(player.x + player.w, p.x + p.w) - Math.max(player.x, p.x);
    const oy = Math.min(player.y + player.h, p.y + p.h) - Math.max(player.y, p.y);
    if (ox <= 0 || oy <= 0) continue;

    if (p.oneWay) {
      const prevBottom = player.y + player.h - player.vy;
      if (player.vy >= 0 && prevBottom <= p.y + 1) {
        player.y -= oy;
        player.vy = 0;
        player.onGround = true;
      }
    } else {
      if (ox < oy) {
        if (player.x < p.x) player.x -= ox; else player.x += ox;
        player.vx = 0;
      } else {
        if (player.y < p.y) { player.y -= oy; player.vy = 0; player.onGround = true; }
        else { player.y += oy; player.vy = 0; }
      }
    }
  }
}

function spawnImpactVFX(x, y) {
  player.impactFlash = 10;

  // wave 1 — dense fast white chunks
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const speed = 5 + Math.random() * 7;
    player.sparks.push({
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
      life: 10 + Math.floor(Math.random() * 8), maxLife: 18,
      color: '#ffffff',
      size: Math.random() < 0.5 ? 4 : 2, kind: 'box', gravity: 0.18,
    });
  }

  // wave 2 — medium white cloud
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 4;
    player.sparks.push({
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 0.5,
      life: 14 + Math.floor(Math.random() * 10), maxLife: 24,
      color: '#ffffff', size: 3, kind: 'box', gravity: 0.08,
    });
  }

  // wave 3 — long white streaks radiating outward
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const speed = 8 + Math.random() * 5;
    player.sparks.push({
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 8 + Math.floor(Math.random() * 4), maxLife: 12,
      color: '#ffffff', size: 2, kind: 'line', gravity: 0,
    });
  }
}

function updatePlayer() {
  if (consumeKey('KeyQ')) coderMode = !coderMode;

  // M key: throw if carrying, else dash, else run held
  if (consumeKey('KeyM')) {
    if (dialog.active) {
      if (dialog.done) advanceDialog();
    } else if (player.carrying) {
      throwRedEnemy(player.carrying);
      player.carrying = null;
    } else {
      const nearby = nearNpc();
      if (nearby) {
        openDialog(nearby);
      } else if (!player.groundDashing) {
        if (player.onGround || (!player.airDashUsed && !player.dashing)) {
          const dLeft  = keys['KeyS'];
          const dRight = keys['KeyC'];
          const dUp    = keys['KeyD'] || keys['KeyL'];
          const dDown  = keys['KeyX'];
          const hasAny = dLeft || dRight || dUp || dDown;
          const dx = dRight ? 1 : dLeft ? -1 : (hasAny ? 0 : (player.facingLeft ? -1 : 1));
          const dy = dUp ? -1 : (dDown && !player.onGround) ? 1 : 0;
          const len = Math.hypot(dx, dy) || 1;
          const nx = dx / len;
          const ny = dy / len;
          player.groundDashing = true;
          player.groundDashTimer = GROUND_DASH_FRAMES;
          player.groundDashAngle = Math.atan2(ny, nx);
          player.vx = nx * GROUND_DASH_SPEED;
          player.vy = ny * GROUND_DASH_SPEED;
          player.facingLeft = nx < 0;
          if (!player.onGround && !player.inWater) player.airDashUsed = true;
          // launching out of water with upward component → start spin
          if (player.wasInWater && !player.inWater && player.vy < 0) {
            player.waterExitSpin = 1; // active spin flag
          }
        }
      }
    }
  }
  if (dialog.active && consumeKey('KeyL')) {
    if (!dialog.done) dialog.chars = dialog.fullText.length;
    else advanceDialog();
  }

  if (dialog.active) {
    tickDialog();
    tickNpcs();
    player.vx = 0;
    player.moving = false;
    if (!player.onGround) { player.vy += S.gravity; player.y += player.vy; resolveCollisions(); }
    else { player.vy = 0; }
    return;
  }

  const left  = keys['KeyS'];
  const right = keys['KeyC'];
  const up    = keys['KeyD'];
  const down  = keys['KeyX'];
  const run   = keys['KeyM'];
  const speed = run ? S.walkSpeed * S.runMult : S.walkSpeed;

  if (player.knockbackTimer > 0) player.knockbackTimer--;

  // detect water
  const pcx = player.x + player.w / 2;
  const pcy = player.y + player.h / 2;
  player.wasInWater = player.inWater;
  player.inWater = (
    pcx >= WATER_ZONE.x && pcx <= WATER_ZONE.x + WATER_ZONE.w &&
    pcy >= WATER_ZONE.y && pcy <= WATER_ZONE.y + WATER_ZONE.h
  ) || (
    pcx >= WATER_ZONE_2.x && pcx <= WATER_ZONE_2.x + WATER_ZONE_2.w &&
    pcy >= WATER_ZONE_2.y && pcy <= WATER_ZONE_2.y + WATER_ZONE_2.h
  );

  // water transition — spawn splash
  if (player.inWater !== player.wasInWater) {
    const sx = pcx, sy = player.y + (player.inWater ? 0 : player.h);
    for (let i = 0; i < 18; i++) {
      const angle = -Math.PI + (Math.random() * Math.PI); // upward arc
      const speed = 1.5 + Math.random() * 4;
      player.splash.push({
        x: sx + (Math.random() - 0.5) * player.w,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 14 + Math.floor(Math.random() * 12),
        maxLife: 26,
        size: Math.random() < 0.5 ? 2 : 1,
        gravity: 0.18,
      });
    }
    // stop spin on water entry
    if (player.inWater) player.waterExitSpin = 0;
  }

  // stop spin on landing
  if (player.onGround) player.waterExitSpin = 0;

  // bubble spawning from axo's mouth
  for (let i = player.bubbles.length - 1; i >= 0; i--) {
    const b = player.bubbles[i];
    b.life--;
    b.y -= b.rise;
    b.x += Math.sin(b.wobble) * 0.4;
    b.wobble += 0.12;
    if (b.life <= 0) player.bubbles.splice(i, 1);
  }
  if (player.inWater) {
    player.swimBobPhase += 0.07;
    player.airDashUsed = false; // unlimited dash in water
    player.bubbleTimer--;
    if (player.bubbleTimer <= 0) {
      player.bubbleTimer = 18 + Math.floor(Math.random() * 20);
      // mouth is near the front of axo's head
      const mouthX = player.facingLeft
        ? player.x + 4
        : player.x + player.w - 4;
      const mouthY = player.y + 6;
      const count = Math.random() < 0.4 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        player.bubbles.push({
          x: mouthX + (Math.random() - 0.5) * 4,
          y: mouthY + (Math.random() - 0.5) * 3,
          r: 1 + Math.floor(Math.random() * 3), // 1, 2, or 3px radius
          life: 40 + Math.floor(Math.random() * 30),
          maxLife: 70,
          rise: 0.4 + Math.random() * 0.5,
          wobble: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  player.moving = false;

  if (player.inWater && !player.groundDashing && !player.dashing && player.homingWindup === 0) {
    // free swim in any direction
    const SWIM_SPEED = S.walkSpeed * 1.3;
    let svx = 0, svy = 0;
    if (left)  { svx = -SWIM_SPEED; player.facingLeft = true;  player.moving = true; }
    if (right) { svx =  SWIM_SPEED; player.facingLeft = false; player.moving = true; }
    if (up)    { svy = -SWIM_SPEED; player.moving = true; }
    if (down)  { svy =  SWIM_SPEED; player.moving = true; }
    // diagonal normalise
    if (svx !== 0 && svy !== 0) { svx *= 0.707; svy *= 0.707; }
    player.vx += (svx - player.vx) * 0.25;
    player.vy += (svy - player.vy) * 0.18;
    // gentle bob when idle
    if (!player.moving) {
      player.vy += (0 - player.vy) * 0.12;
      player.vy += Math.sin(Date.now() * 0.003) * 0.06;
    }
    player.onGround = false;
    player.homingUsed = false;
    player.airDashUsed = false;
  } else if (!player.groundDashing && player.knockbackTimer === 0) {
    if (left)       { player.vx = -speed; player.facingLeft = true;  player.moving = true; }
    else if (right) { player.vx =  speed; player.facingLeft = false; player.moving = true; }
    else            { player.vx *= 0.7; }
  }

  const jumpPressed = player.inWater
    ? consumeKey('KeyL')
    : consumeKey('KeyD') || consumeKey('KeyL');
  if (jumpPressed && player.onGround && !player.inWater) { player.vy = -S.jumpForce; player.onGround = false; }

  if (player.hurtTimer > 0) player.hurtTimer--;
  if (player.postDashTimer > 0) player.postDashTimer--;
  // slow passive regen — only when not recently hurt, not at max
  if (player.hurtTimer === 0 && player.hp < PLAYER_MAX_HP) {
    player.hp = Math.min(PLAYER_MAX_HP, player.hp + 0.003);
  }

  if (player.killSpin > 0) player.killSpin--;

  // Ground dash countdown
  if (player.groundDashing) {
    player.groundDashTimer--;
    if (player.groundDashTimer <= 0) { player.groundDashing = false; player.vx *= 0.3; }
  }

  // Homing windup hover → launch
  if (player.homingWindup > 0) {
    player.homingWindup--;
    player.vx = 0; player.vy = 0;
    if (player.homingWindup === 0 && player.homingWindupTarget && !player.homingWindupTarget.dead) {
      player.dashing = true;
      player.dashTarget = player.homingWindupTarget;
      player.homingWindupTarget = null;
    } else if (player.homingWindup === 0) {
      player.homingWindupTarget = null;
    }
  }

  // Homing attack: triggered by jump press while airborne or swimming
  if (!player.onGround && !player.dashing && !player.homingUsed && player.homingWindup === 0 && jumpPressed && !player.wasOnGround) {
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;
    let best = null, bestDist = HOMING_RANGE;
    for (const e of [...enemies, ...redEnemies, ...fishEnemies, ...bigFishEnemies]) {
      if (e.dead || e.flipped || e.carried) continue;
      const ey = (e._y ? e._y : e.y) + e.h / 2;
      const dist = Math.hypot((e.x + e.w / 2) - pcx, ey - pcy);
      if (dist < bestDist) { bestDist = dist; best = e; }
    }
    if (best) {
      player.homingWindup = S.homingHover;
      player.homingWindupTarget = best;
      player.homingUsed = true;
    }
  }

  if (player.dashing && player.dashTarget) {
    const e   = player.dashTarget;
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;
    const ecx = e.x + e.w / 2;
    const ecy = e.y + e.h / 2;
    const angle = Math.atan2(ecy - pcy, ecx - pcx);
    // smooth velocity toward target
    player.vx = Math.cos(angle) * HOMING_SPEED;
    player.vy = Math.sin(angle) * HOMING_SPEED;
    // snap only for sprite rotation display
    player.dashAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    // trail
    player.trail.push({ x: pcx, y: pcy, life: 28 });
  }
  if (player.groundDashing) {
    player.trail.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, life: 18 });
  }
  // advance water exit spin
  if (player.waterExitSpin > 0) player.waterExitSpin += 0.28; // ~1.75 rad/frame ≈ fast spin

  // update splash particles
  for (const p of player.splash) {
    p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.life--;
  }
  player.splash = player.splash.filter(p => p.life > 0);

  // fade trail
  for (const t of player.trail) t.life--;
  player.trail = player.trail.filter(t => t.life > 0);

  if (!player.dashing && !player.groundDashing && player.homingWindup === 0 && !player.inWater) player.vy += S.gravity;
  player.x += player.vx;
  player.y += player.vy;

  // check hit BEFORE collision so platform snap can't steal the contact
  if (player.dashing && player.dashTarget) {
    const e = player.dashTarget;
    const inset = 10;
    const einset = (e.fish || e.bigFish) ? 0 : inset;
    const px1 = player.x + inset, px2 = player.x + player.w - inset;
    const py1 = player.y + inset, py2 = player.y + player.h - inset;
    const ex1 = e.x + einset,      ex2 = e.x + e.w - einset;
    const ey1 = (e._y ? e._y : e.y) + einset;
    const ey2 = ey1 + e.h - einset * 2;
    const ox = Math.min(px2, ex2) - Math.max(px1, ex1);
    const oy = Math.min(py2, ey2) - Math.max(py1, ey1);
    if (ox > 0 && oy > 0) {
      player.dashing = false; player.dashTarget = null;
      const impactX = e.x + e.w / 2;
      const impactY = (e._y ? e._y : e.y) + e.h / 2;
      if (e.bigFish) {
        hitBigFishByHoming(e, impactX, impactY);
        if (!e.dead && player.hurtTimer === 0) player.hurtTimer = 20;
      } else if (e.fish) {
        hitFishByHoming(e, impactX, impactY);
      } else if (e.red) {
        e.dead = true;
        spawnDeathStars(e);
        triggerLightning(Math.round(impactX - cameraX));
        screenShakeTimer = 6;
        player.killSpin = 10;
        player.vx = player.x + player.w / 2 < e.x + e.w / 2 ? -S.redBounceBack : S.redBounceBack;
        player.vy = -4;
        hitFreezeTimer = HIT_FREEZE_FRAMES;
        spawnImpactVFX(impactX, impactY);
        player.killText = { text: 'HOMING HIT!', timer: 50, x: impactX, y: impactY - 12 };
      } else {
        // spiked AND not freshly triggered by the player (lastHitBy===null means pre-existing spike)
        const spiked = e.stunTimer > 0 && e.lastHitBy === null;
        if (spiked) {
          hurtPlayer();
        } else {
          player.vx = player.x + player.w / 2 < e.x + e.w / 2 ? -8 : 8;
          player.vy = -4;
          const wasLastDash = e.lastHitBy === 'dash';
          hitEnemy(e);
          hitFreezeTimer = HIT_FREEZE_FRAMES;
          screenShakeTimer = SCREEN_SHAKE_FRAMES;
          spawnImpactVFX(impactX, impactY);
          if (e.dead) {
            player.killText = { text: wasLastDash ? 'ONE-TWO HIT!' : 'HOMING HIT!', timer: 60, x: impactX, y: impactY - 12 };
          } else {
            player.killText = { text: 'HOMING HIT!', timer: 50, x: impactX, y: impactY - 12 };
            if (player.postDashTimer === 0) player.postDashTimer = 20;
          }
        }
      }
    }
  }

  // Ground dash hit detection — same effect as homing hit
  if (player.groundDashing) {
    const inset = 6;
    const px1 = player.x + inset, px2 = player.x + player.w - inset;
    const py1 = player.y + inset, py2 = player.y + player.h - inset;
    for (const e of [...enemies, ...redEnemies, ...fishEnemies, ...bigFishEnemies]) {
      if (e.dead || e.flipped || e.carried) continue;
      const ex1 = e.x + inset, ex2 = e.x + e.w - inset;
      const ey1 = (e._y ? e._y : e.y) + inset;
      const ey2 = ey1 + e.h - inset * 2;
      if (Math.min(px2, ex2) - Math.max(px1, ex1) > 0 && Math.min(py2, ey2) - Math.max(py1, ey1) > 0) {
        player.groundDashing = false;
        if (e.bigFish) {
          const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
          hitBigFishByDash(e, ex, ey);
          if (!e.dead && player.hurtTimer === 0) player.hurtTimer = 20;
        } else if (e.fish) {
          const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
          hitFishByDash(e, ex, ey);
        } else if (e.red) {
          flipRedEnemy(e);
          player.vx = player.x + player.w / 2 < e.x + e.w / 2 ? -S.redBounceBack : S.redBounceBack;
          player.knockbackTimer = 12;
          hitFreezeTimer = HIT_FREEZE_FRAMES;
          screenShakeTimer = SCREEN_SHAKE_FRAMES;
        } else {
          const spiked = e.stunTimer > 0 && e.lastHitBy === null;
          if (spiked) {
            hurtPlayer();
          } else {
            player.vx = player.x + player.w / 2 < e.x + e.w / 2 ? -8 : 8;
            player.vy = -4;
            const ex = e.x + e.w / 2, ey = (e._y ? e._y : e.y) + e.h / 2;
            e.lastHitBy = 'dash';
            hitEnemy(e);
            hitFreezeTimer = HIT_FREEZE_FRAMES;
            screenShakeTimer = SCREEN_SHAKE_FRAMES;
            spawnImpactVFX(ex, ey);
            if (!e.dead) {
              player.killText = { text: 'DASH HIT!', timer: 50, x: ex, y: ey - 12 };
              if (player.postDashTimer === 0) player.postDashTimer = 20;
            }
          }
        }
        break;
      }
    }
  }

  // walk into flipped red enemy = pick up
  if (!player.carrying && !player.dashing) {
    for (const e of redEnemies) {
      if (e.flipped && !e.dead) {
        const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
        const oy = Math.min(player.y + player.h, e._y + e.h) - Math.max(player.y, e._y);
        if (ox > 0 && oy > 0) { carryRedEnemy(e); player.carrying = e; break; }
      }
    }
  }

  const wasOnGround = player.onGround;
  resolveCollisions();
  player.wasOnGround = wasOnGround;
  if (player.onGround) { player.dashing = false; player.dashTarget = null; player.homingUsed = false; player.airDashUsed = false; }

  cameraX += ((player.x - VIEW_W / 2 + player.w / 2) - cameraX) * 0.12;
  const targetY = Math.max(0, player.y - VIEW_H * 0.65 + player.h / 2);
  cameraY += (targetY - cameraY) * 0.08;

  const horizontalDash = player.groundDashing && Math.abs(Math.sin(player.groundDashAngle)) <= 0.3;
  if (player.inWater) {
    player.frameTimer++;
    const swimRate = S.animSpeed;
    if (player.frameTimer >= swimRate) { player.frameTimer = 0; player.frame = (player.frame + 1) % 2; }
  } else if (player.moving && player.onGround || horizontalDash) {
    player.frameTimer++;
    if (player.frameTimer >= (horizontalDash ? 3 : S.animSpeed)) { player.frameTimer = 0; player.frame = (player.frame + 1) % WALK_SEQ.length; }
  } else {
    player.frame = 0; player.frameTimer = 0;
  }
}

function drawPlayer() {
  if (!assetsReady()) return;
  const px     = Math.round(player.x - cameraX);
  const bottom = Math.round(player.y + player.h - cameraY);

  // draw trail — pixelated rectangles, fading and shrinking toward tail
  if (player.trail.length > 1) {
    const n = player.trail.length;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1); // 0=tail, 1=head
      const pt = player.trail[i];
      const alpha = t * t * 0.75;
      const size = Math.max(1, Math.round(t * 6));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        Math.round(pt.x - cameraX) - (size >> 1),
        Math.round(pt.y - cameraY) - (size >> 1),
        size, size
      );
    }
    ctx.restore();
  }

  const standingSpr = sprites['standing'].naturalWidth ? sprites['standing'] : sprites['walk1'];
  let sprite;
  if (player.inWater && !player.dashing && !player.groundDashing) {
    sprite = sprites[player.frame % 2 === 0 ? 'swim1' : 'swim2'];
  } else if (player.dashing) {
    sprite = sprites['walk2'];
    if (player.dashTarget) {
      player.facingLeft = player.dashTarget.x + player.dashTarget.w / 2 < player.x + player.w / 2;
    }
  } else if (player.groundDashing) {
    sprite = Math.abs(Math.sin(player.groundDashAngle)) > 0.3
      ? sprites['jump']
      : sprites['walk2'];
  } else if (!player.onGround) {
    sprite = sprites['jump'];
  } else if (player.moving) {
    sprite = sprites[WALK_SEQ[player.frame]];
  } else {
    sprite = standingSpr;
  }

  const sw = sprite.naturalWidth;
  const sh = sprite.naturalHeight;
  const dashJitter = player.groundDashing ? (Math.random() < 0.15 ? 1 : 0) : 0;
  const swimBob = player.inWater ? Math.sin(player.swimBobPhase) * 2 : 0;
  const yOffset = (!player.onGround ? S.jumpYOffset : 0) + (player.groundDashing ? S.dashYOffset : 0) + dashJitter + swimBob;
  const py = bottom - sh + yOffset;

  // flicker during invincibility
  if (player.hurtTimer > 0 && Math.floor(player.hurtTimer / 4) % 2 === 0) return;

  // build tinted sprite on persistent offscreen canvas
  let drawSpr = sprite;
  if (player.dashing || player.groundDashing || player.homingWindup > 0 || player.hurtTimer > 0) {
    const oc = getOC('player_tint', sw, sh);
    const oc2d = oc._ctx;
    oc2d.clearRect(0, 0, sw, sh);
    oc2d.globalCompositeOperation = 'source-over';
    oc2d.globalAlpha = 1;
    oc2d.imageSmoothingEnabled = false;
    oc2d.drawImage(sprite, 0, 0, sw, sh);
    oc2d.globalCompositeOperation = 'source-atop';
    oc2d.fillStyle = (player.hurtTimer > 0 && !player.dashing && !player.homingWindup) ? 'rgba(255,0,0,0.55)' : 'rgba(255,255,255,0.9)';
    oc2d.fillRect(0, 0, sw, sh);
    oc2d.globalCompositeOperation = 'source-over';
    drawSpr = oc;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (player.waterExitSpin > 0) {
    const pcx = player.x + player.w / 2 - cameraX;
    const pcy = player.y + player.h / 2 - cameraY;
    ctx.translate(pcx, pcy);
    ctx.rotate(player.waterExitSpin);
    if (!player.facingLeft) ctx.scale(-1, 1);
    ctx.drawImage(drawSpr, -sw / 2, -sh / 2, sw, sh);
  } else if (player.killSpin > 0) {
    const pcx = player.x + player.w / 2 - cameraX;
    const pcy = player.y + player.h / 2 - cameraY;
    const t = 1 - player.killSpin / 10;
    const spinSpr = sprites['walk1'];
    ctx.translate(pcx, pcy);
    ctx.rotate(t * Math.PI * 2);
    ctx.drawImage(spinSpr, -spinSpr.naturalWidth / 2, -spinSpr.naturalHeight / 2, spinSpr.naturalWidth, spinSpr.naturalHeight);
  } else if (player.dashing && player.dashTarget) {
    const pcx = player.x + player.w / 2 - cameraX;
    const pcy = player.y + player.h / 2 - cameraY;
    const snapped = player.dashAngle || 0;
    const facingRight = Math.cos(snapped) >= 0;
    ctx.translate(pcx, pcy);
    if (facingRight) {
      ctx.rotate(snapped);
      ctx.scale(-1, 1);
    } else {
      ctx.rotate(snapped + Math.PI);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(drawSpr, -sw / 2, -sh / 2, sw, sh);
  } else if (!player.facingLeft) {
    ctx.scale(-1, 1);
    ctx.drawImage(drawSpr, -(px + sw), py, sw, sh);
  } else {
    ctx.drawImage(drawSpr, px, py, sw, sh);
  }

  ctx.restore();

  // splash particles
  if (player.splash.length > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const p of player.splash) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = alpha > 0.5 ? '#a8d8f0' : '#ffffff';
      const sx2 = Math.round(p.x - cameraX);
      const sy2 = Math.round(p.y - cameraY);
      ctx.fillRect(sx2, sy2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // futuristic crosshair on homing target
  const crossTarget = player.homingWindupTarget || (player.dashing ? player.dashTarget : null);
  if (crossTarget && !crossTarget.dead) {
    const tx = Math.round(crossTarget.x + crossTarget.w / 2 - cameraX);
    const ty = Math.round((crossTarget._y ? crossTarget._y : crossTarget.y) + crossTarget.h / 2 - cameraY);
    const now2 = Date.now();
    const spin = (now2 * 0.004) % (Math.PI * 2);
    const pulse = 0.6 + 0.4 * Math.sin(now2 * 0.015);
    const r = 10 + crossTarget.w * 0.3;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(spin);
    // outer rotating brackets
    ctx.globalAlpha = pulse * 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const bLen = 5, gap = r;
    for (let q = 0; q < 4; q++) {
      ctx.save();
      ctx.rotate(q * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(gap, -bLen); ctx.lineTo(gap, bLen);
      ctx.moveTo(gap, 0);     ctx.lineTo(gap + bLen, 0);
      ctx.stroke();
      ctx.restore();
    }
    // inner fixed crosshair (counter-rotates to stay aligned)
    ctx.rotate(-spin);
    ctx.globalAlpha = pulse * 0.7;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const cs = 3;
    ctx.beginPath();
    ctx.moveTo(-cs, 0); ctx.lineTo(cs, 0);
    ctx.moveTo(0, -cs); ctx.lineTo(0, cs);
    ctx.stroke();
    // dot
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  // hover indicator: pixel corner brackets around player while locking on
  if (player.homingWindup > 0 && S.homingHover > 0) {
    const t = 1 - player.homingWindup / S.homingHover;
    const wcx = Math.round(player.x + player.w / 2 - cameraX);
    const wcy = Math.round(player.y + player.h / 2 - cameraY);
    const r = Math.round(8 + t * 8);
    const arm = 4;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.9 - t * 0.4;
    ctx.fillStyle = '#ffffff';
    // top-left
    ctx.fillRect(wcx - r,       wcy - r,       arm, 1);
    ctx.fillRect(wcx - r,       wcy - r,       1, arm);
    // top-right
    ctx.fillRect(wcx + r - arm, wcy - r,       arm, 1);
    ctx.fillRect(wcx + r - 1,   wcy - r,       1, arm);
    // bottom-left
    ctx.fillRect(wcx - r,       wcy + r - 1,   arm, 1);
    ctx.fillRect(wcx - r,       wcy + r - arm, 1, arm);
    // bottom-right
    ctx.fillRect(wcx + r - arm, wcy + r - 1,   arm, 1);
    ctx.fillRect(wcx + r - 1,   wcy + r - arm, 1, arm);
    ctx.restore();
  }

  // speed lines during homing dash — thin lines behind player in travel direction
  if (player.dashing && player.trail.length > 2) {
    const newest = player.trail[player.trail.length - 1];
    const older  = player.trail[Math.max(0, player.trail.length - 5)];
    const dx = newest.x - older.x;
    const dy = newest.y - older.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len; const ny = dy / len;
    for (let i = 0; i < 5; i++) {
      const spread = (i - 2) * 4;
      const ox = -ny * spread; const oy = nx * spread;
      const sx = newest.x - cameraX + ox;
      const sy = newest.y - cameraY + oy;
      const lineLen = 8 + i * 2;
      ctx.save();
      ctx.globalAlpha = 0.35 - i * 0.04;
      ctx.strokeStyle = '#c0f0ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - nx * lineLen, sy - ny * lineLen);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (player.impactFlash > 0) {
    player.impactFlash--;
    const ft = player.impactFlash / 10;
    ctx.save();
    ctx.globalAlpha = ft * 0.28;
    ctx.fillStyle = '#ffe8a0';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  // shockwave rings expanding outward from impact
  for (let i = player.shockwaves.length - 1; i >= 0; i--) {
    const sw = player.shockwaves[i];
    if (sw.delay > 0) { sw.delay--; continue; }
    sw.life--;
    sw.r += sw.speed;
    if (sw.life <= 0) { player.shockwaves.splice(i, 1); continue; }
    const alpha = (sw.life / sw.maxLife) * 0.9;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = sw.lw || 2;
    ctx.beginPath();
    ctx.arc(Math.round(sw.x - cameraX), Math.round(sw.y - cameraY), sw.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // sparks — pixel boxes and streak lines
  for (let i = player.sparks.length - 1; i >= 0; i--) {
    const sp = player.sparks[i];
    sp.life--;
    if (sp.life <= 0) { player.sparks.splice(i, 1); continue; }
    if (sp.gravity) sp.vy += sp.gravity;
    const alpha = (sp.life / sp.maxLife);
    const sx = Math.round(sp.x - cameraX);
    const sy = Math.round(sp.y - cameraY);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = sp.color || '#ffffff';
    ctx.strokeStyle = sp.color || '#ffffff';
    if (sp.kind === 'box') {
      const s = sp.size || 2;
      ctx.fillRect(sx - (s / 2 | 0), sy - (s / 2 | 0), s, s);
      sp.x += sp.vx; sp.y += sp.vy;
    } else {
      ctx.lineWidth = sp.size || 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      sp.x += sp.vx; sp.y += sp.vy;
      ctx.lineTo(Math.round(sp.x - cameraX), Math.round(sp.y - cameraY));
      ctx.stroke();
    }
    ctx.restore();
  }

  // underwater tint — subtle blue overlay
  if (player.inWater) {
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = '#1a6090';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  // bubbles from axo's mouth — pixelated circles
  for (const b of player.bubbles) {
    const alpha = (b.life / b.maxLife) * 0.85;
    const bx = Math.round(b.x - cameraX);
    const by = Math.round(b.y - cameraY);
    const r = b.r;
    ctx.save();
    ctx.globalAlpha = alpha;
    // pixel-circle: draw as filled squares to keep the 16-bit look
    ctx.fillStyle = '#c8eeff';
    // outline pixels
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const dist = Math.abs(dx) + Math.abs(dy); // diamond for pixel-art feel
        if (dist === r || (r > 1 && dist === r - 1 && dx === 0 && dy === 0)) continue;
        if (dist <= r) {
          // interior — lighter, more transparent
          ctx.globalAlpha = alpha * 0.25;
          ctx.fillStyle = '#e8f8ff';
          ctx.fillRect(bx + dx, by + dy, 1, 1);
        }
      }
    }
    // rim pixels
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#a0d8f0';
    if (r === 1) {
      ctx.fillRect(bx,   by-1, 1, 1);
      ctx.fillRect(bx,   by+1, 1, 1);
      ctx.fillRect(bx-1, by,   1, 1);
      ctx.fillRect(bx+1, by,   1, 1);
    } else if (r === 2) {
      ctx.fillRect(bx-1, by-2, 2, 1);
      ctx.fillRect(bx-1, by+2, 2, 1);
      ctx.fillRect(bx-2, by-1, 1, 2);
      ctx.fillRect(bx+2, by-1, 1, 2);
    } else {
      ctx.fillRect(bx-1, by-3, 3, 1);
      ctx.fillRect(bx-1, by+3, 3, 1);
      ctx.fillRect(bx-3, by-1, 1, 3);
      ctx.fillRect(bx+3, by-1, 1, 3);
    }
    // highlight pixel (top-left of bubble)
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx - Math.max(1, r-1), by - Math.max(1, r-1), 1, 1);
    ctx.restore();
  }

  // kill text floats up and fades
  if (player.killText) {
    const kt = player.killText;
    kt.timer--;
    if (kt.timer <= 0) {
      player.killText = null;
    } else {
      const progress = 1 - kt.timer / 50;
      const alpha = kt.timer / 50;
      const floatY = Math.round(kt.y - cameraY - progress * 18);
      const kx = Math.round(kt.x - cameraX);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.globalAlpha = alpha;
      // combo count above hit text
      if (combo.count >= 2) {
        ctx.font = '16px "Press Start 2P"';
        ctx.fillStyle = combo.count >= 10 ? '#ff4400' : combo.count >= 5 ? '#ffaa00' : '#ffe866';
        ctx.fillText(`x${combo.count}`, kx, floatY - 12);
      }
      ctx.font = PIXEL_FONT;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(kt.text, kx, floatY);
      ctx.restore();
    }
  }
}
