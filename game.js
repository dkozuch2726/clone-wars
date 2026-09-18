window.CLONE_WARS_GAME = true;

const DEFAULTS = {
  title: 'Flap Clone',
  fix: 'none',
  canvasWidth: 360,
  canvasHeight: 640,
  gravity: 1400,
  flapStrength: 420,
  birdSize: 34,
  pipeWidth: 64,
  pipeGap: 150,
  pipeSpacing: 260,
  pipeSpeed: 150,
  groundHeight: 80,
  modes: {
    easy: { pipeGap: 190, pipeSpeed: 110 },
    normal: { pipeGap: 150, pipeSpeed: 150 }
  }
};

const CONFIG = Object.assign({}, DEFAULTS, window.GAME_CONFIG || {});

// ---------- Missing parts (so the game plays even before the other files exist) ----------

const ART_NAMES = ['drawBackground', 'drawGround', 'drawBird', 'drawPipe'];
const SOUND_NAMES = ['flap', 'score', 'crash'];
const missing = [];
if (!window.GAME_CONFIG) missing.push('settings');
else for (const key of Object.keys(DEFAULTS)) { if (!(key in window.GAME_CONFIG)) missing.push(key); }
if (!window.SPRITES) missing.push('art');
else for (const name of ART_NAMES) { if (typeof window.SPRITES[name] !== 'function') missing.push(name); }
if (!window.SOUNDS) missing.push('sound');
else for (const name of SOUND_NAMES) { if (typeof window.SOUNDS[name] !== 'function') missing.push(name); }
document.getElementById('missing-label').textContent = missing.length ? 'placeholder: ' + missing.join(', ') + ' missing' : '';

