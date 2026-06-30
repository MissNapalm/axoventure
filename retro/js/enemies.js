// tintSprite is defined in tint.js

// platforms[1]=y175, [2]=y155, [3]=y135  (oneWay platforms near the start)
function makeEnemy(x, patrolLeft, patrolRight, platformY) {
  return {
    x, startX: x,
    w: 0, h: 0,
    get y() {
      if (this.flipped || this.carried || this.thrown) return this._y;
      return this.platformY - this.h;
    },
    _y: 0,
    platformY,
    startPlatformY: platformY,
    patrolSpeed: 0.8,
    vx: 0.8,
    vy: 0,
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
    lastHitBy: null,
    particles: [],
    flipped: false,
    flippedTimer: 0,
    carried: false,
    thrown: false,
    throwAngle: 0,
  };
}

const enemies = [
  // upper section — platformY = platform.y (top surface; getter returns platformY - h)
  makeEnemy(100,   80,  190, 405),
  makeEnemy(530,  500,  620, 395),
  makeEnemy(680,  650,  755, 370),
  makeEnemy(950,  920, 1030, 378),
  makeEnemy(1230, 1200, 1310, 385),
];

function makeRedEnemy(x, patrolLeft, patrolRight, platformY) {
  return {
    red: true,
    x, startX: x,
    w: 0, h: 0,
    get y() {
      if (this.carried) {
        const jumpExtra = player.onGround ? 0 : (player.facingLeft ? S.carryJumpYL : S.carryJumpYR);
        return player.y - this.h + S.carryOffset + jumpExtra;
      }
      if (this.flipped || this.thrown) return this._y;
      return this.platformY - this.h;
    },
    _y: 0,
    platformY,
    startPlatformY: platformY,
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
  playSound('redguyflip');
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
  const throwUp = keys['KeyD'] || keys['KeyL'];
  if (throwUp) {
    e.vx = 0;
    e.vy = -(S.throwStrength * 2.2);
  } else {
    e.vx = player.facingLeft ? -S.throwStrength : S.throwStrength;
    e.vy = -5;
  }
}

function updateRedEnemies() {
  for (const e of redEnemies) {
    if (e.hitFlash > 0) e.hitFlash--;

    // particles — life only; physics handled in draw
    { let _pn = 0; for (let _pi = 0; _pi < e.particles.length; _pi++) { e.particles[_pi].life--; if (e.particles[_pi].life > 0) e.particles[_pn++] = e.particles[_pi]; } e.particles.length = _pn; }

    if (e.dead) {
      const dist = Math.abs((e.startX + e.w / 2) - (player.x + player.w / 2));
      if (dist > VIEW_W) {
        e.x = e.startX; e.platformY = e.startPlatformY; e._y = e.startPlatformY - e.h;
        e.vx = e.patrolSpeed; e.vy = 0;
        e.flipped = false; e.flippedTimer = 0; e.flipping = false; e.carried = false; e.thrown = false;
        e.hitFlash = 0; e.deathFlash = 0; e.frame = 0; e.frameTimer = 0; e.throwAngle = 0;
        e.jitterX = 0; e.jitterY = 0; e.jitterTimer = 0; e.particles = [];
        e.dead = false; // set last so draw skip holds until fully reset
      }
      continue;
    }

    if (e.carried) {
      e.frameTimer++;
      if (e.frameTimer >= 10) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }
      const xOff = player.facingLeft ? S.carryOffsetL : S.carryOffsetR;
      const jumpXOff = player.onGround ? 0 : (player.facingLeft ? S.carryJumpXL : S.carryJumpXR);
      e.x = player.x + player.w / 2 - e.w / 2 + xOff + jumpXOff;
      // die if dragged into water
      const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
      const inWater1 = ecx >= WATER_ZONE.x && ecx <= WATER_ZONE.x + WATER_ZONE.w && ecy >= WATER_ZONE.y && ecy <= WATER_ZONE.y + WATER_ZONE.h;
      const inWater2 = ecx >= WATER_ZONE_2.x && ecx <= WATER_ZONE_2.x + WATER_ZONE_2.w && ecy >= WATER_ZONE_2.y && ecy <= WATER_ZONE_2.y + WATER_ZONE_2.h;
      if (inWater1 || inWater2) {
        e.dead = true; spawnDeathStars(e);
        player.carrying = null;
        registerKill();
        continue;
      }
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
          player.killText = { text: 'THROW HIT!', timer: 50, maxTimer: 50, x: e.x + e.w / 2, y: e.y - 12 };
          registerKill();
          break;
        }
      }
      continue;
    }

    if (e.flipping) {
      e.throwAngle += 0.18;
      e.vy += S.redFlipGrav;
      e._y += e.vy;

      // kill if crossing water surface
      const _fl = e.x, _fr = e.x + e.w, _fb = e._y + e.h;
      const _inWZf = (_fr > WATER_ZONE.x && _fl < WATER_ZONE.x + WATER_ZONE.w && _fb > WATER_ZONE.y)
                  || (_fr > WATER_ZONE_2.x && _fl < WATER_ZONE_2.x + WATER_ZONE_2.w && _fb > WATER_ZONE_2.y);
      if (_inWZf) { e.dead = true; spawnDeathStars(e); if (player.carrying === e) player.carrying = null; registerKill(); continue; }

      // check platforms first so enemy lands on them rather than falling through
      let flippingLanded = false;
      for (const p of platforms) {
        const ox = Math.min(e.x + e.w, p.x + p.w) - Math.max(e.x, p.x);
        if (ox <= 0) continue;
        const prevBottom = e._y + e.h - e.vy;
        if (e.vy > 0 && prevBottom <= p.y && e._y + e.h >= p.y) {
          e._y = p.y - e.h;
          e.flipping = false;
          e.flipped = true; e.flippedTimer = 0;
          e.vy = 0; e.throwAngle = 0;
          e.platformY = p.y;
          flippingLanded = true;
          break;
        }
      }
      if (!flippingLanded && e._y + e.h >= GROUND_Y) {
        e._y = GROUND_Y - e.h;
        e.flipping = false;
        e.flipped = true; e.flippedTimer = 0;
        e.vy = 0; e.throwAngle = 0;
        e.platformY = GROUND_Y;
      }
      continue;
    }

    if (e.thrown) {
      e.throwAngle += e.vx * 0.07;
      e.vy += 0.25;
      const _rpx = e.x, _rpy = e._y;
      e.x  += e.vx;
      e._y += e.vy;

      // kill if crossing water surface
      const _tl = e.x, _tr = e.x + e.w, _tb = e._y + e.h;
      const _inWZ = (_tr > WATER_ZONE.x && _tl < WATER_ZONE.x + WATER_ZONE.w && _tb > WATER_ZONE.y)
                 || (_tr > WATER_ZONE_2.x && _tl < WATER_ZONE_2.x + WATER_ZONE_2.w && _tb > WATER_ZONE_2.y);
      if (_inWZ) { e.dead = true; spawnDeathStars(e); if (player.carrying === e) player.carrying = null; registerKill(); continue; }

      // swept bounding box for collision
      const _rsx1 = Math.min(_rpx, e.x), _rsx2 = Math.max(_rpx + e.w, e.x + e.w);
      const _rsy1 = Math.min(_rpy, e._y), _rsy2 = Math.max(_rpy + e.h, e._y + e.h);
      // check collision with blue enemies
      for (const ne of enemies) {
        if (ne.dead) continue;
        const ox = Math.min(_rsx2, ne.x + ne.w) - Math.max(_rsx1, ne.x);
        const oy = Math.min(_rsy2, ne.y + ne.h) - Math.max(_rsy1, ne.y);
        if (ox > 0 && oy > 0) {
          ne.dead = true; spawnDeathStars(ne);
          e.dead  = true; spawnDeathStars(e);
          triggerLightning(Math.round(e.x + e.w / 2 - cameraX));
          screenShakeTimer = 6;
          player.killText = { text: 'THROW HIT!', timer: 50, maxTimer: 50, x: e.x + e.w / 2, y: e._y - 12 };
          registerKill(); registerKill();
          break;
        }
      }
      if (e.dead) continue;
      // check collision with other red enemies
      for (const ne of redEnemies) {
        if (ne === e || ne.dead || ne.carried || ne.thrown || ne.flipping) continue;
        const ney = ne.y;
        const ox = Math.min(_rsx2, ne.x + ne.w) - Math.max(_rsx1, ne.x);
        const oy = Math.min(_rsy2, ney + ne.h) - Math.max(_rsy1, ney);
        if (ox > 0 && oy > 0) {
          ne.dead = true; spawnDeathStars(ne);
          e.dead  = true; spawnDeathStars(e);
          triggerLightning(Math.round(e.x + e.w / 2 - cameraX));
          screenShakeTimer = 6;
          player.killText = { text: 'THROW HIT!', timer: 50, maxTimer: 50, x: e.x + e.w / 2, y: e._y - 12 };
          registerKill(); registerKill();
          break;
        }
      }
      if (e.dead) continue;

      // platform bounce
      for (const p of platforms) {
        const ox = Math.min(e.x + e.w, p.x + p.w) - Math.max(e.x, p.x);
        if (ox <= 0) continue;
        const prevBottom = e._y + e.h - e.vy;
        if (e.vy > 0 && prevBottom <= p.y && e._y + e.h >= p.y) {
          e._y = p.y - e.h;
          e.vy *= -0.5;
          e.vx *= 0.85;
          if (Math.abs(e.vy) < 1) { e.thrown = false; e.flipped = true; e.flippedTimer = 0; e.vx = 0; e.vy = 0; e.platformY = p.y; }
        }
      }

      // hit ground floor — bounce and settle into flipped state
      if (e._y + e.h >= GROUND_Y) {
        e._y = GROUND_Y - e.h;
        e.vy *= -0.45;
        e.vx *= 0.8;
        if (Math.abs(e.vy) < 1) { e.thrown = false; e.flipped = true; e.flippedTimer = 0; e.vx = 0; e.vy = 0; e.platformY = GROUND_Y; }
      }
      continue;
    }

    // always animate (flipped, carried, or patrolling)
    e.frameTimer++;
    if (e.frameTimer >= 10) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }

    // invisible kill wall at water surface — any overlap with water x-range at or below water surface y kills instantly
    {
      const _rl = e.x, _rr = e.x + e.w, _rt = e.y, _rb = e.y + e.h;
      const _hitsW1 = _rr > WATER_ZONE.x && _rl < WATER_ZONE.x + WATER_ZONE.w && _rb > WATER_ZONE.y;
      const _hitsW2 = _rr > WATER_ZONE_2.x && _rl < WATER_ZONE_2.x + WATER_ZONE_2.w && _rb > WATER_ZONE_2.y;
      if (_hitsW1 || _hitsW2) { e.dead = true; spawnDeathStars(e); if (player.carrying === e) player.carrying = null; registerKill(); continue; }
    }

    if (e.flipped) {
      e.flippedTimer++;
      if (e.flippedTimer >= 180) {
        e.platformY = e._y + e.h; // stand up on whatever surface it's resting on
        e.flipped = false;
        e.flippedTimer = 0;
        e._y = 0;
        e.patrolLeft  = e.x - 40;
        e.patrolRight = e.x + 40;
        // clamp patrol range away from water zone edges
        if (e.patrolRight > WATER_ZONE.x && e.x < WATER_ZONE.x) e.patrolRight = WATER_ZONE.x - e.w;
        if (e.patrolLeft  < WATER_ZONE.x + WATER_ZONE.w && e.x >= WATER_ZONE.x + WATER_ZONE.w) e.patrolLeft = WATER_ZONE.x + WATER_ZONE.w;
        if (e.patrolRight > WATER_ZONE_2.x && e.x < WATER_ZONE_2.x) e.patrolRight = WATER_ZONE_2.x - e.w;
        if (e.patrolLeft  < WATER_ZONE_2.x + WATER_ZONE_2.w && e.x >= WATER_ZONE_2.x + WATER_ZONE_2.w) e.patrolLeft = WATER_ZONE_2.x + WATER_ZONE_2.w;
        e.vx = e.patrolSpeed;
      }
      continue;
    }

    // patrol — check for ledge ahead before moving
    {
      const probeX = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
      const probeY = e.platformY + 1;
      let hasGround = false;
      for (const p of platforms) {
        if (probeX >= p.x && probeX <= p.x + p.w && probeY >= p.y && probeY <= p.y + p.h + 4) { hasGround = true; break; }
      }
      if (!hasGround) e.vx = -e.vx;
    }
    e.x += e.vx;
    if (e.x <= e.patrolLeft)        { e.x = e.patrolLeft;        e.vx =  Math.abs(e.vx); }
    if (e.x + e.w >= e.patrolRight) { e.x = e.patrolRight - e.w; e.vx = -Math.abs(e.vx); }

    // contact with player: dashing/homing handled elsewhere, walking hurts Axo (fury blocks damage)
    if (!player.dashing && !player.groundDashing && !fury.active) {
      const ey = e.y; // use getter so patrol enemies resolve platformY - h correctly
      const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
      const oy = Math.min(player.y + player.h, ey + e.h) - Math.max(player.y, ey);
      if (ox > 0 && oy > 0 && player.hurtTimer === 0) hurtPlayer();
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
    ? (player.y - e.h + S.carryOffset + (player.onGround ? 0 : (player.facingLeft ? S.carryJumpYL : S.carryJumpYR)))
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

let _fishIdCounter = 0;

function makeFish(x, y, swimLeft, swimRight) {
  y += WORLD_OFFSET_Y;
  return {
    fish: true,
    _id: _fishIdCounter++,
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
    respawnTimer: 0,
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
  makeFish(3150, 420, 3020, 3300),
  makeFish(3350, 370, 3200, 3520),
  makeFish(3550, 480, 3400, 3700),
  makeFish(3750, 360, 3600, 3900),
  makeFish(3950, 440, 3800, 4100),
  makeFish(1850, 560, 1750, 2050),
  makeFish(2150, 620, 2000, 2350),
  makeFish(2500, 580, 2380, 2650),
  makeFish(2750, 640, 2600, 2900),
  makeFish(3100, 600, 2950, 3250),
  makeFish(3400, 550, 3250, 3600),
  makeFish(3700, 620, 3550, 3850),
  makeFish(3950, 580, 3800, 4100),
  makeFish(4520, 420, 4490, 4960),
  makeFish(4700, 370, 4490, 4960),
  makeFish(4860, 450, 4490, 4960),
  makeFish(4560, 600, 4490, 4960),
  makeFish(4880, 550, 4490, 4960),
];

function updateFish() {
  for (const e of fishEnemies) {
    { let _pn = 0; for (let _pi = 0; _pi < e.particles.length; _pi++) { e.particles[_pi].life--; if (e.particles[_pi].life > 0) e.particles[_pn++] = e.particles[_pi]; } e.particles.length = _pn; }

    if (e.hitFlash > 0) e.hitFlash--;
    if (e.deathFlash > 0) e.deathFlash--;

    if (e.dead) {

      if (e.respawnTimer > 0) { e.respawnTimer--; continue; }
      const distFromPlayer = Math.abs(e.startX - (player.x + player.w / 2));
      if (distFromPlayer > VIEW_W * 2) {
        e.x = e.startX; e.y = e.startY;
        e.vx = 0.7; e.vy = 0;
        e.hp = 1; e.dead = false;
        e.hitFlash = 0; e.deathFlash = 0; e.particles = [];
        e.respawnTimer = 0;
      }
      continue;
    }

    // clamp fish to their water zone at all times
    e.bobPhase += 0.05;
    const inZone2 = e.startX >= WATER_ZONE_2.x;
    const wz = inZone2 ? WATER_ZONE_2 : WATER_ZONE;
    const wzFloor = wz.y + wz.h;
    const waterSurface = wz.y + e.h + 2;
    const waterFloor   = wzFloor - e.h - 2;
    e.y = Math.max(waterSurface, Math.min(waterFloor, e.startY + Math.sin(e.bobPhase) * 8));
    e.x = Math.max(wz.x, Math.min(wz.x + wz.w - e.w, e.x));

    // horizontal patrol
    {
    e.x += e.vx;
    if (e.x <= e.swimLeft)             { e.x = e.swimLeft;         e.vx =  Math.abs(e.vx); }
    if (e.x + e.w >= e.swimRight)      { e.x = e.swimRight - e.w;  e.vx = -Math.abs(e.vx); }
    }
    // wall collision against solid platforms
    for (const p of platforms) {
      if (p.oneWay) continue;
      const ox = Math.min(e.x + e.w, p.x + p.w) - Math.max(e.x, p.x);
      const oy = Math.min(e.y + e.h, p.y + p.h) - Math.max(e.y, p.y);
      if (ox > 0 && oy > 0) {
        // push out horizontally and reverse
        if (e.x + e.w / 2 < p.x + p.w / 2) { e.x = p.x - e.w; e.vx = -Math.abs(e.vx); }
        else                                  { e.x = p.x + p.w; e.vx =  Math.abs(e.vx); }
      }
    }

    // hurt player on contact unless homing/dead
    if (!e.dead && !player.dashing && player.hurtTimer === 0 && player.postDashTimer === 0) {
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

    // build normal fish canvas once per fish object
    if (!e._oc) {
      e._oc = getOC('fish_px_' + e._id, e.w, e.h);
      const d = e._oc._ctx.createImageData(e.w, e.h);
      const px = d.data;
      const B = [40,160,200,255], F = [60,200,230,255], T = [20,110,160,255];
      const EY = [255,255,255,255], PU = [10,10,10,255];
      const set = (x2, y2, c) => {
        if (x2 < 0 || x2 >= e.w || y2 < 0 || y2 >= e.h) return;
        const i = (y2 * e.w + x2) * 4;
        px[i]=c[0]; px[i+1]=c[1]; px[i+2]=c[2]; px[i+3]=c[3];
      };
      for (let y2 = 2; y2 <= 7; y2++) { set(0,y2,T); set(1,y2,T); }
      set(0,1,T); set(0,8,T); set(1,1,T); set(1,8,T);
      for (let x2 = 2; x2 <= 15; x2++) {
        const top = x2 < 8 ? 2 : x2 < 12 ? 1 : 2;
        const bot = x2 < 8 ? 7 : x2 < 12 ? 8 : 7;
        for (let y2 = top; y2 <= bot; y2++) set(x2,y2,B);
      }
      for (let x2 = 5; x2 <= 9; x2++) { set(x2,0,F); set(x2,1,F); }
      for (let x2 = 13; x2 <= 17; x2++) {
        const top = x2 < 16 ? 1 : 2, bot = x2 < 16 ? 8 : 7;
        for (let y2 = top; y2 <= bot; y2++) set(x2,y2,F);
      }
      set(18,3,F); set(18,4,F); set(18,5,F); set(18,6,F);
      set(19,4,F); set(19,5,F);
      set(15,3,EY); set(16,3,EY); set(15,4,EY); set(16,4,EY);
      set(15,3,PU);
      e._oc._ctx.putImageData(d, 0, 0);
    }

    ctx.imageSmoothingEnabled = false;
    if (flashColor > 0 && e._oc) {
      const woc = getOC('fish_flash_' + e._id, e.w, e.h);
      woc._ctx.clearRect(0, 0, e.w, e.h);
      woc._ctx.drawImage(e._oc, 0, 0);
      woc._ctx.globalCompositeOperation = 'source-atop';
      woc._ctx.fillStyle = '#ffffff';
      woc._ctx.fillRect(0, 0, e.w, e.h);
      woc._ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(woc, -e.w / 2, -e.h / 2, e.w, e.h);
    } else if (e._oc) {
      ctx.drawImage(e._oc, -e.w / 2, -e.h / 2, e.w, e.h);
    }

    ctx.restore();
  }
}


// ── Kill combo ────────────────────────────────────────────────────────────────
const combo = {
  count: 0,
  timer: 0,
  WINDOW: 120, // frames to keep combo alive after a kill
  displayTimer: 0, // how long to show the final count after it expires
  peak: 0,
};

// ── Fury meter ────────────────────────────────────────────────────────────────
const FURY_MAX       = 20;  // kills needed to fill
const FURY_DURATION  = 600; // frames fury lasts at full (10 sec @ 60fps)

const fury = {
  kills:    0,     // current fill (0–FURY_MAX)
  active:   false,
  timer:    0,     // counts down while active
  ready:    false, // meter full, waiting for F
  flashTimer: 0,   // internal counter for white flash cycle
};

function isFuryActive() { return fury.active; }

function activateFury() {
  fury.active  = true;
  fury.ready   = false;
  fury.kills   = FURY_MAX;
  fury.timer   = S.furyDuration;
  fury.flashTimer = 0;
}

function updateFury() {
  if (fury.active) {
    fury.timer--;
    fury.flashTimer++;
    if (fury.timer <= 0) {
      fury.active = false;
      fury.kills  = 0;
      fury.timer  = 0;
    }
  }
}

function registerKill() {
  playSound('die');
  combo.count++;
  combo.timer = combo.WINDOW;
  combo.displayTimer = 0;
  if (combo.count > combo.peak) combo.peak = combo.count;

  if (!fury.active && !fury.ready && fury.kills < FURY_MAX) {
    fury.kills = Math.min(FURY_MAX, fury.kills + S.furyKillFill);
    if (fury.kills >= FURY_MAX) fury.ready = true;
  }
}

function updateCombo() {
  if (combo.timer > 0) {
    combo.timer--;
    if (combo.timer === 0 && combo.count > 1) {
      combo.displayTimer = 120; // show final count for 2 seconds
    } else if (combo.timer === 0) {
      combo.count = 0;
    }
  }
  if (combo.displayTimer > 0) {
    combo.displayTimer--;
    if (combo.displayTimer === 0) combo.count = 0;
  }
}

function hitFish(e) {
  if (fury.active) e.hp = 0; else e.hp--;
  e.hitFlash = HIT_FLASH_FRAMES;
  if (e.hp <= 0) {
    e.deathFlash = 5;
    e.dead = true;
    e.respawnTimer = 180;
    spawnDeathStars(e);
    triggerLightning(Math.round(e.x + e.w / 2 - cameraX));
    screenShakeTimer = 6;
    if (player.dashing || player.groundDashing) player.killSpin = 10;
    registerKill();
  }
}

function hitFishByHoming(e, impactX, impactY) {
  e.dead = true;
  e.respawnTimer = 180;
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
  registerKill();
}

function hitFishByDash(e, ex, ey) {
  e.dead = true;
  e.respawnTimer = 180;
  e.deathFlash = 5;
  spawnDeathStars(e);
  triggerLightning(Math.round(ex - cameraX));
  screenShakeTimer = 6;
  player.killSpin = 10;
  hitFreezeTimer = HIT_FREEZE_FRAMES;
  spawnImpactVFX(ex, ey);
  player.killText = { text: 'DASH HIT!', timer: 50, x: ex, y: ey - 12 };
  registerKill();
}

// ── Big Fish enemies ──────────────────────────────────────────────────────────
// States: 'patrol' → 'windup' (invincible, telegraphs charge) → 'rush' → 'cooldown' → 'patrol'

const BIG_FISH_W = 28;
const BIG_FISH_H = 15;
const WINDUP_FRAMES  = 90;  // stun/telegraph duration
const RUSH_SPEED     = 10;
const RUSH_FRAMES    = 22;
const COOLDOWN_FRAMES = 60;
const PATROL_TRIGGER_DIST = 130; // how close player must be to trigger windup

function makeBigFish(x, y, swimLeft, swimRight) {
  y += WORLD_OFFSET_Y;
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
    proximityTimer: 0,
    contactTimer: 0,
    particles: [],
  };
}

const bigFishEnemies = [
  makeBigFish(2000, 420, 1870, 2130),
  makeBigFish(2300, 500, 2170, 2450),
  makeBigFish(2650, 370, 2500, 2800),
  makeBigFish(3000, 480, 2860, 3150),
  // second pool (x:4480–4980)
  makeBigFish(4560, 450, 4490, 4960),
  makeBigFish(4780, 550, 4490, 4960),
  makeBigFish(4670, 650, 4490, 4960),
];

function updateBigFish() {
  for (const e of bigFishEnemies) {
    { let _pn = 0; for (let _pi = 0; _pi < e.particles.length; _pi++) { e.particles[_pi].life--; if (e.particles[_pi].life > 0) e.particles[_pn++] = e.particles[_pi]; } e.particles.length = _pn; }

    if (e.deathFlash > 0) e.deathFlash--;
    if (e.hitFlash > 0) e.hitFlash--;

    if (e.contactTimer > 0) e.contactTimer--;

    if (e.dead) {
      const distFromPlayer = Math.abs(e.startX - (player.x + player.w / 2));
      if (distFromPlayer > VIEW_W * 2) {
        e.x = e.startX; e.y = e.startY;
        e.vx = 0.5; e.vy = 0;
        e.hp = 3; e.dead = false; e.deathFlash = 0; e.hitFlash = 0; e.proximityTimer = 0; e.contactTimer = 0;
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

    const bfInZone2 = e.startX >= WATER_ZONE_2.x;
    const bfWz = bfInZone2 ? WATER_ZONE_2 : WATER_ZONE;
    const bfSurface = bfWz.y + e.h + 2;
    const bfFloor   = bfWz.y + bfWz.h - e.h - 2;

    if (e.state === 'patrol') {
      e.bobPhase += 0.04;
      e.y = Math.max(bfSurface, Math.min(bfFloor, e.startY + Math.sin(e.bobPhase) * 10));
      e.x += e.vx;
      if (e.x <= e.swimLeft)           { e.x = e.swimLeft;         e.vx =  Math.abs(e.vx); }
      if (e.x + e.w >= e.swimRight)    { e.x = e.swimRight - e.w;  e.vx = -Math.abs(e.vx); }
      e.x = Math.max(bfWz.x, Math.min(bfWz.x + bfWz.w - e.w, e.x));

      // aggro if player stays close for 3 seconds (180 frames)
      if (player.inWater && dist < PATROL_TRIGGER_DIST) {
        e.proximityTimer++;
        if (e.proximityTimer >= 180) {
          e.proximityTimer = 0;
          e.state = 'windup';
          e.stateTimer = WINDUP_FRAMES;
          playSound('bigfishcharge');
          e.vx = 0;
        }
      } else {
        e.proximityTimer = 0;
      }

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
      e.x = Math.max(bfWz.x, Math.min(bfWz.x + bfWz.w - e.w, e.x));
      e.y = Math.max(bfSurface, Math.min(bfFloor, e.y));
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

    // contact hurts in any state — brief grace after homing hit, then vulnerable
    if (!player.dashing && e.contactTimer === 0) {
      const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
      const oy = Math.min(player.y + player.h, e.y + e.h) - Math.max(player.y, e.y);
      if (ox > 0 && oy > 0) {
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
    const facingRight = e.state === 'rush' ? e.rushVx >= 0 : e.vx >= 0;
    const W = e.w, H = e.h;

    const isWindup  = e.state === 'windup';
    const isRush    = e.state === 'rush';
    const flash = e.deathFlash > 0;

    // rush angle: rotate sprite so nose points at target
    const rushAngle = isRush ? Math.atan2(e.rushVy, Math.abs(e.rushVx)) * (facingRight ? 1 : -1) : 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(sx + W / 2, sy + H / 2);
    ctx.rotate(rushAngle);
    if (!facingRight) ctx.scale(-1, 1);

    // rush: motion lines behind fish (fillRect, no stroke)
    if (isRush) {
      ctx.fillStyle = '#ff6600';
      for (let i = 0; i < 4; i++) {
        const lx = Math.round(-W * 0.5 - i * 4);
        const ly = Math.round(-H * 0.3 + i * (H * 0.2));
        const len = 4 + i * 2;
        ctx.globalAlpha = 0.7 - i * 0.15;
        ctx.fillRect(lx - len, ly, len, 1);
      }
      ctx.globalAlpha = 1;
    }

    // SNES-style pixel fish — pre-rendered per state variant
    const variant = flash ? 'flash' : (isWindup||isRush) ? 'hot' : 'normal';
    const cacheKey = 'bigfish_' + variant;
    if (!e['_oc_' + variant]) {
      const palette = {
        flash:  { K:[255,255,255,255], D:[255,255,255,255], M:[255,255,255,255], L:[255,255,255,255], B:[255,255,255,255], E:[255,255,255,255], P:[255,255,255,255] },
        hot:    { K:[0,0,0,255], D:[150,40,0,255], M:[210,80,10,255], L:[240,130,40,255], B:[255,180,90,255], E:[255,255,255,255], P:[10,10,10,255] },
        normal: { K:[0,0,0,255], D:[15,80,130,255], M:[40,140,190,255], L:[80,190,230,255], B:[160,225,245,255], E:[255,255,255,255], P:[10,10,10,255] },
      };
      const C = palette[variant];
      const map = [
        'KK..........KKK.............',
        '.KK.......KMMKK.............',
        '..KK.....KMMMMLKK...........',
        'K..KK...KDDMMMLLKK..........',
        'KK..KKKKDDDMMMLLLLKK........',
        '.KK.KDDDDDMMMBBLLLKKK.......',
        '..KKDDDDDDMMMBBLLLLKEPKKK...',
        '..KKDDDDDDMMMBBLLLKKEPKLKK..',
        '..KKDDDDDDMMMBBLLLLKKKKLKK..',
        '.KK.KDDDDDDMMMBBLLLKKKKK...',
        'KK..KKKKDDDDMMMLLLLKK.......',
        'K..KK...KDDMMMLLLKK.........',
        '..KK.....KMMMLKKK...........',
        '.KK.......KMMKK.............',
        'KK..........KK..............',
      ];
      const oc2 = getOC(cacheKey, W, H);
      const d2 = oc2._ctx.createImageData(W, H);
      const px2 = d2.data;
      for (let row = 0; row < H; row++) {
        const rowStr = map[row] || '';
        for (let col = 0; col < W; col++) {
          const color = C[rowStr[col]] || null;
          if (!color) continue;
          const i = (row * W + col) * 4;
          px2[i]=color[0]; px2[i+1]=color[1]; px2[i+2]=color[2]; px2[i+3]=color[3];
        }
      }
      oc2._ctx.putImageData(d2, 0, 0);
      e['_oc_' + variant] = oc2;
    }
    ctx.imageSmoothingEnabled = false;
    const drawOC = e['_oc_' + variant];
    if (e.hitFlash > 0 && !flash) {
      const hoc = getOC('bigfish_hit', W, H);
      hoc._ctx.clearRect(0, 0, W, H);
      hoc._ctx.drawImage(drawOC, 0, 0);
      hoc._ctx.globalCompositeOperation = 'source-atop';
      hoc._ctx.globalAlpha = e.hitFlash / HIT_FLASH_FRAMES * 0.8;
      hoc._ctx.fillStyle = '#ffffff';
      hoc._ctx.fillRect(0, 0, W, H);
      hoc._ctx.globalCompositeOperation = 'source-over';
      hoc._ctx.globalAlpha = 1;
      ctx.drawImage(hoc, -W/2, -H/2, W, H);
    } else {
      ctx.drawImage(drawOC, -W/2, -H/2, W, H);
    }

    ctx.restore();

    // warning exclamation during windup
    if (isWindup) {
      const pulse = Math.floor(frameNow / 120) % 2 === 0;
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
  if (fury.active) e.hp = 0; else e.hp--;
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
  e.contactTimer = 20;
  damageBigFish(e, impactX, impactY, 'HOMING HIT!', true);
}

function hitBigFishByDash(e, ex, ey) {
  if (e.state === 'windup' || e.state === 'rush') return;
  damageBigFish(e, ex, ey, 'DASH HIT!', false);
}

// ─────────────────────────────────────────────────────────────────────────────

function flipEnemy(e) {
  e.flipping = true;
  e.flipped = false;
  e.flippedTimer = 0;
  e._y = e.y;
  e.vy = -5;
  e.vx = 0;
  e.throwAngle = 0;
  e.stunTimer = 0;
  e.shakeTimer = 0;
}

function carryEnemy(e) {
  e.flipped = false;
  e.carried = true;
}

function throwEnemy(e) {
  e.carried = false;
  e.thrown = true;
  e._y = player.y - e.h / 2;
  const throwUp = keys['KeyD'] || keys['KeyL'];
  if (throwUp) {
    e.vx = 0;
    e.vy = -(S.throwStrength * 2.2);
  } else {
    e.vx = player.facingLeft ? -S.throwStrength : S.throwStrength;
    e.vy = -5;
  }
}

function hitEnemy(e) {
  if (e.stunTimer > 0 && !fury.active) return; // invincible during spike mode unless fury is on
  if (fury.active) e.hp = 0; else e.hp--;
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
    registerKill();
  } else {
    e.shakeTimer = 30;
  }
}

function updateEnemies() {
  for (const e of enemies) {
    // particles — life only; physics handled in draw
    { let _pn = 0; for (let _pi = 0; _pi < e.particles.length; _pi++) { e.particles[_pi].life--; if (e.particles[_pi].life > 0) e.particles[_pn++] = e.particles[_pi]; } e.particles.length = _pn; }

    if (e.hitTextTimer > 0) e.hitTextTimer--;
    if (e.deathFlash > 0) e.deathFlash--;
    if (e.dead) {
      const distToPlayer = Math.abs((e.startX + e.w / 2) - (player.x + player.w / 2));
      if (distToPlayer > VIEW_W) {
        // player has walked away — respawn
        e.x = e.startX;
        e.vx = e.patrolSpeed;
        e.hp = 2;
        e.shakeTimer = 0;
        e.stunTimer = 0;
        e.hitFlash = 0;
        e.deathFlash = 0;
        e.hitTextTimer = 0;
        e.frame = 0; e.frameTimer = 0;
        e.particles = [];
        e.flipped = false; e.flipping = false; e.flippedTimer = 0;
        e.carried = false; e.thrown = false;
        e.platformY = e.startPlatformY; e._y = 0; e.vy = 0; e.throwAngle = 0;
        e.lastHitBy = null;
        e.dead = false; // set last so draw skip holds until fully reset
      }
      continue;
    }

    // ── flipping arc (ground-pounded) ────────────────────────────────────────
    if (e.flipping) {
      e.throwAngle += 0.18;
      e.vy += S.redFlipGrav;
      e._y += e.vy;
      // platform landing
      let blueLanded = false;
      for (const p of platforms) {
        const pox = Math.min(e.x + e.w, p.x + p.w) - Math.max(e.x, p.x);
        if (pox <= 0) continue;
        const prevBot = e._y + e.h - e.vy;
        if (e.vy > 0 && prevBot <= p.y + 1 && e._y + e.h >= p.y) {
          e._y = p.y - e.h; e.flipping = false; e.flipped = true; e.flippedTimer = 0; e.vy = 0; e.throwAngle = 0; blueLanded = true; break;
        }
      }
      if (!blueLanded && e._y + e.h >= GROUND_Y) {
        e._y = GROUND_Y - e.h; e.flipping = false; e.flipped = true; e.flippedTimer = 0; e.vy = 0; e.throwAngle = 0;
      }
      continue;
    }

    // ── flipped / carried / thrown (ground-pounded) ──────────────────────────
    if (e.carried) {
      const xOff = player.facingLeft ? S.carryOffsetL : S.carryOffsetR;
      const jumpXOff = player.onGround ? 0 : (player.facingLeft ? S.carryJumpXL : S.carryJumpXR);
      e.x = player.x + player.w / 2 - e.w / 2 + xOff + jumpXOff;
      e._y = player.y - e.h + S.blueCarryOffset + (!player.onGround ? (player.facingLeft ? S.carryJumpYL : S.carryJumpYR) : 0);
      e.frameTimer++;
      if (e.frameTimer >= 10) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }
      continue;
    }

    if (e.thrown) {
      e.throwAngle += e.vx * 0.07; // spin like red enemy
      e.vy += 0.25; // identical gravity to thrown red enemy
      const _prevX = e.x, _prevY = e._y;
      e._y += e.vy;
      e.x  += e.vx;
      // animate while thrown
      e.frameTimer++;
      if (e.frameTimer >= 10) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }
      // water / out-of-world kill
      const _fb2 = e._y + e.h > WATER_ZONE.y && e.x + e.w > WATER_ZONE.x && e.x < WATER_ZONE.x + WATER_ZONE.w;
      const _fb3 = e._y + e.h > WATER_ZONE_2.y && e.x + e.w > WATER_ZONE_2.x && e.x < WATER_ZONE_2.x + WATER_ZONE_2.w;
      if (_fb2 || _fb3 || e._y > 1200) { e.dead = true; spawnDeathStars(e); registerKill(); continue; }
      // swept bounding box: union of prev and current position catches fast-moving throws
      const _sx1 = Math.min(_prevX, e.x), _sx2 = Math.max(_prevX + e.w, e.x + e.w);
      const _sy1 = Math.min(_prevY, e._y), _sy2 = Math.max(_prevY + e.h, e._y + e.h);
      // collision with red enemies
      for (const re of redEnemies) {
        if (re.dead || re.carried) continue;
        const rey = re.y, rox = Math.min(_sx2, re.x + re.w) - Math.max(_sx1, re.x);
        const roy = Math.min(_sy2, rey + re.h) - Math.max(_sy1, rey);
        if (rox > 0 && roy > 0) {
          re.dead = true; spawnDeathStars(re);
          e.dead  = true; spawnDeathStars(e);
          triggerLightning(Math.round(e.x + e.w / 2 - cameraX));
          screenShakeTimer = 6;
          player.killText = { text: 'THROW HIT!', timer: 50, maxTimer: 50, x: e.x + e.w / 2, y: e._y - 12 };
          registerKill(); registerKill();
          break;
        }
      }
      if (e.dead) continue;
      // collision with other blue enemies
      for (const ne of enemies) {
        if (ne === e || ne.dead || ne.flipped || ne.carried || ne.thrown) continue;
        const ney = ne.y, nox = Math.min(_sx2, ne.x + ne.w) - Math.max(_sx1, ne.x);
        const noy = Math.min(_sy2, ney + ne.h) - Math.max(_sy1, ney);
        if (nox > 0 && noy > 0) {
          ne.dead = true; spawnDeathStars(ne);
          e.dead  = true; spawnDeathStars(e);
          triggerLightning(Math.round(e.x + e.w / 2 - cameraX));
          screenShakeTimer = 6;
          player.killText = { text: 'THROW HIT!', timer: 50, maxTimer: 50, x: e.x + e.w / 2, y: e._y - 12 };
          registerKill(); registerKill();
          break;
        }
      }
      if (e.dead) continue;
      // platform bounce — identical to red enemy
      for (const p of platforms) {
        if (p.oneWay && e.vy < 0) continue;
        const ox2 = Math.min(e.x + e.w, p.x + p.w) - Math.max(e.x, p.x);
        const prevBottom2 = e._y + e.h - e.vy;
        if (ox2 > 0 && e.vy > 0 && prevBottom2 <= p.y && e._y + e.h >= p.y) {
          e._y = p.y - e.h; e.vy *= -0.5; e.vx *= 0.85;
          if (Math.abs(e.vy) < 1) { e.thrown = false; e.flipped = true; e.flippedTimer = 0; e.vx = 0; e.vy = 0; e.throwAngle = 0; e.platformY = p.y; }
          break;
        }
      }
      if (e.dead) continue;
      // ground floor bounce — identical to red enemy
      if (e._y + e.h >= GROUND_Y) {
        e._y = GROUND_Y - e.h; e.vy *= -0.45; e.vx *= 0.8;
        if (Math.abs(e.vy) < 1) { e.thrown = false; e.flipped = true; e.flippedTimer = 0; e.vx = 0; e.vy = 0; e.throwAngle = 0; }
      }
      continue;
    }

    if (e.flipped) {
      // water kill — x-overlap only so elevated enemies also die
      { const _fl = e.x, _fr = e.x + e.w;
        const _hw1 = _fr > WATER_ZONE.x && _fl < WATER_ZONE.x + WATER_ZONE.w;
        const _hw2 = _fr > WATER_ZONE_2.x && _fl < WATER_ZONE_2.x + WATER_ZONE_2.w;
        if (_hw1 || _hw2) { e.dead = true; spawnDeathStars(e); if (player.carrying === e) player.carrying = null; registerKill(); continue; }
      }
      e.flippedTimer++;
      // gravity + platform/ground landing — clamp to downward only so bounce setting can't push upward
      e.vy += S.redFlipGrav;
      e._y += e.vy;
      // platform landing — snap any time bottom is inside platform top surface
      for (const p of platforms) {
        if (p.oneWay && e.vy < 0) continue;
        const pox = Math.min(e.x + e.w, p.x + p.w) - Math.max(e.x, p.x);
        if (pox > 0 && e._y + e.h >= p.y && e._y < p.y + p.h) {
          e._y = p.y - e.h; e.vy = 0; break;
        }
      }
      // ground floor
      if (e._y + e.h >= GROUND_Y) { e._y = GROUND_Y - e.h; e.vy = 0; }
      // animate while flipped
      e.frameTimer++;
      if (e.frameTimer >= 10) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }
      // player walks into flipped blue = carry
      const ox2 = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
      const oy2 = Math.min(player.y + player.h, e._y + e.h) - Math.max(player.y, e._y);
      if (ox2 > 0 && oy2 > 0 && !player.carrying && !player.dashing) {
        carryEnemy(e); player.carrying = e; continue;
      }
      // stand back up after 300 frames (~5s)
      if (e.flippedTimer >= 300) {
        e.platformY = e._y + e.h; // lock patrol ground to wherever it landed
        e.patrolLeft  = e.x - 80;
        e.patrolRight = e.x + e.w + 80;
        e.flipped = false; e.flippedTimer = 0; e._y = 0; e.vy = 0;
        e.vx = e.patrolSpeed; e.stunTimer = 0; e.shakeTimer = 0;
      }
      continue;
    }

    if (e.hitFlash > 0) e.hitFlash--;
    if (e.shakeTimer > 0) {
      e.shakeTimer--;
      if (e.shakeTimer === 0) { e.stunTimer = S.stunFrames; e.lastHitBy = null; }
      continue;
    }
    if (e.stunTimer > 0) {
      e.stunTimer--;
      if (e.stunTimer === 0) {
        e.vx = e.vx >= 0 ? e.patrolSpeed : -e.patrolSpeed;
      }
      // contact during spike mode — fury blocks damage, otherwise hurts player
      if (!player.dashing && !player.groundDashing && !fury.active) {
        const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
        const oy = Math.min(player.y + player.h, e.y + e.h) - Math.max(player.y, e.y);
        if (ox > 0 && oy > 0 && player.hurtTimer === 0) hurtPlayer();
      }
      continue;
    }

    // ledge detection — same as red enemy
    {
      const probeX = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
      const probeY = e.platformY + 1;
      let hasGround = false;
      for (const p of platforms) {
        if (probeX >= p.x && probeX <= p.x + p.w && probeY >= p.y && probeY <= p.y + p.h + 4) { hasGround = true; break; }
      }
      if (!hasGround) e.vx = -e.vx;
    }

    // kill wall over water — x-overlap only, so platform enemies above water also die
    {
      const _bl = e.x, _br = e.x + e.w;
      const _hitsW1 = _br > WATER_ZONE.x && _bl < WATER_ZONE.x + WATER_ZONE.w;
      const _hitsW2 = _br > WATER_ZONE_2.x && _bl < WATER_ZONE_2.x + WATER_ZONE_2.w;
      if (_hitsW1 || _hitsW2) { e.dead = true; spawnDeathStars(e); if (player.carrying === e) player.carrying = null; registerKill(); continue; }
    }

    e.x += e.vx;
    if (e.x <= e.patrolLeft)        { e.x = e.patrolLeft;         e.vx =  Math.abs(e.vx); }
    if (e.x + e.w >= e.patrolRight) { e.x = e.patrolRight - e.w;  e.vx = -Math.abs(e.vx); }

    e.frameTimer++;
    if (e.frameTimer >= 10) { e.frameTimer = 0; e.frame = (e.frame + 1) % 2; }

    // hurt player on contact unless dashing, homing, or fury
    if (!player.dashing && !player.groundDashing && !fury.active) {
      const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
      const oy = Math.min(player.y + player.h, e.y + e.h) - Math.max(player.y, e.y);
      if (ox > 0 && oy > 0 && player.hurtTimer === 0) hurtPlayer();
    }
  }
}

function drawParticles(particles) {
  if (!particles.length) return;
  const prevAlpha = ctx.globalAlpha;
  let _lastAlpha = -1;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.gravity) p.vy += p.gravity;
    p.x += p.vx; p.y += p.vy;
    const frac = p.life / p.maxLife;
    const alpha = frac > 0.75 ? 1 : frac > 0.5 ? 0.7 : frac > 0.25 ? 0.4 : 0.15;
    if (alpha !== _lastAlpha) { ctx.globalAlpha = alpha; _lastAlpha = alpha; }
    const sx = Math.round(p.x - cameraX);
    const sy = Math.round(p.y - cameraY);
    if (p.kind === 'circle') {
      p.r += p.speed;
      const r = Math.round(p.r);
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    } else {
      const s = p.size || 2;
      ctx.fillRect(sx - (s >> 1), sy - (s >> 1), s, s);
    }
  }
  ctx.globalAlpha = prevAlpha;
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

    // flipping/thrown arc — spin; flipped/carried — upside-down
    if (e.flipping || e.flipped || e.carried || e.thrown) {
      const fsy = Math.round(e._y + S.blueFlippedGndY - cameraY);
      const fspr = sprites[e.frame === 0 ? 'badguy1' : 'badguy2'];
      ctx.translate(sx + e.w / 2, fsy + e.h / 2);
      if (e.flipping || e.thrown) {
        ctx.rotate(e.throwAngle);
      } else {
        ctx.scale(1, -1);
      }
      ctx.drawImage(fspr, -e.w / 2, -e.h / 2, e.w, e.h);
      ctx.restore();
      continue;
    }

    const spr = e.deathFlash > 0
      ? sprites[e.frame === 0 ? 'badguy1' : 'badguy2']
      : (e.stunTimer > 0 || e.shakeTimer > 0)
        ? sprites[e.stunTimer > 0 ? 'badguy3' : (e.frame === 0 ? 'badguy1' : 'badguy2')]
        : sprites[e.frame === 0 ? 'badguy1' : 'badguy2'];

    // shake offset
    const shakeX = e.shakeTimer > 0 ? (Math.floor(e.shakeTimer / 3) % 2 === 0 ? 2 : -2) : 0;

    let drawX = sx + shakeX;

    if (e.hitFlash > 0 || e.deathFlash > 0) {
      const oc = getOC('enemy_flash', e.w, e.h);
      const oc2d = oc._ctx;
      oc2d.clearRect(0, 0, e.w, e.h);
      oc2d.globalCompositeOperation = 'source-over';
      oc2d.globalAlpha = 1;
      oc2d.imageSmoothingEnabled = false;
      if (e.vx > 0) {
        oc2d.save(); oc2d.scale(-1, 1);
        oc2d.drawImage(spr, -e.w, 0, e.w, e.h);
        oc2d.restore();
      } else {
        oc2d.drawImage(spr, 0, 0, e.w, e.h);
      }
      oc2d.globalCompositeOperation = 'source-atop';
      oc2d.fillStyle = e.deathFlash > 0 ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,' + (e.hitFlash / HIT_FLASH_FRAMES) + ')';
      oc2d.fillRect(0, 0, e.w, e.h);
      oc2d.globalCompositeOperation = 'source-over';
      ctx.drawImage(oc, drawX, sy);
    } else if (e.vx > 0) {
      ctx.scale(-1, 1);
      ctx.drawImage(spr, -(drawX + e.w), sy, e.w, e.h);
    } else {
      ctx.drawImage(spr, drawX, sy, e.w, e.h);
    }

    ctx.restore();

  }
}
