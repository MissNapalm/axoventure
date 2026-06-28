const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

const SCALE   = 3;
const VIEW_W  = 480;
const VIEW_H  = 270;
const GROUND_Y = 210;

const PIXEL_FONT    = '8px "Press Start 2P"';
const PIXEL_FONT_SM = '8px "Press Start 2P"';

const TALK_DISTANCE    = 60;
const HOMING_RANGE     = 120;
const HOMING_SPEED     = 12;
const STUN_FRAMES      = 130;
const HIT_FLASH_FRAMES = 20;
const PLAYER_MAX_HP    = 3;
const HURT_FRAMES      = 120; // 2 seconds invincibility after hit
const GROUND_DASH_SPEED  = 7;
const GROUND_DASH_FRAMES = 14;
const HIT_FREEZE_FRAMES  = 5;
const SCREEN_SHAKE_FRAMES = 10;
const SCREEN_SHAKE_MAG    = 3;