// Plain colored-rectangle stand-ins for the art, so the game is playable before Art's file exists.
function placeholderBackground(ctx, width, height, time) {
  ctx.save();
  ctx.fillStyle = '#284b78';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function placeholderGround(ctx, width, height, groundHeight, offset) {
  ctx.save();
  ctx.fillStyle = '#5b4632';
  ctx.fillRect(0, height - groundHeight, width, groundHeight);
  ctx.restore();
}

function placeholderBird(ctx, x, y, size, velocity) {
  ctx.save();
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = '#101826';
  ctx.lineWidth = 2;
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

function placeholderPipe(ctx, x, gapTop, gapBottom, pipeWidth, height) {
  ctx.save();
  ctx.fillStyle = '#3a9d5d';
  ctx.strokeStyle = '#101826';
  ctx.lineWidth = 2;
  ctx.fillRect(x, 0, pipeWidth, gapTop);
  ctx.strokeRect(x, 0, pipeWidth, gapTop);
  ctx.fillRect(x, gapBottom, pipeWidth, height - gapBottom);
  ctx.strokeRect(x, gapBottom, pipeWidth, height - gapBottom);
  ctx.restore();
}

const drawBackground = (window.SPRITES && typeof window.SPRITES.drawBackground === 'function') ? window.SPRITES.drawBackground : placeholderBackground;
const drawGround = (window.SPRITES && typeof window.SPRITES.drawGround === 'function') ? window.SPRITES.drawGround : placeholderGround;
const drawBird = (window.SPRITES && typeof window.SPRITES.drawBird === 'function') ? window.SPRITES.drawBird : placeholderBird;
const drawPipe = (window.SPRITES && typeof window.SPRITES.drawPipe === 'function') ? window.SPRITES.drawPipe : placeholderPipe;

let muted = false;
function play(name) {
  if (muted) return;
  const sound = window.SOUNDS && window.SOUNDS[name];
  if (typeof sound === 'function') { try { sound(); } catch (error) {} }
}

// ---------- Page elements ----------

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.canvasWidth;
canvas.height = CONFIG.canvasHeight;
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const fixButtons = document.getElementById('fix-buttons');
const sr = document.getElementById('sr');

// ---------- Game state ----------

let state = 'ready';
const skyMiddle = (CONFIG.canvasHeight - CONFIG.groundHeight) / 2;
let y = skyMiddle;
let velocity = 0;
let pipes = [];
let pipesMade = 0;
let groundOffset = 0;
let lastGapTop = skyMiddle;
let score = 0;
let checkpoint = 0;
let secondsSinceCrash = 0;
let currentMode = 'normal';
let bestScore = 0;
try { bestScore = parseInt(localStorage.getItem('cloneWarsBest'), 10) || 0; } catch (error) {}
let lastFrameTime = null;

// ---------- Screens ----------

function showReady() {
  overlayTitle.textContent = CONFIG.title;
  overlayText.textContent = [
    'Press Space, click or tap to start.',
    'Press M to turn sound ' + (muted ? 'on.' : 'off.')
  ].join('\n');
  overlay.hidden = false;
}

function showGameOver() {
  overlayTitle.textContent = 'Game over';
  const lines = [
    'Score ' + score + '   ·   Best ' + bestScore,
    'Press Space, click or tap to play again.',
    'Press M to turn sound ' + (muted ? 'on.' : 'off.')
  ];
  if (CONFIG.fix === 'checkpoints' && checkpoint > 0) lines.push('Next game starts at checkpoint ' + checkpoint + '.');
  overlayText.textContent = lines.join('\n');
  overlay.hidden = false;
}

// ---------- Input ----------

function press() {
  if (state === 'ready') startGame();
  else if (state === 'playing') { velocity = -CONFIG.flapStrength; play('flap'); }
  else if (state === 'gameover' && secondsSinceCrash >= 0.4) startGame();
}

function startGame() {
  state = 'playing';
  y = skyMiddle;
  velocity = -CONFIG.flapStrength;
  pipes = [];
  pipesMade = 0;
  groundOffset = 0;
  lastGapTop = skyMiddle;
  score = checkpoint;
  secondsSinceCrash = 0;
  overlay.hidden = true;
  play('flap');
}

window.addEventListener('keydown', (event) => {
  if (event.target && event.target.closest && event.target.closest('button')) return;
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    press();
  } else if (event.code === 'KeyM') {
    muted = !muted;
    if (state === 'ready') showReady();
    if (state === 'gameover') showGameOver();
  }
});
window.addEventListener('pointerdown', (event) => {
  if (event.target && event.target.closest && event.target.closest('button')) return;
  press();
});

// ---------- Pipes ----------

function addPipe(pipeGap) {
  const gap = pipeGap + (CONFIG.fix === 'gentle-start' && pipesMade < 3 ? 70 : 0);
  const lowest = CONFIG.canvasHeight - CONFIG.groundHeight - 60 - gap;
  const gapTop = Math.max(60, Math.min(lowest, lastGapTop + (Math.random() * 360 - 180)));
  const gapBottom = gapTop + gap;
  lastGapTop = gapTop;
  pipes.push({ x: CONFIG.canvasWidth, gapTop: gapTop, gapBottom: gapBottom, scored: false });
  pipesMade += 1;
}

// ---------- Crash ----------

function crash() {
  state = 'gameover';
  secondsSinceCrash = 0;
  play('crash');
  try {
    bestScore = Math.max(bestScore, score);
    localStorage.setItem('cloneWarsBest', String(bestScore));
  } catch (error) {}
  checkpoint = CONFIG.fix === 'checkpoints' ? Math.floor(score / 10) * 10 : 0;
  sr.textContent = 'Game over. Score ' + score + '. Best ' + bestScore + '.';
  showGameOver();
}

// ---------- Main loop ----------

function frame(timestamp) {
  let seconds = 0;
  if (lastFrameTime !== null) seconds = Math.min(0.05, (timestamp - lastFrameTime) / 1000);
  lastFrameTime = timestamp;
  const birdX = CONFIG.canvasWidth / 4;

  if (state === 'playing') {
    velocity += CONFIG.gravity * seconds;
    y += velocity * seconds;

    const mode = CONFIG.fix === 'easy-mode' ? CONFIG.modes[currentMode] : CONFIG;
    const pipeGap = mode.pipeGap;
    const pipeSpeed = mode.pipeSpeed * (CONFIG.fix === 'gentle-start' && score < 3 ? 0.75 : 1);

    groundOffset += pipeSpeed * seconds;

    if (pipes.length === 0) addPipe(pipeGap);
    else if (pipes[pipes.length - 1].x <= CONFIG.canvasWidth - CONFIG.pipeSpacing) addPipe(pipeGap);

    for (const pipe of pipes) pipe.x -= pipeSpeed * seconds;
    pipes = pipes.filter((pipe) => pipe.x + CONFIG.pipeWidth > 0);

    for (const pipe of pipes) {
      if (!pipe.scored && pipe.x + CONFIG.pipeWidth < birdX) { pipe.scored = true; score += 1; play('score'); }
    }

    const groundY = CONFIG.canvasHeight - CONFIG.groundHeight;
    let hit = (y + CONFIG.birdSize / 2 >= groundY) || (y - CONFIG.birdSize / 2 <= 0);
    if (!hit) {
      for (const pipe of pipes) {
        const withinX = birdX + CONFIG.birdSize / 2 > pipe.x && birdX - CONFIG.birdSize / 2 < pipe.x + CONFIG.pipeWidth;
        if (withinX && (y - CONFIG.birdSize / 2 < pipe.gapTop || y + CONFIG.birdSize / 2 > pipe.gapBottom)) hit = true;
      }
    }
    if (hit) crash();
  } else if (state === 'gameover') {
    secondsSinceCrash += seconds;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const groundTop = CONFIG.canvasHeight - CONFIG.groundHeight;

  drawBackground(ctx, CONFIG.canvasWidth, CONFIG.canvasHeight, reduceMotion ? 0 : timestamp / 1000);
  for (const pipe of pipes) drawPipe(ctx, pipe.x, pipe.gapTop, pipe.gapBottom, CONFIG.pipeWidth, groundTop);
  drawGround(ctx, CONFIG.canvasWidth, CONFIG.canvasHeight, CONFIG.groundHeight, groundOffset);
  drawBird(ctx, birdX, y, CONFIG.birdSize, velocity);

  if (state === 'playing') {
    ctx.save();
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#101826';
    ctx.fillStyle = '#ffffff';
    ctx.strokeText(String(score), CONFIG.canvasWidth / 2, 16);
    ctx.fillText(String(score), CONFIG.canvasWidth / 2, 16);
    ctx.restore();
  }

  requestAnimationFrame(frame);
}

// ---------- Plays differently: easy-mode ----------

if (CONFIG.fix === 'easy-mode') {
  for (const mode of ['easy', 'normal']) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = mode === 'easy' ? 'Easy' : 'Normal';
    button.setAttribute('aria-pressed', String(mode === currentMode));
    button.addEventListener('click', (event) => {
      currentMode = mode;
      for (const other of fixButtons.querySelectorAll('button')) {
        other.setAttribute('aria-pressed', String(other === event.currentTarget));
      }
      event.currentTarget.blur();
    });
    fixButtons.appendChild(button);
  }
}

showReady();
requestAnimationFrame(frame);
