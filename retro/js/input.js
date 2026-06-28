const keys = {};
const keysConsumed = {};

window.addEventListener('keydown', e => {
  if (e.code === 'Tab') { e.preventDefault(); settingsOpen = !settingsOpen; return; }
  if (!keys[e.code]) keysConsumed[e.code] = false;
  keys[e.code] = true;
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
