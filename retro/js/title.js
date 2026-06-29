// ── Title / Intro state machine ───────────────────────────────────────────────
// phases: 'title' → 'instructions' → (game starts)

let titleActive = true;
let titlePhase  = 'title'; // 'title' | 'instructions'

// ── Shared star field ─────────────────────────────────────────────────────────
const titleStars = [];
for (let i = 0; i < 120; i++) {
  titleStars.push({
    x:      Math.random() * VIEW_W,
    y:      Math.random() * VIEW_H,
    size:   Math.random() < 0.15 ? 2 : 1,
    phase:  Math.random() * Math.PI * 2,
    speed:  0.3 + Math.random() * 1.2,
  });
}

// ── Title screen state ────────────────────────────────────────────────────────
let _tTimer   = 0;
let _tStep    = 0;   // 0=black  1=copyright  2=logo  3=pressstart
let _tAlpha   = 0;
let _logoAlpha = 0;
// shooting stars
const _shoots = [];
let   _shootCooldown = 0;
// axolotl silhouette pixels (16×8, drawn big)
const _axoPx = [
  '  XXXXX    XX   ',
  ' XXXXXXX  XXXX  ',
  'XXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXX',
  ' XXXXXXXXXXXXXXX ',
  '  XXXXXXXXXXX   ',
  '   XXXXXXXX     ',
];

function _spawnShoot() {
  const side = Math.random() < 0.5;
  _shoots.push({
    x:    side ? -4 : VIEW_W + 4,
    y:    10 + Math.random() * (VIEW_H * 0.55),
    vx:   side ? (4 + Math.random() * 4) : -(4 + Math.random() * 4),
    vy:   0.3 + Math.random() * 0.8,
    life: 60,
    maxLife: 60,
    len:  12 + Math.floor(Math.random() * 16),
  });
}

function updateTitle() {
  _tTimer++;
  _shootCooldown--;

  // phase transitions
  if (_tStep === 0 && _tTimer > 30)  { _tStep = 1; _tTimer = 0; }
  if (_tStep === 1 && _tTimer > 70)  { _tStep = 2; _tTimer = 0; }
  if (_tStep === 2 && _tTimer > 80)  { _tStep = 3; _tTimer = 0; }

  _tAlpha   = _tStep >= 1 ? Math.min(1, (_tStep === 1 ? _tTimer / 50 : 1)) : 0;
  _logoAlpha = _tStep >= 2 ? Math.min(1, _tTimer / 55) : 0;

  // shooting stars
  if (_shootCooldown <= 0 && _tStep >= 2) {
    _spawnShoot();
    _shootCooldown = 180 + Math.floor(Math.random() * 240);
  }
  for (let i = _shoots.length - 1; i >= 0; i--) {
    const s = _shoots[i];
    s.x += s.vx; s.y += s.vy; s.life--;
    if (s.life <= 0) _shoots.splice(i, 1);
  }

  const anyKey = keys['KeyM'] || keys['Space'] || keys['Enter'] || keys['KeyD'] || keys['KeyL'];
  if (anyKey) { titleActive = false; }
}

