const sprites = {};
const required = [
  'walk1', 'walk2', 'walk3', 'walk4',
  'jump', 'standing',
  'cap', 'capy2',
  'badguy1', 'badguy2', 'badguy3',
  'redguy1', 'redguy2',
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
