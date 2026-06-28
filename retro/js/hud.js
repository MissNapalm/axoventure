function drawHeart(x, y, filled) {
  ctx.fillStyle = filled ? '#ff4466' : '#441122';
  // pixel heart: 7x6
  const pixels = [
    [1,0],[2,0],[4,0],[5,0],
    [0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
    [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
    [1,3],[2,3],[3,3],[4,3],[5,3],
    [2,4],[3,4],[4,4],
    [3,5],
  ];
  for (const [px, py] of pixels) ctx.fillRect(x + px, y + py, 1, 1);
}

function drawHUD() {
  // controls bar
  ctx.font = PIXEL_FONT_SM;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(4, 4, 300, 12);
  ctx.fillStyle = '#f8b4d9';
  ctx.fillText('S/C move  D/L jump  M run/throw  Tab settings', 6, 13);

  // hearts
  for (let i = 0; i < PLAYER_MAX_HP; i++) {
    drawHeart(6 + i * 10, VIEW_H - 14, i < player.hp);
  }
}