function _drawStars() {
  for (const s of titleStars) {
    const tw = 0.45 + 0.55 * Math.sin(frameNow / 700 * s.speed + s.phase);
    ctx.globalAlpha = tw * (s.size === 2 ? 0.9 : 0.55);
    ctx.fillStyle = s.size === 2 ? '#cce8ff' : '#ffffff';
    ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function _drawNebula() {
  // subtle colour washes
  const g1 = ctx.createRadialGradient(90, 80, 0, 90, 80, 130);
  g1.addColorStop(0, 'rgba(60,0,120,0.18)');
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const g2 = ctx.createRadialGradient(360, 180, 0, 360, 180, 110);
  g2.addColorStop(0, 'rgba(0,40,100,0.15)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawTitle() {
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#00000e';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  _drawNebula();
  _drawStars();

  // shooting stars
  for (const s of _shoots) {
    const a = s.life / s.maxLife;
    ctx.globalAlpha = a * 0.9;
    ctx.strokeStyle = '#cce8ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(s.x), Math.round(s.y));
    ctx.lineTo(Math.round(s.x - s.vx * (s.len / 4)), Math.round(s.y - s.vy * (s.len / 4)));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (_tStep < 1) return;

  // ── copyright bar ───────────────────────────────────────────────────────
  ctx.globalAlpha = _tAlpha;

  ctx.fillStyle = 'rgba(20,10,40,0.7)';
  ctx.fillRect(0, VIEW_H - 52, VIEW_W, 52);
  ctx.fillStyle = '#3a2260';
  ctx.fillRect(0, VIEW_H - 53, VIEW_W, 1);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '6px "Press Start 2P"';
  ctx.fillStyle = '#6655aa';
  ctx.fillText('© 1991  SUPER NINTENDO ENTERTAINMENT SYSTEM', VIEW_W / 2, VIEW_H - 36);
  ctx.fillStyle = '#44336688';
  ctx.fillRect(60, VIEW_H - 26, VIEW_W - 120, 1);
  ctx.fillStyle = '#554488';
  ctx.fillText('LICENSED BY NINTENDO OF AMERICA INC.', VIEW_W / 2, VIEW_H - 18);

  if (_tStep < 2) { ctx.globalAlpha = 1; return; }

  // ── title logo ──────────────────────────────────────────────────────────
  ctx.globalAlpha = _logoAlpha;

  // drop shadow
  ctx.shadowColor = '#220033';
  ctx.shadowBlur = 0;
  ctx.font = '16px "Press Start 2P"';
  ctx.fillStyle = '#220033';
  ctx.fillText("AXO'S TALE", VIEW_W / 2 + 2, 96);

  // main title gradient simulation — two passes
  ctx.shadowColor = '#bb44ff';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#ffffff';
  ctx.fillText("AXO'S TALE", VIEW_W / 2, 94);

  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ddb8ff';
  ctx.fillText("AXO'S TALE", VIEW_W / 2, 94);

  // subtitle
  ctx.shadowColor = '#7722cc';
  ctx.shadowBlur = 10;
  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = '#cc88ff';
  ctx.fillText('FULL THROTTLE AXOLOTL', VIEW_W / 2, 118);
  ctx.shadowBlur = 0;

  // decorative diamond separators
  const _dmx = VIEW_W / 2;
  ctx.fillStyle = '#6633aa';
  for (const ox of [-105, 105]) {
    ctx.fillRect(_dmx + ox - 1, 118, 3, 1);
    ctx.fillRect(_dmx + ox,     117, 1, 3);
  }

  // horizontal rule under subtitle
  const ruleGrad = ctx.createLinearGradient(60, 0, VIEW_W - 60, 0);
  ruleGrad.addColorStop(0,   'rgba(80,40,140,0)');
  ruleGrad.addColorStop(0.3, 'rgba(120,60,200,0.8)');
  ruleGrad.addColorStop(0.7, 'rgba(120,60,200,0.8)');
  ruleGrad.addColorStop(1,   'rgba(80,40,140,0)');
  ctx.fillStyle = ruleGrad;
  ctx.fillRect(60, 128, VIEW_W - 120, 1);

  // ── press start ─────────────────────────────────────────────────────────
  if (_tStep >= 3) {
    const blink = Math.floor(frameNow / 480) % 2 === 0;
    ctx.globalAlpha = _logoAlpha * (blink ? 1.0 : 0.15);
    ctx.shadowColor = '#aaccff';
    ctx.shadowBlur = blink ? 8 : 0;
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = '#aaddff';
    ctx.fillText('- PRESS START -', VIEW_W / 2, 158);
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ── Instructions screen ───────────────────────────────────────────────────────
let _instrTimer = 0;
let _instrAlpha = 0;
let _instrPage  = 0; // 0 = controls, 1 = combat

function updateInstructions() {
  _instrTimer++;
  _instrAlpha = Math.min(1, _instrTimer / 30);

  const anyKey = consumeKey('KeyM') || consumeKey('KeyD') || consumeKey('KeyL') || consumeKey('Space') || consumeKey('Enter');
  if (_instrAlpha >= 1 && anyKey) {
    if (_instrPage === 0) {
      _instrPage = 1;
      _instrTimer = 0;
      _instrAlpha = 0;
    } else {
      titleActive = false;
    }
  }
}

function _panel() {
  ctx.fillStyle = 'rgba(6,2,20,0.92)';
  ctx.fillRect(20, 16, VIEW_W - 40, VIEW_H - 32);
  ctx.strokeStyle = '#7744cc';
  ctx.lineWidth = 2;
  ctx.strokeRect(21, 17, VIEW_W - 42, VIEW_H - 34);
}

function _header(text) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '8px "Press Start 2P"';
  ctx.shadowColor = '#aa44ff';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#dd99ff';
  ctx.fillText(text, VIEW_W / 2, 34);
  ctx.shadowBlur = 0;
  // rule
  const dg = ctx.createLinearGradient(40, 0, VIEW_W - 40, 0);
  dg.addColorStop(0, 'rgba(100,50,180,0)');
  dg.addColorStop(0.5, 'rgba(160,90,255,0.8)');
  dg.addColorStop(1, 'rgba(100,50,180,0)');
  ctx.fillStyle = dg;
  ctx.fillRect(40, 44, VIEW_W - 80, 1);
}

function _row(key, desc, y, kCol, dCol) {
  ctx.font = '8px "Press Start 2P"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = kCol || '#99aadd';
  ctx.fillText(key, 36, y);
  ctx.fillStyle = dCol || '#eeeeff';
  ctx.fillText(desc, 180, y);
}

function _rule(y) {
  ctx.fillStyle = 'rgba(80,50,140,0.4)';
  ctx.fillRect(36, y, VIEW_W - 72, 1);
}

function drawInstructions() {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#00000e';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  _drawNebula();
  _drawStars();

  ctx.globalAlpha = _instrAlpha;
  _panel();

  if (_instrPage === 0) {
    _header('CONTROLS');

    // section label
    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = '#ffdd55';
    ctx.textAlign = 'left';
    ctx.fillText('MOVE', 36, 60);
    _row('S  /  C',    'LEFT  /  RIGHT', 60);
    _row('D',          'JUMP',           78);
    _row('M  (hold)',  'RUN',            96);

    _rule(108);

    ctx.fillStyle = '#ffdd55';
    ctx.fillText('COMBAT', 36, 122);
    _row('L  (in air)', 'HOMING ATTACK', 122);
    _row('M  (in air)', 'DASH',          140);

    _rule(152);

    ctx.fillStyle = '#55ccff';
    ctx.fillText('UNDERWATER', 36, 166);
    _row('S/C/D/X',    'SWIM ANY DIR',  166);
    _row('M',          'SWIM DASH',     184);
    _row('L',          'HOMING',        202);
    _row('DIVE IN',    'KILLS NEARBY',  220, '#ff9999', '#ff6666');
    _row('',           'RED ENEMIES',   234, '#ff9999', '#ff6666');

  } else {
    _header('ONE-TWO ATTACK');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '8px "Press Start 2P"';
    ctx.fillStyle = '#ffaa44';
    ctx.fillText('STEP 1', VIEW_W / 2, 66);
    ctx.fillStyle = '#eeeeff';
    ctx.fillText('DASH into an enemy', VIEW_W / 2, 86);
    ctx.fillText('with  M  (in air)', VIEW_W / 2, 104);

    _rule(118);

    ctx.fillStyle = '#ffaa44';
    ctx.fillText('STEP 2', VIEW_W / 2, 132);
    ctx.fillStyle = '#eeeeff';
    ctx.fillText('IMMEDIATELY press L', VIEW_W / 2, 152);
    ctx.fillText('for a HOMING followup', VIEW_W / 2, 170);

    _rule(184);

    ctx.fillStyle = '#ff4466';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 8;
    ctx.fillText('ONE-TWO COMBO!', VIEW_W / 2, 204);
    ctx.shadowBlur = 0;
    ctx.font = '6px "Press Start 2P"';
    ctx.fillStyle = '#ccbbff';
    ctx.fillText('Chain hits for a fury meter boost', VIEW_W / 2, 222);
    ctx.fillText('and massive combo scores!', VIEW_W / 2, 234);
  }

  // page indicator dots
  ctx.textAlign = 'center';
  for (let i = 0; i < 2; i++) {
    ctx.globalAlpha = _instrAlpha * (i === _instrPage ? 1 : 0.3);
    ctx.fillStyle = '#aa77ff';
    ctx.fillRect(VIEW_W / 2 - 6 + i * 10, VIEW_H - 26, 4, 4);
  }

  // press start
  const blink = Math.floor(frameNow / 500) % 2 === 0;
  ctx.globalAlpha = _instrAlpha * (blink ? 0.9 : 0.15);
  ctx.font = '8px "Press Start 2P"';
  ctx.fillStyle = '#aaddff';
  ctx.fillText(_instrPage === 0 ? 'NEXT  >' : 'START GAME', VIEW_W / 2, VIEW_H - 14);

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ── Public hooks (called from main.js) ───────────────────────────────────────
function updateTitleScreen() {
  updateTitle();
}

function drawTitleScreen() {
  drawTitle();
}
