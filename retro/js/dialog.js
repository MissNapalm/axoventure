const dialog = {
  active: false,
  npc: null,
  page: 0,
  chars: 0,
  charTimer: 0,
  CHAR_INTERVAL: 2,
  _cachedPage: -1,
  _cachedLines: [],
  _cachedBoxW: 0,
  get fullText() { return this.npc ? this.npc.lines[this.page].replace(/\n/g, ' ') : ''; },
  get done()     { return this.chars >= this.fullText.length; },
};

function _rebuildDialogCache() {
  const PAD = 10;
  const MAX_TEXT_W = VIEW_W - 16 - PAD * 2 - 12;
  ctx.font = PIXEL_FONT;
  const rawLines = dialog.npc.lines[dialog.page].split('\n');
  const wrapped = [];
  for (const raw of rawLines) for (const wl of wrapText(raw, MAX_TEXT_W)) wrapped.push(wl);
  const nameW = ctx.measureText(dialog.npc.name).width;
  const maxLineW = wrapped.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
  dialog._cachedLines = wrapped;
  dialog._cachedBoxW = Math.ceil(Math.max(nameW, maxLineW)) + PAD * 2 + 8;
  dialog._cachedPage = dialog.page;
}

function openDialog(npc) {
  dialog.active = true;
  dialog.npc = npc;
  dialog.page = 0;
  dialog.chars = 0;
  dialog.charTimer = 0;
  dialog._cachedPage = -1;
}

function advanceDialog() {
  dialog.page++;
  if (dialog.page >= dialog.npc.lines.length) {
    const closedNpc = dialog.npc;
    dialog.active = false;
    dialog.npc = null;
    if (typeof onDialogClose === 'function') onDialogClose(closedNpc);
  } else {
    dialog.chars = 0;
    dialog.charTimer = 0;
    dialog._cachedPage = -1;
  }
}

function tickDialog() {
  if (!dialog.active || dialog.done) return;
  dialog.charTimer++;
  if (dialog.charTimer >= dialog.CHAR_INTERVAL) {
    dialog.charTimer = 0;
    dialog.chars++;
  }
}

// Word-wrap a single string to fit within maxPx pixels, returns array of lines
function wrapText(text, maxPx) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width <= maxPx) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function drawDialog() {
  if (!dialog.active) return;

  const PAD = 10;
  const lineH = 14;
  const nameH = 8;
  const dividerGap = 6;
  const textGap = 9;
  const MAX_TEXT_W = VIEW_W - 16 - PAD * 2 - 12;

  const npc = dialog.npc;
  ctx.font = PIXEL_FONT;
  ctx.textBaseline = 'top';

  // rebuild cache only when page changes
  if (dialog._cachedPage !== dialog.page) _rebuildDialogCache();
  const wrappedLines = dialog._cachedLines;
  const BOX_W = dialog._cachedBoxW;
  const BOX_X = Math.round((VIEW_W - BOX_W) / 2);
  const BOX_Y = 68;
  const BOX_H = PAD + nameH + dividerGap + wrappedLines.length * lineH + PAD;

  ctx.fillStyle = 'rgba(8,3,24,0.92)';
  ctx.fillRect(BOX_X, BOX_Y, BOX_W, BOX_H);

  ctx.strokeStyle = '#7a50cc'; ctx.lineWidth = 2;
  ctx.strokeRect(BOX_X + 1, BOX_Y + 1, BOX_W - 2, BOX_H - 2);
  ctx.strokeStyle = '#4a2888'; ctx.lineWidth = 1;
  ctx.strokeRect(BOX_X + 3, BOX_Y + 3, BOX_W - 6, BOX_H - 6);

  ctx.fillStyle = '#c9a0ff';
  ctx.fillText(npc.name, BOX_X + PAD, BOX_Y + PAD);

  const dividerY = BOX_Y + PAD + nameH + 5;
  ctx.fillStyle = '#4a2888';
  ctx.fillRect(BOX_X + PAD, dividerY, BOX_W - PAD * 2, 1);

  ctx.fillStyle = '#f0e6ff';
  const textStartY = dividerY + textGap;
  let charsLeft = dialog.chars;
  wrappedLines.forEach((line, i) => {
    const visible = line.slice(0, charsLeft);
    if (visible.length > 0) ctx.fillText(visible, BOX_X + PAD, textStartY + i * lineH);
    charsLeft = Math.max(0, charsLeft - line.length);
  });

  if (dialog.done && Math.floor(frameNow / 400) % 2 === 0) {
    ctx.fillStyle = '#b07aff';
    ctx.textBaseline = 'bottom';
    ctx.fillText('▼', BOX_X + BOX_W - PAD, BOX_Y + BOX_H - 3);
  }

  ctx.textBaseline = 'alphabetic';
}
