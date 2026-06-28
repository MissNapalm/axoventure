const PLAYER_START = { x: -100, y: 170 };

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
  airDashUsed: false,
  knockbackTimer: 0,
  homingWindup: 0,
  homingWindupTarget: null,
  shockwaves: [],
  sparks: [],
  impactFlash: 0,
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
  player.carrying = null;
  player.groundDashing = false; player.groundDashTimer = 0; player.airDashUsed = false; player.knockbackTimer = 0;
  cameraX = 0;
  cameraY = 0;
  hitFreezeTimer = 0;
  screenShakeTimer = 0;
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
  if (player.hurtTimer > 0) return; // invincible
  player.hp--;
  player.hurtTimer = HURT_FRAMES;
  player.dashing = false; player.dashTarget = null;
  if (player.hp <= 0) resetLevel();
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

  // wave 1 — fast pixel chunks flying outward (white/yellow)
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const speed = 5 + Math.random() * 5;
    const size  = Math.random() < 0.5 ? 3 : 2;
    player.sparks.push({
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 10 + Math.floor(Math.random() * 6), maxLife: 16,
      color: Math.random() < 0.6 ? '#ffffff' : '#ffff80',
      size, kind: 'box', gravity: 0.18,
    });
  }

  // wave 2 — slower cyan debris
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const speed = 2 + Math.random() * 3;
    player.sparks.push({
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
      life: 14 + Math.floor(Math.random() * 8), maxLife: 22,
      color: Math.random() < 0.5 ? '#80e0ff' : '#c0ffff',
      size: 2, kind: 'box', gravity: 0.1,
    });
  }

  // wave 3 — thin fast streaks (classic 16-bit star burst)
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const speed = 7 + Math.random() * 4;
    player.sparks.push({
      x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 7 + Math.floor(Math.random() * 4), maxLife: 11,
      color: '#ffffff', size: 1.5, kind: 'line', gravity: 0,
    });
  }
}

