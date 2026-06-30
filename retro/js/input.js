const keys = {};
const keysConsumed = {};
const keysLastHeld = {}; // timestamp of last keydown for each key

let gameboyMode = false;
window.addEventListener('keydown', e => {
  if (e.code === 'Tab') { e.preventDefault(); settingsOpen = !settingsOpen; return; }
  if (e.code === 'KeyR') {
    gameboyMode = !gameboyMode;
    const wrap = document.getElementById('game-wrap');
    wrap.style.filter = gameboyMode
      ? 'grayscale(1) contrast(1.2) brightness(1.0)'
      : '';
    return;
  }
  if (!keys[e.code]) keysConsumed[e.code] = false;
  keys[e.code] = true;
  keysLastHeld[e.code] = performance.now();
  if (e.code === 'KeyM') e.preventDefault();
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
  keysConsumed[e.code] = false;
});

function consumeKey(code) {
  if (keys[code] && !keysConsumed[code]) {
    keysConsumed[code] = true;
    return true;
  }
  return false;
}

// true if key is currently held OR was held within the last ms milliseconds
function keyRecent(code, ms) {
  return keys[code] || (keysLastHeld[code] && performance.now() - keysLastHeld[code] < ms);
}
