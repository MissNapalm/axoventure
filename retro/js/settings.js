const settings = {
  gravity:      { value: 0.32,  min: 0.05, max: 1.0,  step: 0.01, label: 'Gravity' },
  jumpForce:    { value: 6.0,   min: 1.0,  max: 15.0, step: 0.1,  label: 'Jump Height' },
  walkSpeed:    { value: 1.8,   min: 0.5,  max: 6.0,  step: 0.1,  label: 'Walk Speed' },
  runMult:      { value: 1.6,   min: 1.0,  max: 5.0,  step: 0.1,  label: 'Run Multiplier' },
  jumpYOffset:  { value: -2,    min: -30,  max: 30,   step: 1,    label: 'Jump Y Offset' },
  animSpeed:    { value: 7,     min: 1,    max: 20,   step: 1,    label: 'Anim Speed' },
  boltDur:      { value: 101,   min: 0,    max: 120,  step: 1,    label: 'Bolt Duration' },
  flashDur:     { value: 1,     min: 0,    max: 60,   step: 1,    label: 'Flash Duration' },
  flashDelay:   { value: 0,     min: 0,    max: 60,   step: 1,    label: 'Bolt→Flash Delay' },
  lightningFreq:{ value: 350,   min: 100,  max: 1200, step: 50,   label: 'Lightning Freq' },
  carryOffset:  { value: -4,    min: -30,  max: 20,   step: 1,    label: 'Carry Y Offset' },
  carryOffsetL: { value: 0,     min: -40,  max: 40,   step: 1,    label: 'Carry X Left' },
  carryOffsetR: { value: 0,     min: -40,  max: 40,   step: 1,    label: 'Carry X Right' },
  carryJumpY:   { value: 0,     min: -40,  max: 40,   step: 1,    label: 'Carry Jump Y' },
  flippedGndY:  { value: 0,     min: -20,  max: 20,   step: 1,    label: 'Flip Ground Y' },
  dashYOffset:  { value: 0,     min: -30,  max: 30,   step: 1,    label: 'Dash Y Offset' },
  throwStrength:{ value: 11,    min: 1,    max: 20,   step: 0.5,  label: 'Throw Strength' },
  redBounceBack:{ value: 4,     min: 0,    max: 20,   step: 0.5,  label: 'Axo Knockback' },
  redFlipGrav:  { value: 0.35,  min: 0.01, max: 2.0,  step: 0.01, label: 'Red Flip Grav' },
};

// S.gravity instead of settings.gravity.value
const S = new Proxy(settings, { get: (t, k) => t[k].value });
