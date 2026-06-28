// Pre-allocated offscreen canvases for tinting — avoids per-frame allocation GC spikes
const _oc = {};

function getOC(key, w, h) {
  if (!_oc[key]) {
    _oc[key] = document.createElement('canvas');
    _oc[key]._ctx = _oc[key].getContext('2d');
    _oc[key]._ctx.imageSmoothingEnabled = false;
  }
  const c = _oc[key];
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
}

function tintSprite(spr, color) {
  const w = spr.naturalWidth, h = spr.naturalHeight;
  const oc = getOC('tint_shared', w, h);
  const c = oc._ctx;
  c.clearRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.imageSmoothingEnabled = false;
  c.drawImage(spr, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = color;
  c.fillRect(0, 0, w, h);
  return oc;
}
