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
  dashedFromWater: false,
  splash: [],         // splash particles
  waterDashHeld: false,
  groundDashFlash: 0, // decays from 1→0 after dash starts, drives tint alpha
  groundPoundWindup: 0,   // >0 = frozen pre-launch, counts down
  groundPounding: false,  // true = diving straight down
  groundPoundSpin: 0,     // visual spin angle (radians)
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
  player.groundPoundWindup = 0; player.groundPounding = false; player.groundPoundSpin = 0;
  player.inWater = false;
  player.wasInWater = false;
  player.waterExitSpin = 0;
  player.dashedFromWater = false;
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
    e.vx = 0.7; e.vy = 0;
    e.hp = 1; e.dead = false;
    e.hitFlash = 0; e.deathFlash = 0; e.particles = [];
    e.bobPhase = Math.random() * Math.PI * 2;
  }
  // reset fury and combo
  fury.active = false; fury.ready = false; fury.kills = 0; fury.timer = 0; fury.flashTimer = 0;
  combo.count = 0; combo.timer = 0; combo.displayTimer = 0; combo.peak = 0;

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
  if (player.hurtTimer > 0 || player.postDashTimer > 0 || coderMode || isFuryActive() || player.dashing || (player.groundDashing && !player.inWater) || player.homingWindup > 0) return;
  player.hp--;
  player.hurtTimer = HURT_FRAMES;
  player.dashing = false; player.dashTarget = null;
  player.groundDashing = false; player.groundDashTimer = 0;
  player.homingWindup = 0; player.homingWindupTarget = null;
  // small upward bounce so gravity takes over and player doesn't float
  if (player.onGround) player.vy = -2;
  player.onGround = false;
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
    } else if (player.inWater || (player.groundDashing && player.wasInWater)) {
      // underwater — push out but only zero the blocked axis so diagonal movement slides along walls/floor
      if (ox < oy) {
        if (player.x < p.x) player.x -= ox; else player.x += ox;
        player.vx = 0;
      } else {
        if (player.y < p.y) player.y -= oy; else player.y += oy;
        player.vy = 0;
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
  if (consumeKey('KeyF') && fury.ready && !fury.active) activateFury();
  if (consumeKey('KeyW') && !fury.active) activateFury();

  // M key: throw if carrying, ground pound if airborne+down, else dash, else run held
  if (consumeKey('KeyM')) {
    if (dialog.active) {
      if (dialog.done) advanceDialog();
    } else if (player.carrying) {
      // throw blue or red enemy
      if (player.carrying.red) { throwRedEnemy(player.carrying); } else { throwEnemy(player.carrying); }
      player.carrying = null;
    } else if (!player.onGround && !player.inWater && !player.dashing && !player.groundDashing &&
               !player.groundPounding && player.groundPoundWindup === 0 && keys['KeyX']) {
      // ground pound
      player.groundPoundWindup = 20;
      player.groundPoundSpin = 0;
      player.vx = 0; player.vy = 0;
    } else {
      const nearby = nearNpc();
      if (nearby) {
        openDialog(nearby);
      } else if (!player.groundDashing) {
        if (player.onGround || player.inWater || fury.active || (!player.airDashUsed && !player.dashing)) {
          // in water, use a short keyRecent window to catch S/X dropped by S+X+M rollover
          const dLeft  = keys['KeyS'] || (player.inWater && keyRecent('KeyS', 150));
          const dRight = keys['KeyC'] || (player.inWater && keyRecent('KeyC', 150));
          const dUp    = keys['KeyD'] || keys['KeyL'] || (player.inWater && (keyRecent('KeyD', 150) || keyRecent('KeyL', 150)));
          const dDown  = keys['KeyX'] || (player.inWater && keyRecent('KeyX', 150));
          const rawDx  = (dLeft && !dRight) ? -1 : (dRight && !dLeft) ? 1 : 0;
          const rawDy  = (dUp && !dDown) ? -1 : (dDown && !dUp && (!player.onGround || player.inWater)) ? 1 : 0;
          const dx = rawDx !== 0 || rawDy !== 0 ? rawDx : (player.facingLeft ? -1 : 1);
          const dy = rawDy;
          const len = Math.hypot(dx, dy) || 1;
          const nx = dx / len;
          const ny = dy / len;
          const dashSpd = GROUND_DASH_SPEED;
          playSound('homing');
          player.groundDashing = true;
          player.groundDashTimer = GROUND_DASH_FRAMES;
          player.groundDashFlash = 1;
          player.groundDashAngle = Math.atan2(ny, nx);
          player.vx = nx * dashSpd;
          player.vy = ny * dashSpd;
          player.waterExitSpin = 0;
          if (nx !== 0) player.facingLeft = nx < 0;
          if (!player.onGround && !player.inWater) player.airDashUsed = true;
          if (player.inWater) player.dashedFromWater = true;
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

  // when both left+right held, last-pressed wins
  const left  = keys['KeyS'];
  const right = keys['KeyC'];
  const up    = keys['KeyD'];
  const down  = keys['KeyX'];
  const run   = keys['KeyM'];
  const furyMult = fury.active ? S.furySpeedMult : 1;
  const speed = (run ? S.walkSpeed * S.runMult : S.walkSpeed) * furyMult;

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
    const sx = pcx;
    const sy = player.inWater ? player.y : (player.y + player.h * 0.5);
    const entrySpeed = Math.max(1, Math.hypot(player.vx, player.vy));
    const intensity = Math.min(entrySpeed / 3, 3);

    // big upward jets
    for (let i = 0; i < 30; i++) {
      const speed = (2 + Math.random() * 4) * (0.8 + intensity * 0.25);
      player.splash.push({
        x: sx + (Math.random() - 0.5) * player.w * 2,
        y: sy,
        vx: (Math.random() - 0.5) * speed * 0.8,
        vy: -(speed * 0.75 + Math.random() * 1.5),
        life: 18 + Math.floor(Math.random() * 14),
        maxLife: 32,
        size: Math.random() < 0.35 ? 3 : Math.random() < 0.65 ? 2 : 1,
        gravity: 0.35,
      });
    }
    // wide horizontal spray
    for (let i = 0; i < 20; i++) {
      const dir = i < 10 ? -1 : 1;
      const speed = 1.5 + Math.random() * 3;
      player.splash.push({
        x: sx,
        y: sy,
        vx: dir * speed * (1 + Math.random()),
        vy: -(0.3 + Math.random() * 1.2),
        life: 10 + Math.floor(Math.random() * 10),
        maxLife: 20,
        size: 1,
        gravity: 0.40,
      });
    }

    if (player.inWater) {
      // entered water — stop spin, clear flag
      player.waterExitSpin = 0;
      player.dashedFromWater = false;
      // kill any red enemies close to the entry point
      const SPLASH_KILL_RADIUS = 40;
      for (const e of redEnemies) {
        if (e.dead) continue;
        const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
        if (Math.hypot(ex - pcx, ey - pcy) <= SPLASH_KILL_RADIUS) {
          e.dead = true;
          spawnDeathStars(e);
          if (player.carrying === e) player.carrying = null;
          player.killText = { text: 'SPLASH!', timer: 50, maxTimer: 50, x: ex, y: ey - 12 };
          registerKill();
        }
      }
    } else {
      // exited water — spin if dashed or launched upward fast
      if (player.dashedFromWater || player.vy < -3) {
        player.waterExitSpin = 0.01;
      }
      player.dashedFromWater = false;
    }
  }

  // stop spin on landing
  if (player.onGround) { player.waterExitSpin = 0; player.dashedFromWater = false; }

  // bubble spawning from axo's mouth
  { let _bn = 0; for (let i = 0; i < player.bubbles.length; i++) { const b = player.bubbles[i]; b.life--; b.y -= b.rise; b.x += Math.sin(b.wobble) * 0.4; b.wobble += 0.12; if (b.life > 0) player.bubbles[_bn++] = b; } player.bubbles.length = _bn; }
  if (player.inWater) {
    player.swimBobPhase += 0.07;
    player.airDashUsed = false; // unlimited dash in water

    // dash bubble trail — one per frame from sprite center
    if (player.groundDashing) {
      player.bubbles.push({
        x: player.x + player.w / 2 + (Math.random() - 0.5) * 6,
        y: player.y + player.h / 2 + (Math.random() - 0.5) * 6,
        r: 1 + Math.floor(Math.random() * 2),
        life: 15 + Math.floor(Math.random() * 15),
        maxLife: 30,
        rise: 0.6 + Math.random() * 0.8,
        wobble: Math.random() * Math.PI * 2,
      });
    }

    player.bubbleTimer--;
    if (player.bubbleTimer <= 0) {
      player.bubbleTimer = 18 + Math.floor(Math.random() * 20);
      const mouthX = player.x + player.w / 2;
      const mouthY = player.y + player.h / 2;
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
    const SWIM_SPEED = S.walkSpeed * 1.3 * furyMult;
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
      player.vy += Math.sin(frameNow * 0.003) * 0.06;
    }
    player.onGround = false;
    player.homingUsed = false;
    player.airDashUsed = false;
  } else if (!player.groundDashing && player.knockbackTimer === 0) {
    if (left)       { player.vx = -speed; player.facingLeft = true;  player.moving = true; }
    else if (right) { player.vx =  speed; player.facingLeft = false; player.moving = true; }
    else            { player.vx *= 0.7; }
  }

  const jumpPressedL = consumeKey('KeyL');
  const jumpPressedD = !player.inWater && consumeKey('KeyD');
  const jumpPressed  = player.inWater ? jumpPressedL : (jumpPressedD || jumpPressedL);
  const homingPressed = jumpPressedL && !player.inWater;
  if (jumpPressed && player.onGround && !player.inWater) { player.vy = -S.jumpForce; player.onGround = false; }

  if (player.hurtTimer > 0) player.hurtTimer--;
  if (player.postDashTimer > 0) player.postDashTimer--;
  // slow passive regen — only when not recently hurt, not at max
  if (player.hurtTimer === 0 && player.hp < PLAYER_MAX_HP) {
    player.hp = Math.min(PLAYER_MAX_HP, player.hp + 0.003);
  }

  if (player.killSpin > 0) player.killSpin--;

  // Ground dash countdown — underwater: keep dashing while M held, steer with direction keys
  if (player.groundDashing && player.inWater) {
    if (keys['KeyM']) player.groundDashTimer = GROUND_DASH_FRAMES;
    // burst speed fades to sustained speed as groundDashFlash decays
    const burstSpd = GROUND_DASH_SPEED;
    const sustainSpd = GROUND_DASH_SPEED * 0.6;
    const spd = sustainSpd + (burstSpd - sustainSpd) * player.groundDashFlash;
    const dLeft  = keys['KeyS'];
    const dRight = keys['KeyC'];
    const dUp    = keys['KeyD'] || keys['KeyL'];
    const dDown  = keys['KeyX'];
    const hasAny = dLeft || dRight || dUp || dDown;
    if (hasAny) {
      const dx = (dLeft && !dRight) ? -1 : (dRight && !dLeft) ? 1 : 0;
      const dy = (dUp && !dDown) ? -1 : (dDown && !dUp) ? 1 : 0;
      const len = Math.hypot(dx, dy) || 1;
      player.groundDashAngle = Math.atan2(dy, dx);
      player.vx = (dx / len) * spd;
      player.vy = (dy / len) * spd;
      if (dx !== 0) player.facingLeft = dx < 0;
    } else {
      player.vx = Math.cos(player.groundDashAngle) * spd;
      player.vy = Math.sin(player.groundDashAngle) * spd;
    }
  }
  if (player.groundDashing) {
    player.groundDashTimer--;
    if (player.groundDashTimer <= 0) { player.groundDashing = false; player.groundDashFlash = 0; player.vx *= 0.3; }
  }
  if (player.groundDashFlash > 0) player.groundDashFlash = Math.max(0, player.groundDashFlash - 0.06);

  // Homing windup hover → launch
  if (player.homingWindup > 0) {
    player.homingWindup--;
    player.vx = 0; player.vy = 0;
    if (player.homingWindup === 0 && player.homingWindupTarget && !player.homingWindupTarget.dead) {
      playSound('homing');
      player.dashing = true;
      player.dashTarget = player.homingWindupTarget;
      player.homingWindupTarget = null;
      player.waterExitSpin = 0;
    } else if (player.homingWindup === 0) {
      player.homingWindupTarget = null;
    }
  }

  // Ground pound windup — tick and launch
  if (player.groundPoundWindup > 0) {
    player.groundPoundWindup--;
    player.vx = 0; player.vy = 0;
    player.groundPoundSpin += Math.PI * 2 / 20; // full 360 over 20 frames
    if (player.groundPoundWindup === 0) {
      player.groundPounding = true;
      player.groundPoundSpin = 0; // reset so dive draws normally (no rotation)
      player.vy = 14;
      player.vx = 0;
    }
  }

  // Homing attack: triggered by L (not D) while airborne, or L while swimming
  const _homingTrigger = player.inWater ? jumpPressedL : homingPressed;
  if (!player.onGround && !player.dashing && !(player.homingUsed && !isFuryActive()) && player.homingWindup === 0 && _homingTrigger && !player.wasOnGround) {
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;
    let best = null, bestDist = HOMING_RANGE;
    const _allE = [enemies, redEnemies, fishEnemies, bigFishEnemies];
    for (let _li = 0; _li < _allE.length; _li++) {
      const _lst = _allE[_li];
      for (let _ei = 0; _ei < _lst.length; _ei++) {
        const e = _lst[_ei];
        if (e.dead || e.flipped || e.carried) continue;
        const ey = (e._y ? e._y : e.y) + e.h / 2;
        const dist = Math.hypot((e.x + e.w / 2) - pcx, ey - pcy);
        if (dist < bestDist) { bestDist = dist; best = e; }
      }
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
  if (player.waterExitSpin > 0) player.waterExitSpin += 0.42; // ~1 rotation per 15 frames

  // update splash particles
  { let _sn = 0; for (let i = 0; i < player.splash.length; i++) { const p = player.splash[i]; p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.life--; if (p.life > 0) player.splash[_sn++] = p; } player.splash.length = _sn; }

  // water-ski wake spray — horizontal surface dash, only when fully submerged
  if (player.groundDashing && player.inWater && Math.abs(player.vx) > Math.abs(player.vy) * 1.5) {
    const wz = (pcx >= WATER_ZONE_2.x) ? WATER_ZONE_2 : WATER_ZONE;
    const surfaceY = wz.y;
    const depthBelow = (player.y + player.h / 2) - surfaceY;
    if (depthBelow >= -8 && depthBelow < 32) { // near surface, not deep
      const wakeDir = player.vx > 0 ? -1 : 1;
      const sprayX = player.x + (player.vx > 0 ? 0 : player.w);
      // 8 droplets per frame — big rooster tail
      for (let i = 0; i < 8; i++) {
        const speed = 3 + Math.random() * 6;
        const sideSpread = wakeDir * speed * (0.7 + Math.random() * 1.0);
        player.splash.push({
          x: sprayX + (Math.random() - 0.5) * 6,
          y: surfaceY + Math.random() * 2,
          vx: sideSpread,
          vy: -(2.5 + Math.random() * 5.5),
          life: 18 + Math.floor(Math.random() * 16),
          maxLife: 34,
          size: Math.random() < 0.3 ? 3 : Math.random() < 0.6 ? 2 : 1,
          gravity: 0.28,
        });
      }
    }
  }

  // fury sparks — every 3 frames to keep particle count low
  if (fury.active && fury.flashTimer % 3 === 0) {
    const FURY_COLORS = ['#ffffff', '#ffe566', '#ffaa00', '#ff6600'];
    const angle = Math.random() * Math.PI * 2;
    const dist  = 4 + Math.random() * 10;
    player.sparks.push({
      x: player.x + player.w / 2 + Math.cos(angle) * dist,
      y: player.y + player.h / 2 + Math.sin(angle) * dist,
      vx: Math.cos(angle) * (1 + Math.random() * 2),
      vy: Math.sin(angle) * (1 + Math.random() * 2) - 1,
      life: 8 + Math.floor(Math.random() * 10), maxLife: 18,
      color: FURY_COLORS[Math.floor(Math.random() * FURY_COLORS.length)],
      size: Math.random() < 0.5 ? 2 : 1, kind: 'box', gravity: 0.05,
    });
  }

  // fade trail — compact in place, no splice
  let _tLen = 0;
  for (let i = 0; i < player.trail.length; i++) {
    player.trail[i].life--;
    if (player.trail[i].life > 0) player.trail[_tLen++] = player.trail[i];
  }
  player.trail.length = _tLen;

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
        player.killText = { text: 'HOMING HIT!', timer: 50, maxTimer: 50, x: impactX, y: impactY - 12 };
      } else {
        // spiked AND not freshly triggered by the player (lastHitBy===null means pre-existing spike)
        const spiked = e.stunTimer > 0 && e.lastHitBy === null && !isFuryActive();
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
            player.killText = { text: wasLastDash ? 'ONE-TWO HIT!' : 'HOMING HIT!', timer: 60, maxTimer: 60, x: impactX, y: impactY - 12 };
          } else {
            player.killText = { text: 'HOMING HIT!', timer: 50, maxTimer: 50, x: impactX, y: impactY - 12 };
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
    const _gdLists = [enemies, redEnemies, fishEnemies, bigFishEnemies];
    let _gdHit = false;
    for (let _li = 0; _li < _gdLists.length && !_gdHit; _li++) {
      const _lst = _gdLists[_li];
      for (let _ei = 0; _ei < _lst.length && !_gdHit; _ei++) {
        const e = _lst[_ei];
        if (e.dead || e.flipped || e.carried) continue;
        const ex1 = e.x + inset, ex2 = e.x + e.w - inset;
        const ey1 = (e._y ? e._y : e.y) + inset;
        const ey2 = ey1 + e.h - inset * 2;
        if (Math.min(px2, ex2) - Math.max(px1, ex1) > 0 && Math.min(py2, ey2) - Math.max(py1, ey1) > 0) {
          _gdHit = true;
          player.groundDashing = false;
          if (e.bigFish) {
            const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
            hitBigFishByDash(e, ex, ey);
            if (!e.dead && player.hurtTimer === 0) player.hurtTimer = 20;
          } else if (e.fish) {
            const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
            hitFishByDash(e, ex, ey);
          } else if (e.red) {
            if (isFuryActive()) {
              e.dead = true;
              spawnDeathStars(e);
              triggerLightning(Math.round(e.x + e.w / 2 - cameraX));
              screenShakeTimer = 6;
              player.killSpin = 10;
              registerKill();
            } else {
              flipRedEnemy(e);
            }
            player.vx = player.x + player.w / 2 < e.x + e.w / 2 ? -S.redBounceBack : S.redBounceBack;
            player.knockbackTimer = 12;
            hitFreezeTimer = HIT_FREEZE_FRAMES;
            screenShakeTimer = SCREEN_SHAKE_FRAMES;
          } else {
            const spiked = e.stunTimer > 0 && e.lastHitBy === null && !isFuryActive();
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
              player.killText = { text: 'DASH HIT!', timer: 50, maxTimer: 50, x: ex, y: ey - 12 };
              if (!e.dead && player.postDashTimer === 0) player.postDashTimer = 20;
            }
          }
        }
      }
    }
  }

  // stomp on enemy heads — falling player lands on top
  if (player.vy > 0 && !player.dashing && !player.groundDashing && !player.inWater &&
      player.groundPoundWindup === 0 && !player.groundPounding) {
    const pb = player.y + player.h;
    const pb_prev = pb - player.vy;
    let _stomped = false;

    // blue enemies
    for (const e of enemies) {
      if (e.dead || e.stunTimer > 0 || e.shakeTimer > 0 || e.flipped || e.carried || e.thrown) continue;
      const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
      if (ox <= 2) continue;
      const et = e.y;
      if (pb_prev <= et + 4 && pb >= et && pb <= et + e.h / 2) {
        const wasLastDash = e.lastHitBy === 'dash';
        hitEnemy(e);
        e.lastHitBy = 'stomp';
        player.vy = -4;
        player.y  = et - player.h;
        hitFreezeTimer = HIT_FREEZE_FRAMES;
        screenShakeTimer = SCREEN_SHAKE_FRAMES;
        spawnImpactVFX(e.x + e.w / 2, et);
        player.killText = { text: e.dead && wasLastDash ? 'ONE-TWO HIT!' : 'STOMP!', timer: 60, maxTimer: 60, x: e.x + e.w / 2, y: et - 12 };
        _stomped = true; break;
      }
    }

    // red enemies — stomp flips them
    if (!_stomped) {
      for (const e of redEnemies) {
        if (e.dead || e.flipped || e.flipping || e.carried || e.thrown) continue;
        const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
        if (ox <= 2) continue;
        const et = e.y;
        if (pb_prev <= et + 4 && pb >= et && pb <= et + e.h / 2) {
          flipRedEnemy(e);
          player.vy = -4;
          player.y  = et - player.h;
          hitFreezeTimer = HIT_FREEZE_FRAMES;
          screenShakeTimer = SCREEN_SHAKE_FRAMES;
          spawnImpactVFX(e.x + e.w / 2, et);
          player.killText = { text: 'STOMP!', timer: 60, maxTimer: 60, x: e.x + e.w / 2, y: et - 12 };
          break;
        }
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
  if (!(fury.active && player.dashing) && player.groundPoundWindup === 0) {
    resolveCollisions();
  }
  player.wasOnGround = wasOnGround;
  if (player.onGround) { player.dashing = false; player.dashTarget = null; player.homingUsed = false; player.airDashUsed = false; }

  // Ground pound landing
  if (player.groundPounding && player.onGround) {
    player.groundPounding = false;
    player.groundPoundSpin = 0;
    player.vy = -S.gpBounce;
    player.onGround = false;
    screenShakeTimer = 28;
    screenShakeMag = 14;
    const _gpx = player.x + player.w / 2, _gpy = player.y + player.h;
    // three shockwave rings — fast tight, medium, slow wide
    player.shockwaves.push({ x: _gpx, y: _gpy, r: 0, maxR: 40,  speed: 40/10,  life: 10, maxLife: 10, sx: 2.2, sy: 0.5 });
    player.shockwaves.push({ x: _gpx, y: _gpy, r: 0, maxR: 80,  speed: 80/16,  life: 16, maxLife: 16, sx: 2.4, sy: 0.45 });
    player.shockwaves.push({ x: _gpx, y: _gpy, r: 0, maxR: 130, speed: 130/24, life: 24, maxLife: 24, sx: 2.6, sy: 0.4 });
    // big radial rock/dirt chunks flung sideways from impact point
    const _gpColors = ['#8a6030', '#6a4820', '#a07840', '#4a3010', '#c8a060'];
    for (let i = 0; i < 48; i++) {
      // bias angle toward horizontal — more sideways spray than upward
      const baseAng = Math.PI + (Math.random() - 0.5) * Math.PI; // left side
      const ang = i < 24 ? baseAng : (Math.random() - 0.5) * Math.PI; // right side
      const spd = 4 + Math.random() * 9;
      const sz  = Math.random() < 0.25 ? 5 : Math.random() < 0.55 ? 3 : 2;
      player.sparks.push({
        x: _gpx + (Math.random() - 0.5) * 10, y: _gpy - Math.random() * 4,
        vx: Math.cos(ang) * spd, vy: -(1.5 + Math.random() * 6),
        life: 16 + Math.floor(Math.random() * 18), maxLife: 34,
        color: _gpColors[Math.floor(Math.random() * _gpColors.length)],
        size: sz, kind: 'box', gravity: 0.28,
      });
    }
    // white flash sparks at center
    for (let i = 0; i < 20; i++) {
      const ang2 = Math.random() * Math.PI * 2;
      const spd2 = 6 + Math.random() * 8;
      player.sparks.push({
        x: _gpx, y: _gpy,
        vx: Math.cos(ang2) * spd2, vy: Math.sin(ang2) * spd2 - 2,
        life: 6 + Math.floor(Math.random() * 6), maxLife: 12,
        color: '#ffffff', size: 2, kind: 'box', gravity: 0.15,
      });
    }
    // flip all nearby enemies within radius
    const GP_RADIUS = 80;
    const pcx2 = player.x + player.w / 2;
    const pcy2 = player.y + player.h;
    for (const e of enemies) {
      if (e.dead || e.flipped || e.carried || e.thrown) continue;
      const ecx = e.x + e.w / 2;
      const ecy = e.y + e.h / 2;
      if (Math.hypot(ecx - pcx2, ecy - pcy2) < GP_RADIUS) {
        flipEnemy(e);
        player.killText = { text: 'GROUND POUND!', timer: 60, maxTimer: 60, x: pcx2, y: pcy2 - 20 };
      }
    }
    for (const e of redEnemies) {
      if (e.dead || e.flipped || e.carried || e.thrown || e.flipping) continue;
      const ecx = e.x + e.w / 2;
      const ecy = (e._y !== undefined ? e._y : e.y) + e.h / 2;
      if (Math.hypot(ecx - pcx2, ecy - pcy2) < GP_RADIUS) {
        flipRedEnemy(e);
        player.killText = { text: 'GROUND POUND!', timer: 60, maxTimer: 60, x: pcx2, y: pcy2 - 20 };
      }
    }
    hitFreezeTimer = HIT_FREEZE_FRAMES;
  }

  // re-apply underwater dash steering after collision so floor/wall zeroing doesn't eat diagonal velocity
  if (player.groundDashing && player.inWater) {
    const _dL = keys['KeyS'], _dR = keys['KeyC'], _dU = keys['KeyD'] || keys['KeyL'], _dD = keys['KeyX'];
    if (_dL || _dR || _dU || _dD) {
      const _dx = (_dL && !_dR) ? -1 : (_dR && !_dL) ? 1 : 0;
      const _dy = (_dU && !_dD) ? -1 : (_dD && !_dU) ? 1 : 0;
      const _len = Math.hypot(_dx, _dy) || 1;
      const _spd = GROUND_DASH_SPEED * 0.6 + (GROUND_DASH_SPEED - GROUND_DASH_SPEED * 0.6) * player.groundDashFlash;
      if (_dx !== 0) player.vx = (_dx / _len) * _spd;
      if (_dy !== 0) player.vy = (_dy / _len) * _spd;
    }
  }

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

  // draw trail
  if (player.trail.length > 1) {
    const n = player.trail.length;
    const isDash   = player.groundDashing;
    const isHoming = player.dashing;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1); // 0=oldest/tail, 1=newest/head
      const pt = player.trail[i];
      if (isDash) {
        // ground dash: bright cyan-white teardrop trail, fades to tail
        const alpha = t * t * 0.85;
        const w = Math.max(1, Math.round(t * 7));
        const h = Math.max(1, Math.round(t * 4));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = t > 0.6 ? '#e0f8ff' : '#ffffff';
        ctx.fillRect(
          Math.round(pt.x - cameraX) - (w >> 1),
          Math.round(pt.y - cameraY) - (h >> 1),
          w, h
        );
      } else if (isHoming) {
        // homing: bright white orbs, more visible
        const alpha = t * t * 0.9;
        const size = Math.max(1, Math.round(t * 7));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
          Math.round(pt.x - cameraX) - (size >> 1),
          Math.round(pt.y - cameraY) - (size >> 1),
          size, size
        );
      } else {
        // generic trail (e.g. shortly after dash ends)
        const alpha = t * t * 0.5;
        const size = Math.max(1, Math.round(t * 4));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
          Math.round(pt.x - cameraX) - (size >> 1),
          Math.round(pt.y - cameraY) - (size >> 1),
          size, size
        );
      }
    }
    ctx.restore();
  }

  const standingSpr = sprites['standing'].naturalWidth ? sprites['standing'] : sprites['walk1'];
  let sprite;
  if (player.inWater && !player.dashing) {
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

  // draw kill text before hurt-blink return so it never flickers with the player sprite
  if (player.killText) {
    const kt = player.killText;
    kt.timer--;
    if (kt.timer <= 0) {
      player.killText = null;
    } else {
      const progress = 1 - kt.timer / kt.maxTimer;
      const floatY = Math.round(kt.y - cameraY - progress * 18);
      const kx = Math.round(kt.x - cameraX);
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
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

  // flicker during invincibility (not during fury — fury has its own flash)
  if (player.hurtTimer > 0 && !isFuryActive() && Math.floor(player.hurtTimer / 4) % 2 === 0) return;

  // fury white pulse: smooth sine wave, 0→1→0
  const furyOn = isFuryActive();
  const furyAlpha = furyOn
    ? (Math.sin(fury.flashTimer / Math.max(1, S.furyFlashSpeed)) * 0.5 + 0.5)
    : 0;

  // build tinted sprite on persistent offscreen canvas
  let drawSpr = sprite;
  const _needTint = player.groundDashFlash > 0 || player.hurtTimer > 0 || furyOn;
  if (_needTint) {
    const oc = getOC('player_tint', sw, sh);
    const oc2d = oc._ctx;
    oc2d.clearRect(0, 0, sw, sh);
    oc2d.globalCompositeOperation = 'source-over';
    oc2d.globalAlpha = 1;
    oc2d.imageSmoothingEnabled = false;
    oc2d.drawImage(sprite, 0, 0, sw, sh);
    oc2d.globalCompositeOperation = 'source-atop';
    if (furyOn) {
      oc2d.fillStyle = 'rgba(255,255,255,' + furyAlpha.toFixed(3) + ')';
    } else if (player.hurtTimer > 0) {
      oc2d.fillStyle = 'rgba(255,0,0,0.55)';
    } else {
      oc2d.fillStyle = 'rgba(255,255,255,' + (player.groundDashFlash * 0.9).toFixed(3) + ')';
    }
    oc2d.fillRect(0, 0, sw, sh);
    oc2d.globalCompositeOperation = 'source-over';
    drawSpr = oc;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (player.groundPoundWindup > 0) {
    // windup: spin in place
    const pcx = player.x + player.w / 2 - cameraX;
    const pcy = player.y + player.h / 2 - cameraY;
    ctx.translate(pcx, pcy);
    ctx.rotate(player.groundPoundSpin);
    ctx.drawImage(sprites['jump'], -sw / 2, -sh / 2, sw, sh);
  } else if (player.groundPounding) {
    // dive: normal jump sprite straight down
    const px2 = Math.round(player.x - cameraX);
    const py2 = Math.round(player.y - cameraY);
    if (!player.facingLeft) { ctx.scale(-1, 1); ctx.drawImage(sprites['jump'], -(px2 + sw), py2, sw, sh); }
    else ctx.drawImage(sprites['jump'], px2, py2, sw, sh);
  } else if (player.waterExitSpin > 0) {
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

  // shades overlay during fury — Y is anchored from sprite bottom so eyes stay consistent
  if (furyOn && player.waterExitSpin === 0 && sprites['shades'] && sprites['shades'].naturalWidth) {
    const shd = sprites['shades'];
    const facingLeft = player.facingLeft;
    const ox = facingLeft ? S.shadesXL : S.shadesXR;
    const oy = facingLeft ? S.shadesYL : S.shadesYR;
    const isJumping = sprite === sprites['jump'];
    const isSwimming = sprite === sprites['swim1'] || sprite === sprites['swim2'];
    const fox = isJumping ? (facingLeft ? S.shadesJumpXL : S.shadesJumpXR)
              : isSwimming ? (facingLeft ? S.shadesSwimXL : S.shadesSwimXR)
              : ox;
    const foy = isJumping ? (facingLeft ? S.shadesJumpYL : S.shadesJumpYR)
              : isSwimming ? (facingLeft ? S.shadesSwimYL : S.shadesSwimYR)
              : oy;
    // walk frame eye-height correction: sprite heights differ (28,27,26,26) so anchor from bottom shifts
    const _walkYCorr = [2, 1, 0, 0];
    const walkCorr = player.moving && player.onGround ? (_walkYCorr[player.frame % 4] || 0) : 0;
    const fsdx = facingLeft ? px + fox : px + (sw - shd.naturalWidth) - fox;
    const fsdy = (py + sh) - foy - shd.naturalHeight + walkCorr;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (!facingLeft) {
      ctx.scale(-1, 1);
      ctx.drawImage(shd, -(fsdx + shd.naturalWidth), fsdy, shd.naturalWidth, shd.naturalHeight);
      if (furyAlpha > 0) {
        ctx.globalAlpha = furyAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-(fsdx + shd.naturalWidth), fsdy, shd.naturalWidth, shd.naturalHeight);
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.drawImage(shd, fsdx, fsdy, shd.naturalWidth, shd.naturalHeight);
      if (furyAlpha > 0) {
        ctx.globalAlpha = furyAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fsdx, fsdy, shd.naturalWidth, shd.naturalHeight);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  // splash particles
  if (player.splash.length > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const p of player.splash) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      const sx2 = Math.round(p.x - cameraX);
      const sy2 = Math.round(p.y - cameraY);
      // outer droplet
      ctx.fillStyle = '#5bc8f0';
      ctx.fillRect(sx2, sy2, p.size, p.size);
      // bright core on larger drops
      if (p.size >= 2 && alpha > 0.4) {
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = '#e8f8ff';
        ctx.fillRect(sx2, sy2, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // futuristic crosshair on homing target
  const crossTarget = player.homingWindupTarget || (player.dashing ? player.dashTarget : null);
  if (crossTarget && !crossTarget.dead) {
    const tx = Math.round(crossTarget.x + crossTarget.w / 2 - cameraX);
    const ty = Math.round((crossTarget._y ? crossTarget._y : crossTarget.y) + crossTarget.h / 2 - cameraY);
    const spin = (frameNow * 0.004) % (Math.PI * 2);
    const pulse = 0.6 + 0.4 * Math.sin(frameNow * 0.015);
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
    const prevAlpha = ctx.globalAlpha;
    ctx.fillStyle = '#c0f0ff';
    for (let i = 0; i < 5; i++) {
      const spread = (i - 2) * 4;
      const ox = -ny * spread; const oy = nx * spread;
      const bx = newest.x - cameraX + ox;
      const by = newest.y - cameraY + oy;
      const lineLen = 10 + i * 3;
      ctx.globalAlpha = 0.55 - i * 0.08;
      for (let d = 2; d < lineLen; d += 3) {
        ctx.fillRect(Math.round(bx - nx * d), Math.round(by - ny * d), 1, 1);
      }
    }
    ctx.globalAlpha = prevAlpha;
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

  // shockwave rings — drawn as 4 corner pixels at radius, no arc/stroke
  {
    const prevAlpha = ctx.globalAlpha;
    let _swn = 0;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < player.shockwaves.length; i++) {
      const sw = player.shockwaves[i];
      if (sw.delay > 0) { sw.delay--; player.shockwaves[_swn++] = sw; continue; }
      sw.life--; sw.r += sw.speed;
      if (sw.life <= 0) continue;
      player.shockwaves[_swn++] = sw;
      const frac = (sw.life / sw.maxLife) * 0.9;
      ctx.globalAlpha = frac > 0.66 ? 0.9 : frac > 0.33 ? 0.55 : 0.25;
      const cx = Math.round(sw.x - cameraX), cy = Math.round(sw.y - cameraY);
      const rx = Math.round(sw.r * (sw.sx || 1)), ry = Math.round(sw.r * (sw.sy || 1));
      const t = sw.lw || 2;
      ctx.fillRect(cx - rx - t, cy - ry - t, rx * 2 + t * 2, t); // top
      ctx.fillRect(cx - rx - t, cy + ry,     rx * 2 + t * 2, t); // bottom
      ctx.fillRect(cx - rx - t, cy - ry - t, t, ry * 2 + t * 2); // left
      ctx.fillRect(cx + rx,     cy - ry - t, t, ry * 2 + t * 2); // right
    }
    player.shockwaves.length = _swn;
    ctx.globalAlpha = prevAlpha;
  }

  // sparks — pixel boxes only (no stroke), globalAlpha quantized to 4 levels
  {
    const prevAlpha = ctx.globalAlpha;
    let _lastAlpha = -1, _sLen = 0;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < player.sparks.length; i++) {
      const sp = player.sparks[i];
      sp.life--;
      if (sp.gravity) sp.vy += sp.gravity;
      sp.x += sp.vx; sp.y += sp.vy;
      if (sp.life <= 0) continue;
      player.sparks[_sLen++] = sp;
      const frac = sp.life / sp.maxLife;
      const alpha = frac > 0.75 ? 1 : frac > 0.5 ? 0.7 : frac > 0.25 ? 0.4 : 0.15;
      if (alpha !== _lastAlpha) { ctx.globalAlpha = alpha; _lastAlpha = alpha; }
      const sx = Math.round(sp.x - cameraX);
      const sy = Math.round(sp.y - cameraY);
      const s = sp.size || 2;
      ctx.fillRect(sx - (s >> 1), sy - (s >> 1), s, s);
    }
    player.sparks.length = _sLen;
    ctx.globalAlpha = prevAlpha;
  }

  // underwater tint — suppress near surface (same depth window as wake fountain)
  if (player.inWater) {
    const _wz = (player.x + player.w / 2 >= WATER_ZONE_2.x) ? WATER_ZONE_2 : WATER_ZONE;
    const _depth = (player.y + player.h / 2) - _wz.y;
    if (_depth >= 32) {
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = '#1a6090';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
  }

  // bubbles — fixed pixel patterns by radius, no save/restore per bubble
  {
    const prevAlpha = ctx.globalAlpha;
    for (const b of player.bubbles) {
      const alpha = (b.life / b.maxLife) * 0.85;
      const bx = Math.round(b.x - cameraX);
      const by = Math.round(b.y - cameraY);
      const r = b.r;
      if (r === 1) {
        ctx.globalAlpha = alpha * 0.25; ctx.fillStyle = '#e8f8ff'; ctx.fillRect(bx, by, 1, 1);
        ctx.globalAlpha = alpha;        ctx.fillStyle = '#a0d8f0';
        ctx.fillRect(bx, by-1, 1,1); ctx.fillRect(bx, by+1, 1,1);
        ctx.fillRect(bx-1, by, 1,1); ctx.fillRect(bx+1, by, 1,1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(bx-1, by-1, 1, 1);
      } else if (r === 2) {
        ctx.globalAlpha = alpha * 0.25; ctx.fillStyle = '#e8f8ff';
        ctx.fillRect(bx-1, by-1, 3, 1); ctx.fillRect(bx-1, by, 3, 1); ctx.fillRect(bx-1, by+1, 3, 1);
        ctx.globalAlpha = alpha;        ctx.fillStyle = '#a0d8f0';
        ctx.fillRect(bx-1, by-2, 2,1); ctx.fillRect(bx-1, by+2, 2,1);
        ctx.fillRect(bx-2, by-1, 1,2); ctx.fillRect(bx+2, by-1, 1,2);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(bx-1, by-1, 1, 1);
      } else {
        ctx.globalAlpha = alpha * 0.25; ctx.fillStyle = '#e8f8ff';
        ctx.fillRect(bx-2, by-2, 5, 5);
        ctx.globalAlpha = alpha;        ctx.fillStyle = '#a0d8f0';
        ctx.fillRect(bx-1, by-3, 3,1); ctx.fillRect(bx-1, by+3, 3,1);
        ctx.fillRect(bx-3, by-1, 1,3); ctx.fillRect(bx+3, by-1, 1,3);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(bx-1, by-2, 1, 1);
      }
    }
    ctx.globalAlpha = prevAlpha;
  }

  // kill text floats up and fades
}
