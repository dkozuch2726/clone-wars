// sprites.js — Art builder for "SLO Flap"
// San Luis Obispo at sunset: warm sky over rolling Central Coast hills,
// palm tree silhouettes as the obstacles, a bold seagull as the bird.
// Only canvas shapes. No images, no fonts, no emoji.

(function () {
  'use strict';

  // ---------- small shared helpers (not exported) ----------

  function drawCloud(ctx, cx, cy, w) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.5, w * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - w * 0.3, cy + w * 0.06, w * 0.32, w * 0.16, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + w * 0.32, cy + w * 0.04, w * 0.3, w * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // A silhouette layer of rolling hills, drawn as one filled shape
  // spanning the full canvas width down to the bottom.
  function drawHillLayer(ctx, width, height, baseY, bumpHeight, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(20, 12, 22, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, baseY);
    const bumps = 4;
    for (let i = 0; i <= bumps; i++) {
      const px = (width / bumps) * i;
      const lift = (i % 2 === 0) ? bumpHeight : bumpHeight * 0.4;
      const py = baseY - lift;
      const cpX = px - width / (bumps * 2);
      ctx.quadraticCurveTo(cpX, baseY - bumpHeight * 0.7, px, py);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // One fan of palm fronds anchored at (cx, cy), spreading sideways and
  // drooping toward `dir` (1 = downward, -1 = upward). Always drawn
  // after the caller has clipped to the pipe rectangle, so nothing can
  // escape into the gap or past the pipe's sides.
  function drawFronds(ctx, cx, cy, pipeWidth, dir) {
    const maxLen = pipeWidth * 0.85;
    const spread = [
      [-0.95, 0.10], [-0.65, 0.40], [-0.28, 0.62],
      [0.28, 0.62], [0.65, 0.40], [0.95, 0.10]
    ];
    const outline = '#16321b';
    const fill = '#33623a';
    const outerWidth = Math.max(2, pipeWidth * 0.16);
    const innerWidth = Math.max(1, outerWidth - 4);

    for (let i = 0; i < spread.length; i++) {
      const fx = spread[i][0];
      const fy = spread[i][1];
      const tipX = cx + fx * maxLen;
      const tipY = cy + dir * fy * maxLen;
      const ctrlX = cx + fx * maxLen * 0.45;
      const ctrlY = cy + dir * maxLen * 0.12;

      ctx.lineCap = 'round';
      ctx.strokeStyle = outline;
      ctx.lineWidth = outerWidth;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      ctx.stroke();

      ctx.strokeStyle = fill;
      ctx.lineWidth = innerWidth;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      ctx.stroke();
    }

    // hub where the fronds meet, plus a couple of coconuts for silhouette detail
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(cx, cy, pipeWidth * 0.14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3a2b1a';
    ctx.beginPath();
    ctx.arc(cx - pipeWidth * 0.08, cy + dir * pipeWidth * 0.14, pipeWidth * 0.07, 0, Math.PI * 2);
    ctx.arc(cx + pipeWidth * 0.07, cy + dir * pipeWidth * 0.16, pipeWidth * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  // Trunk texture notches, stepping from the canopy end (fromY) toward
  // the far end (toY). Stops once past the far end, and the caller's
  // clip guarantees nothing ever draws outside the trunk's rectangle.
  function drawTrunkNotches(ctx, trunkX, trunkWidth, fromY, toY) {
    ctx.strokeStyle = 'rgba(35, 22, 14, 0.6)';
    ctx.lineWidth = 2;
    const dir = toY > fromY ? 1 : -1;
    const dist = Math.abs(toY - fromY);
    for (let i = 0; i < 6; i++) {
      const step = 18 + i * 20;
      if (step >= dist) break;
      const ny = fromY + dir * step;
      ctx.beginPath();
      ctx.moveTo(trunkX, ny);
      ctx.lineTo(trunkX + trunkWidth, ny + dir * 6);
      ctx.stroke();
    }
  }

  // A palm tree that fills exactly the rectangle it is given: trunk
  // reaching from the far edge to the edge nearest the gap, canopy
  // clustered at the near-gap edge. Clipping guarantees nothing escapes
  // the rectangle even at the edges of the math above.
  function drawPalmInRect(ctx, x, rectTop, rectBottom, pipeWidth, canopyAtBottom) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, rectTop, pipeWidth, rectBottom - rectTop);
    ctx.clip();

    const trunkWidth = pipeWidth * 0.26;
    const trunkX = x + (pipeWidth - trunkWidth) / 2;

    ctx.fillStyle = '#5c3a21';
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(trunkX, rectTop, trunkWidth, rectBottom - rectTop);
    ctx.fill();
    ctx.stroke();

    const canopyY = canopyAtBottom ? rectBottom : rectTop;
    const farY = canopyAtBottom ? rectTop : rectBottom;
    drawTrunkNotches(ctx, trunkX, trunkWidth, canopyY, farY);

    drawFronds(ctx, x + pipeWidth / 2, canopyY, pipeWidth, canopyAtBottom ? -1 : 1);

    ctx.restore();
  }

  // ---------- the four required functions ----------

  function drawBackground(ctx, width, height, time) {
    ctx.save();

    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#3b2559');
    sky.addColorStop(0.35, '#7a3b6d');
    sky.addColorStop(0.62, '#e2703a');
    sky.addColorStop(0.85, '#f6a35c');
    sky.addColorStop(1, '#fbd08a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // sun, low on the horizon, with a soft glow that breathes gently
    const sunX = width * 0.64;
    const sunY = height * 0.52;
    const pulse = 1 + Math.sin(time * 0.5) * 0.04;
    const sunR = width * 0.15 * pulse;

    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.3);
    glow.addColorStop(0, 'rgba(255, 214, 140, 0.55)');
    glow.addColorStop(1, 'rgba(255, 214, 140, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 2.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffe4a8';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // a couple of drifting clouds, high and soft
    const drift = Math.sin(time * 0.05) * width * 0.03;
    ctx.fillStyle = 'rgba(255, 205, 180, 0.35)';
    drawCloud(ctx, width * 0.22 + drift, height * 0.2, width * 0.2);
    ctx.fillStyle = 'rgba(255, 220, 200, 0.3)';
    drawCloud(ctx, width * 0.78 - drift, height * 0.13, width * 0.16);

    // rolling Central Coast hills, two silhouette layers
    drawHillLayer(ctx, width, height, height * 0.74, height * 0.05, '#6b4f66');
    drawHillLayer(ctx, width, height, height * 0.82, height * 0.05, '#2e2233');

    ctx.restore();
  }

  function drawGround(ctx, width, height, groundHeight, offset) {
    ctx.save();

    const topY = height - groundHeight;
    const fade = ctx.createLinearGradient(0, topY, 0, height);
    fade.addColorStop(0, '#caa15a');
    fade.addColorStop(1, '#8a6a3a');
    ctx.fillStyle = fade;
    ctx.fillRect(0, topY, width, groundHeight);

    ctx.strokeStyle = '#3a2b1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, topY + 1.5);
    ctx.lineTo(width, topY + 1.5);
    ctx.stroke();

    // scrolling dune / pebble texture along the top of the strip
    ctx.fillStyle = '#7a5a2f';
    const spacing = 28;
    const shift = ((offset % spacing) + spacing) % spacing;
    for (let px = -spacing - shift; px < width + spacing; px += spacing) {
      ctx.beginPath();
      ctx.ellipse(px, topY + 9, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawBird(ctx, x, y, size, velocity) {
    ctx.save();
    ctx.translate(x, y);

    const s = size;
    const tilt = Math.max(-0.4, Math.min(1.0, velocity / 500));
    ctx.rotate(tilt);

    // -1 = wing raised (climbing), 1 = wing lowered (falling)
    const wingLift = Math.max(-1, Math.min(1, velocity / 400));

    ctx.strokeStyle = '#26282b';
    ctx.lineWidth = 2;

    // tail
    ctx.fillStyle = '#e7e7e4';
    ctx.beginPath();
    ctx.moveTo(-s * 0.28, -s * 0.06);
    ctx.lineTo(-s * 0.48, -s * 0.02 - wingLift * s * 0.05);
    ctx.lineTo(-s * 0.28, s * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // body
    ctx.fillStyle = '#f5f5f2';
    ctx.beginPath();
    ctx.ellipse(-0.02 * s, 0.02 * s, s * 0.30, s * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // wing, tilts up when climbing and down when falling
    const wingBaseX = -0.02 * s;
    const wingBaseY = -0.04 * s;
    const wingTipX = 0.14 * s;
    const wingTipY = wingBaseY - wingLift * s * 0.30 - s * 0.06;
    ctx.fillStyle = '#d6d8db';
    ctx.beginPath();
    ctx.moveTo(wingBaseX, wingBaseY);
    ctx.quadraticCurveTo(0.10 * s, wingTipY, wingTipX, wingTipY + s * 0.10);
    ctx.quadraticCurveTo(0.02 * s, 0.04 * s, wingBaseX, wingBaseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // head
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0.28 * s, -0.10 * s, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // eye
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(0.34 * s, -0.13 * s, s * 0.035, 0, Math.PI * 2);
    ctx.fill();

    // beak
    ctx.fillStyle = '#f2971f';
    ctx.strokeStyle = '#8a4d0a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0.40 * s, -0.09 * s);
    ctx.lineTo(0.46 * s, -0.03 * s);
    ctx.lineTo(0.40 * s, 0.02 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function drawPipe(ctx, x, gapTop, gapBottom, pipeWidth, height) {
    ctx.save();

    // top obstacle: y = 0 to gapTop, canopy hangs near the gap
    drawPalmInRect(ctx, x, 0, gapTop, pipeWidth, true);

    // bottom obstacle: y = gapBottom to height (top of ground), canopy
    // sits at the top of the trunk, near the gap
    drawPalmInRect(ctx, x, gapBottom, height, pipeWidth, false);

    ctx.restore();
  }

  window.SPRITES = {
    drawBackground: drawBackground,
    drawGround: drawGround,
    drawBird: drawBird,
    drawPipe: drawPipe
  };
})();