function updatePlayer() {
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
          player.groundDashing = true;
          player.groundDashTimer = GROUND_DASH_FRAMES;
          player.vx = player.facingLeft ? -GROUND_DASH_SPEED : GROUND_DASH_SPEED;
          player.vy = 0;
          if (!player.onGround) player.airDashUsed = true;
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
    player.vx = 0;
    player.moving = false;
    if (!player.onGround) { player.vy += S.gravity; player.y += player.vy; resolveCollisions(); }
    else { player.vy = 0; }
    return;
  }

  const left  = keys['KeyS'];
  const right = keys['KeyC'];
  const run   = keys['KeyM'];
  const speed = run ? S.walkSpeed * S.runMult : S.walkSpeed;

  if (player.knockbackTimer > 0) player.knockbackTimer--;

  player.moving = false;
  if (!player.groundDashing && player.knockbackTimer === 0) {
    if (left)       { player.vx = -speed; player.facingLeft = true;  player.moving = true; }
    else if (right) { player.vx =  speed; player.facingLeft = false; player.moving = true; }
    else            { player.vx *= 0.7; }
  }

  const jumpPressed = consumeKey('KeyD') || consumeKey('KeyL');
  if (jumpPressed && player.onGround) { player.vy = -S.jumpForce; player.onGround = false; }

  if (player.hurtTimer > 0) player.hurtTimer--;

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

  // Homing attack: one per jump, triggered by fresh jump press while airborne
  if (!player.onGround && !player.dashing && !player.homingUsed && player.homingWindup === 0 && jumpPressed && !player.wasOnGround) {
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;
    let best = null, bestDist = HOMING_RANGE;
    for (const e of [...enemies, ...redEnemies]) {
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
  // fade trail
  for (const t of player.trail) t.life--;
  player.trail = player.trail.filter(t => t.life > 0);

  if (!player.dashing && !player.groundDashing && player.homingWindup === 0) player.vy += S.gravity;
  player.x += player.vx;
  player.y += player.vy;

  // check hit BEFORE collision so platform snap can't steal the contact
  if (player.dashing && player.dashTarget) {
    const e = player.dashTarget;
    const inset = 10;
    const px1 = player.x + inset, px2 = player.x + player.w - inset;
    const py1 = player.y + inset, py2 = player.y + player.h - inset;
    const ex1 = e.x + inset,      ex2 = e.x + e.w - inset;
    const ey1 = (e._y ? e._y : e.y) + inset;
    const ey2 = ey1 + e.h - inset * 2;
    const ox = Math.min(px2, ex2) - Math.max(px1, ex1);
    const oy = Math.min(py2, ey2) - Math.max(py1, ey1);
    if (ox > 0 && oy > 0) {
      player.dashing = false; player.dashTarget = null;
      const impactX = e.x + e.w / 2;
      const impactY = (e._y ? e._y : e.y) + e.h / 2;
      if (e.red) {
        flipRedEnemy(e);
        player.vx = player.x + player.w / 2 < e.x + e.w / 2 ? -S.redBounceBack : S.redBounceBack;
        player.knockbackTimer = 12;
        hitFreezeTimer = HIT_FREEZE_FRAMES;
        screenShakeTimer = SCREEN_SHAKE_FRAMES;
        spawnImpactVFX(impactX, impactY);
      } else if (e.stunTimer > 0) {
        hurtPlayer();
      } else {
        player.vx = player.x + player.w / 2 < e.x + e.w / 2 ? -8 : 8;
        player.vy = -4;
        hitEnemy(e);
        hitFreezeTimer = HIT_FREEZE_FRAMES;
        screenShakeTimer = SCREEN_SHAKE_FRAMES;
        spawnImpactVFX(impactX, impactY);
      }
    }
  }

  // Ground dash hit detection — same effect as homing hit
  if (player.groundDashing && player.hurtTimer === 0) {
    const inset = 6;
    const px1 = player.x + inset, px2 = player.x + player.w - inset;
    const py1 = player.y + inset, py2 = player.y + player.h - inset;
    for (const e of [...enemies, ...redEnemies]) {
      if (e.dead || e.flipped || e.carried) continue;
      const ex1 = e.x + inset, ex2 = e.x + e.w - inset;
      const ey1 = (e._y ? e._y : e.y) + inset;
      const ey2 = ey1 + e.h - inset * 2;
      if (Math.min(px2, ex2) - Math.max(px1, ex1) > 0 && Math.min(py2, ey2) - Math.max(py1, ey1) > 0) {
        player.groundDashing = false;
        if (e.red) {
          flipRedEnemy(e);
          player.vx = player.x + player.w / 2 < e.x + e.w / 2 ? -S.redBounceBack : S.redBounceBack;
          player.knockbackTimer = 12;
        hitFreezeTimer = HIT_FREEZE_FRAMES;
        screenShakeTimer = SCREEN_SHAKE_FRAMES;
        } else if (e.stunTimer > 0) {
          hurtPlayer();
        } else {
          player.vx = player.x + player.w / 2 < e.x + e.w / 2 ? -8 : 8;
          player.vy = -4;
          hitEnemy(e);
          hitFreezeTimer = HIT_FREEZE_FRAMES;
          screenShakeTimer = SCREEN_SHAKE_FRAMES;
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

  if (player.moving && player.onGround) {
    player.frameTimer++;
    if (player.frameTimer >= S.animSpeed) { player.frameTimer = 0; player.frame = (player.frame + 1) % WALK_SEQ.length; }
  } else {
    player.frame = 0; player.frameTimer = 0;
  }
}

function drawPlayer() {
  if (!assetsReady()) return;
  const px     = Math.round(player.x - cameraX);
  const bottom = Math.round(player.y + player.h - cameraY);

  // draw trail — thick+bright at head (newest), thin+faded at tail (oldest)
  if (player.trail.length > 1) {
    const n = player.trail.length;
    for (let i = 1; i < n; i++) {
      const a = player.trail[i - 1];
      const b = player.trail[i];
      const t = i / (n - 1); // 0=oldest end, 1=newest end
      ctx.save();
      ctx.globalAlpha = t * 0.85;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = t * 18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x - cameraX, a.y - cameraY);
      ctx.lineTo(b.x - cameraX, b.y - cameraY);
      ctx.stroke();
      ctx.restore();
    }
  }

  const standingSpr = sprites['standing'].naturalWidth ? sprites['standing'] : sprites['walk1'];
  let sprite;
  if (player.dashing) {
    sprite = sprites['walk2'];
    if (player.dashTarget) {
      player.facingLeft = player.dashTarget.x + player.dashTarget.w / 2 < player.x + player.w / 2;
    }
  } else if (player.groundDashing) {
    sprite = sprites['walk2'];
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
  const yOffset = (!player.onGround ? S.jumpYOffset : 0) + (player.groundDashing ? S.dashYOffset : 0) + dashJitter;
  const py = bottom - sh + yOffset;

  // flicker during invincibility
  if (player.hurtTimer > 0 && Math.floor(player.hurtTimer / 4) % 2 === 0) return;

  // build tinted sprite on offscreen canvas
  let drawSpr = sprite;
  if (player.dashing || player.groundDashing || player.homingWindup > 0 || player.hurtTimer > 0) {
    const oc = document.createElement('canvas');
    oc.width = sw; oc.height = sh;
    const oc2d = oc.getContext('2d');
    oc2d.imageSmoothingEnabled = false;
    oc2d.drawImage(sprite, 0, 0, sw, sh);
    oc2d.globalCompositeOperation = 'source-atop';
    oc2d.fillStyle = (player.hurtTimer > 0 && !player.dashing && !player.homingWindup) ? 'rgba(255,0,0,0.55)' : 'rgba(255,255,255,0.9)';
    oc2d.fillRect(0, 0, sw, sh);
    drawSpr = oc;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (player.dashing && player.dashTarget) {
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

  // hover ring: pulses while locked on pre-launch
  if (player.homingWindup > 0 && S.homingHover > 0) {
    const t = 1 - player.homingWindup / S.homingHover;
    const wcx = Math.round(player.x + player.w / 2 - cameraX);
    const wcy = Math.round(player.y + player.h / 2 - cameraY);
    ctx.save();
    ctx.globalAlpha = 0.9 - t * 0.5;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wcx, wcy, 6 + t * 14, 0, Math.PI * 2);
    ctx.stroke();
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

  // full-screen white flash + bloom on impact
  if (player.impactFlash > 0) {
    player.impactFlash--;
    const ft = player.impactFlash / 10;
    ctx.save();
    // hard white core flash
    ctx.globalAlpha = ft * ft * 0.85;
    ctx.fillStyle = '#ffffff';
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
}
