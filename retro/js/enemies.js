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
  // lower section (on ground at LOWER_Y)
  makeEnemy(2000, 1950, 2090, LOWER_Y),
  makeEnemy(2180, 2120, 2300, LOWER_Y),
  makeEnemy(2450, 2400, 2510, LOWER_Y),
  makeEnemy(2600, 2560, 2660, LOWER_Y),
  makeEnemy(2750, 2700, 2830, LOWER_Y),
  makeEnemy(2950, 2900, 3040, LOWER_Y),
  // lower section floating platform enemies
  makeEnemy(2110, 2100, 2180, 275),
  makeEnemy(2530, 2520, 2610, 250),
  makeEnemy(2810, 2800, 2880, 248),
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
  // lower section red enemies
  makeRedEnemy(2080, 2030, 2160, LOWER_Y),
  makeRedEnemy(2340, 2280, 2420, LOWER_Y),
  makeRedEnemy(2690, 2640, 2770, LOWER_Y),
  makeRedEnemy(2870, 2820, 2960, LOWER_Y),
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
          player.carrying = null;
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
    if (!player.dashing && !player.groundDashing && player.hurtTimer === 0) {
      const ox = Math.min(player.x + player.w, e.x + e.w) - Math.max(player.x, e.x);
      const oy = Math.min(player.y + player.h, e.y + e.h) - Math.max(player.y, e.y);
      if (ox > 0 && oy > 0) hurtPlayer();
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
      if (e.shakeTimer === 0) e.stunTimer = STUN_FRAMES;
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
