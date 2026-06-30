const sprites = {};
const required = [
  'walk1', 'walk2', 'walk3', 'walk4',
  'jump', 'standing',
  'tile_grassL', 'tile_grassM', 'tile_grassR',
  'tile_dirtL',  'tile_dirtM',  'tile_dirtR',
  'tile_deepL',  'tile_deepM',  'tile_deepR',
  'brownground',
  'cap', 'capy2',
  'cap2', 'cap3', 'cap4', 'cap5', 'cap6', 'cap7', 'cap8', 'cap10',
  'badguy1', 'badguy2', 'badguy3',
  'redguy1', 'redguy2',
  'swim1', 'swim2',
  'shades',
];
let loaded = 0;

for (const name of required) {
  sprites[name] = new Image();
  sprites[name].onload = () => { loaded++; };
  sprites[name].src = name + '.png';
}

function assetsReady() {
  return loaded >= required.length;
}

// ── Sound ─────────────────────────────────────────────────────────────────────
const sounds = {};
const soundFiles = ['bigfishcharge', 'die', 'getorange', 'dialogdone', 'textletterloop', 'groundpound', 'throwkill', 'enemyflipover'];
for (const name of soundFiles) {
  sounds[name] = new Audio(name + '.wav');
  sounds[name].preload = 'auto';
}
sounds['dashandhoming'] = new Audio('dashandhoming.mp3');
sounds['dashandhoming'].preload = 'auto';
sounds['textletterloop'].loop = true;

function playSound(name) {
  const s = sounds[name];
  if (!s) return;
  s.currentTime = 0;
  s.play().catch(() => {});
}

function stopSound(name) {
  const s = sounds[name];
  if (!s) return;
  s.pause();
  s.currentTime = 0;
}
