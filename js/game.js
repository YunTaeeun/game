const gameContainer = document.getElementById('gameContainer');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Screens
const mainMenu = document.getElementById('mainMenu');
const stageSelect = document.getElementById('stageSelect');
const stageButtons = document.getElementById('stageButtons');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const leaderboardList = document.getElementById('leaderboardList');
const gameOverScreen = document.getElementById('gameOverScreen');
const clearScreen = document.getElementById('clearScreen');
const endingScreen = document.getElementById('endingScreen');

// HUD
const stageText = document.getElementById('stageText');
const dashText = document.getElementById('dashText');
const timerText = document.getElementById('timerText');
const bestText = document.getElementById('bestText');
const centerMsg = document.getElementById('centerMsg');
const clearTimeResult = document.getElementById('clearTimeResult');
const clearTitle = document.getElementById('clearTitle');
const nextBtn = document.getElementById('nextBtn');
const audioBtn = document.getElementById('audioBtn');

// Managers
const saveManager = new SaveManager();
const audioManager = new AudioManager();

let gameState = 'menu'; // menu, playing, gameover, clear, ending
let frameCount = 0;
let score = 0;
let cameraX = 0;
let currentStage = 1;
let startTime = 0;

// 체크포인트 변수 (6스테이지용)
let checkpointActive = false;
const CHECKPOINT_X = 2400;
const CHECKPOINT_Y = 300;

// 물리 상수
const GRAVITY = 0.6;
const FRICTION = 0.85;
const SPEED = 6;
const JUMP_FORCE = 12;
const DASH_SPEED = 25;
const WALL_SLIDE_SPEED = 2;
const WALL_JUMP_FORCE_X = 10;
const WALL_JUMP_FORCE_Y = 14;

const keys = { right: false, left: false, up: false, dash: false, attack: false };

let platforms = [];
let enemies = [];
let bullets = [];
let particles = [];
let startPoint = { x: 0, y: 0, w: 0, h: 0 };
let endPoint = { x: 0, y: 0, w: 0, h: 0 };
let player;

let now, then = Date.now();
const interval = 1000 / 60;
let delta;

function getRandomColor() {
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function checkRectCollision(r1, r2) {
    return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
}

function checkWallCollision(obj, axis) {
    for (let p of platforms) {
        if (checkRectCollision(obj, p)) {
            if (axis === 'x') {
                if (obj.vx > 0) { obj.x = p.x - obj.w; obj.onWall = 1; }
                else if (obj.vx < 0) { obj.x = p.x + p.w; obj.onWall = -1; }
                obj.vx = 0;
            } else {
                if (obj.vy > 0) {
                    obj.y = p.y - obj.h;
                    obj.onGround = true;
                    obj.vy = 0;
                    obj.onWall = 0;
                    obj.canDash = true;
                }
                else if (obj.vy < 0) { obj.y = p.y + p.h; obj.vy = 0; }
            }
        }
    }
}

function checkAttackHit() {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const range = 80;
    enemies.forEach(enemy => {
        if (!enemy.alive) return;
        const dist = Math.sqrt((px - (enemy.x + 12)) ** 2 + (py - (enemy.y + 20)) ** 2);
        const dirToEnemy = enemy.x - player.x;
        const facingTarget = (player.facingRight && dirToEnemy > 0) || (!player.facingRight && dirToEnemy < 0);

        if (dist < range && facingTarget) {
            enemy.alive = false;
            createParticles(enemy.x, enemy.y, 20, enemy.passive ? getRandomColor() : '#f00');
            score += 100;
            audioManager.playExplosion();
        }
    });
    bullets.forEach(b => {
        if (!b.active) return;
        const dist = Math.sqrt((px - b.x) ** 2 + (py - b.y) ** 2);
        if (dist < range) { b.active = false; createParticles(b.x, b.y, 5, '#ff0'); }
    });
}

function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

// --- Menu Functions ---

function showMainMenu() {
    gameState = 'menu';
    mainMenu.style.display = 'flex';
    gameOverScreen.style.display = 'none';
    clearScreen.style.display = 'none';
    endingScreen.style.display = 'none';
    leaderboardScreen.style.display = 'none';
    gameContainer.classList.remove('glitch-active');
}

function startGame(stage = 1) {
    if (stage > saveManager.getUnlockedStages() && stage !== 0) return; // 0 is unlocked always if secret found? For now just allow if unlocked
    currentStage = stage;
    mainMenu.style.display = 'none';
    stageSelect.style.display = 'none';
    initLevel(currentStage);
}

function showStageSelect() {
    const unlocked = saveManager.getUnlockedStages();
    stageButtons.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const btn = document.createElement('div');
        btn.className = `stage-btn ${i <= unlocked ? 'unlocked' : 'locked'}`;
        btn.innerText = i;
        if (i <= unlocked) {
            btn.onclick = () => startGame(i);
        }
        stageButtons.appendChild(btn);
    }

    // Easter Egg Button (Hidden unless unlocked or special condition)
    // For now, let's just add a small hidden clickable area or key combo?
    // User asked to exclude it from 1-10. Let's not show it in the grid.

    stageSelect.style.display = 'block';
}

function hideStageSelect() {
    stageSelect.style.display = 'none';
}

function showLeaderboard() {
    mainMenu.style.display = 'none';
    leaderboardScreen.style.display = 'flex';
    leaderboardList.innerHTML = '';

    const bestTimes = saveManager.data.bestTimes;
    let hasData = false;
    for (let i = 1; i <= 10; i++) {
        if (bestTimes[i]) {
            hasData = true;
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            row.innerHTML = `<span>STAGE ${i}</span> <span>${bestTimes[i].toFixed(2)}s</span>`;
            leaderboardList.appendChild(row);
        }
    }

    if (!hasData) {
        leaderboardList.innerHTML = '<div style="text-align:center; color:#555;">NO RECORDS YET</div>';
    }
}

function hideLeaderboard() {
    leaderboardScreen.style.display = 'none';
    mainMenu.style.display = 'flex';
}

function toggleAudio() {
    const enabled = audioManager.toggleMute();
    audioBtn.innerText = `AUDIO: ${enabled ? 'ON' : 'OFF'}`;
    audioBtn.style.color = enabled ? '#0ff' : '#555';
    audioBtn.style.borderColor = enabled ? '#0ff' : '#555';
}

// --- Game Logic ---

function initLevel(stage) {
    platforms = []; enemies = []; bullets = []; particles = [];
    player = new Player();

    platforms.push({ x: 0, y: 400, w: 400, h: 50 });
    startPoint = { x: 50, y: 300, w: 50, h: 100 };

    const titles = {
        1: "TUTORIAL", 2: "LONG RUN", 3: "ORIGINS", 4: "SKY PLATFORMS", 5: "NO FLOOR",
        6: "NIGHTMARE", 7: "THE ASCENT", 8: "VOID WALKER", 9: "FINAL PROTOCOL", 10: "SYSTEM CORE",
        0: "PARTY TIME!" // Easter Egg
    };

    stageText.innerText = `STAGE ${stage === 0 ? '???' : stage}: ${titles[stage] || "UNKNOWN"}`;
    centerMsg.innerText = stage === 0 ? "SECRET STAGE" : `STAGE ${stage}`;
    centerMsg.style.opacity = 1;

    if (stage === 0) {
        centerMsg.style.color = "#f0f"; // 핑크
        centerMsg.innerText = "BONUS STAGE!";
    } else {
        centerMsg.style.color = "#fff";
    }

    setTimeout(() => centerMsg.style.opacity = 0, 1500);

    if (stage === 6 && checkpointActive) {
        player.x = CHECKPOINT_X;
        player.y = CHECKPOINT_Y;
        centerMsg.innerText = "CHECKPOINT LOADED";
        setTimeout(() => centerMsg.style.opacity = 1, 100);
        setTimeout(() => centerMsg.style.opacity = 0, 1500);
    }

    // Level Design
    if (stage === 1) {
        platforms.push({ x: 500, y: 350, w: 200, h: 20 });
        enemies.push(new Enemy(600, 310));
        platforms.push({ x: 800, y: 300, w: 20, h: 200 });
        platforms.push({ x: 1000, y: 400, w: 300, h: 50 });
        endPoint = { x: 1200, y: 300, w: 50, h: 100 };
    }
    else if (stage === 2) {
        let cx = 400;
        for (let i = 0; i < 4; i++) {
            platforms.push({ x: cx, y: 400, w: 300, h: 50 });
            enemies.push(new Enemy(cx + 150, 360));
            platforms.push({ x: cx + 350, y: 250, w: 20, h: 150 });
            cx += 500;
        }
        platforms.push({ x: cx, y: 400, w: 300, h: 50 });
        endPoint = { x: cx + 100, y: 300, w: 50, h: 100 };
    }
    else if (stage === 3) {
        platforms.push({ x: 0, y: 400, w: 800, h: 50 });
        platforms.push({ x: 900, y: 300, w: 20, h: 300 });
        platforms.push({ x: 920, y: 500, w: 200, h: 50 });
        platforms.push({ x: 1200, y: 400, w: 400, h: 50 });
        enemies.push(new Enemy(1400, 360));
        platforms.push({ x: 1700, y: 350, w: 20, h: 400 });
        platforms.push({ x: 1900, y: 250, w: 20, h: 400 });
        platforms.push({ x: 2100, y: 200, w: 600, h: 20 });
        enemies.push(new Enemy(2300, 160));
        enemies.push(new Enemy(2600, 160));
        platforms.push({ x: 2900, y: 300, w: 200, h: 20 });
        enemies.push(new Enemy(3000, 260));
        platforms.push({ x: 3300, y: 400, w: 500, h: 50 });
        endPoint = { x: 3400, y: 300, w: 50, h: 100 };
    }
    else if (stage === 4) {
        platforms.push({ x: 500, y: 350, w: 100, h: 20, moving: true, vx: 2, min: 400, max: 600 });
        platforms.push({ x: 800, y: 300, w: 100, h: 20, moving: true, vx: -2, min: 700, max: 900 });
        enemies.push(new Enemy(830, 260));
        platforms.push({ x: 1100, y: 250, w: 100, h: 20, moving: true, vx: 3, min: 1000, max: 1300 });
        enemies.push(new Enemy(1120, 210));
        platforms.push({ x: 1400, y: 400, w: 200, h: 50 });
        endPoint = { x: 1500, y: 300, w: 50, h: 100 };
    }
    else if (stage === 5) {
        platforms.push({ x: 500, y: 200, w: 20, h: 300 });
        platforms.push({ x: 700, y: 0, w: 20, h: 300 });
        platforms.push({ x: 900, y: 300, w: 20, h: 300 });
        enemies.push(new Enemy(900, 100));
        platforms.push({ x: 1100, y: 200, w: 20, h: 300 });
        platforms.push({ x: 1300, y: 400, w: 200, h: 50 });
        endPoint = { x: 1400, y: 300, w: 50, h: 100 };
    }
    else if (stage === 6) {
        // NIGHTMARE REFORGED
        platforms.push({ x: 450, y: 400, w: 50, h: 20 });
        platforms.push({ x: 600, y: 350, w: 40, h: 20 });
        platforms.push({ x: 750, y: 300, w: 40, h: 20 });
        enemies.push(new Enemy(755, 260));

        platforms.push({ x: 950, y: 200, w: 20, h: 250, moving: true, vx: 0, vy: 4, min: 0, max: 0, minY: 100, maxY: 300 });
        platforms.push({ x: 1150, y: 400, w: 50, h: 10, moving: true, vx: 5, min: 1100, max: 1300 });
        enemies.push(new Enemy(1350, 300));
        platforms.push({ x: 1500, y: 350, w: 50, h: 20 });
        platforms.push({ x: 1750, y: 350, w: 50, h: 20 });
        platforms.push({ x: 1950, y: 100, w: 20, h: 400 });
        enemies.push(new Enemy(2000, 200));
        platforms.push({ x: 2150, y: 0, w: 20, h: 350 });

        // [체크포인트]
        platforms.push({ x: 2350, y: 400, w: 100, h: 20 });

        platforms.push({ x: 2600, y: 300, w: 40, h: 15, moving: true, vx: 3, min: 2550, max: 2750 });
        platforms.push({ x: 2900, y: 250, w: 40, h: 15, moving: true, vx: -3, min: 2850, max: 3050 });
        enemies.push(new Enemy(2950, 200));
        platforms.push({ x: 3200, y: 0, w: 20, h: 250 });
        platforms.push({ x: 3200, y: 350, w: 20, h: 200 });
        platforms.push({ x: 3500, y: 400, w: 50, h: 20 });
        enemies.push(new Enemy(3800, 360));
        platforms.push({ x: 3800, y: 400, w: 50, h: 20 });
        platforms.push({ x: 4100, y: 200, w: 20, h: 300, moving: true, vx: 0, vy: 6, minY: 100, maxY: 300 });
        platforms.push({ x: 4300, y: 100, w: 20, h: 300, moving: true, vx: 0, vy: -6, minY: 50, maxY: 250 });

        platforms.push({ x: 4600, y: 400, w: 200, h: 50 });
        endPoint = { x: 4700, y: 300, w: 50, h: 100 };
    }
    else if (stage === 0) {
        // STAGE 0: PARTY TIME (Easter Egg)
        platforms.push({ x: 400, y: 400, w: 2500, h: 50 });
        for (let i = 0; i < 30; i++) {
            enemies.push(new Enemy(600 + i * 80, 360, true));
        }
        endPoint = { x: 2800, y: 300, w: 50, h: 100 };
    }
    else if (stage === 7) {
        // THE ASCENT (Was 8)
        platforms.push({ x: 0, y: 400, w: 400, h: 50 });
        platforms.push({ x: 400, y: 300, w: 100, h: 20 });
        platforms.push({ x: 600, y: 200, w: 100, h: 20 });
        enemies.push(new Enemy(620, 160));
        platforms.push({ x: 800, y: 100, w: 100, h: 20 });
        platforms.push({ x: 1000, y: 200, w: 20, h: 300 }); // Wall
        platforms.push({ x: 1200, y: 400, w: 200, h: 50 });
        enemies.push(new Enemy(1300, 360));
        platforms.push({ x: 1500, y: 300, w: 50, h: 20, moving: true, vx: 0, vy: 3, minY: 100, maxY: 350 });
        platforms.push({ x: 1700, y: 200, w: 50, h: 20, moving: true, vx: 0, vy: -3, minY: 50, maxY: 300 });
        platforms.push({ x: 1900, y: 400, w: 300, h: 50 });
        endPoint = { x: 2100, y: 300, w: 50, h: 100 };
    }
    else if (stage === 8) {
        // VOID WALKER (Was 9)
        platforms.push({ x: 0, y: 400, w: 200, h: 50 });
        platforms.push({ x: 300, y: 400, w: 50, h: 20 });
        platforms.push({ x: 500, y: 350, w: 50, h: 20 });
        platforms.push({ x: 700, y: 300, w: 50, h: 20 });
        enemies.push(new Enemy(710, 260));
        platforms.push({ x: 900, y: 250, w: 50, h: 20 });
        platforms.push({ x: 1100, y: 300, w: 50, h: 20 });
        platforms.push({ x: 1300, y: 350, w: 50, h: 20 });
        platforms.push({ x: 1500, y: 400, w: 200, h: 50 });
        enemies.push(new Enemy(1600, 360));
        platforms.push({ x: 1800, y: 250, w: 20, h: 200 }); // Wall jump test
        platforms.push({ x: 2000, y: 150, w: 20, h: 200 });
        platforms.push({ x: 2200, y: 400, w: 200, h: 50 });
        endPoint = { x: 2300, y: 300, w: 50, h: 100 };
    }
    else if (stage === 9) {
        // FINAL PROTOCOL (Was 10)
        platforms.push({ x: 0, y: 400, w: 400, h: 50 });
        platforms.push({ x: 500, y: 350, w: 100, h: 20, moving: true, vx: 3, min: 500, max: 700 });
        enemies.push(new Enemy(520, 310));
        platforms.push({ x: 800, y: 250, w: 20, h: 300 });
        platforms.push({ x: 1000, y: 100, w: 20, h: 300 });
        platforms.push({ x: 1200, y: 400, w: 200, h: 50 });
        enemies.push(new Enemy(1300, 360));
        platforms.push({ x: 1500, y: 300, w: 50, h: 20 });
        platforms.push({ x: 1700, y: 200, w: 50, h: 20 });
        platforms.push({ x: 1900, y: 100, w: 50, h: 20 });
        platforms.push({ x: 2100, y: 400, w: 500, h: 50 });
        enemies.push(new Enemy(2200, 360));
        enemies.push(new Enemy(2400, 360));
        endPoint = { x: 2500, y: 300, w: 50, h: 100 };
    }
    else if (stage === 10) {
        // SYSTEM CORE (New 10)
        platforms.push({ x: 0, y: 400, w: 300, h: 50 });

        // Moving platforms over void
        platforms.push({ x: 400, y: 350, w: 50, h: 20, moving: true, vx: 4, min: 350, max: 550 });
        platforms.push({ x: 700, y: 300, w: 50, h: 20, moving: true, vx: -4, min: 650, max: 850 });

        // Enemy gauntlet
        platforms.push({ x: 1000, y: 400, w: 600, h: 50 });
        enemies.push(new Enemy(1100, 360));
        enemies.push(new Enemy(1300, 360));
        enemies.push(new Enemy(1500, 360));

        // Precision wall jumps
        platforms.push({ x: 1800, y: 200, w: 20, h: 400 });
        platforms.push({ x: 2000, y: 0, w: 20, h: 400 });

        // Final dash
        platforms.push({ x: 2200, y: 400, w: 400, h: 50 });
        enemies.push(new Enemy(2400, 360));

        endPoint = { x: 2500, y: 300, w: 50, h: 100 };
    }

    startTime = Date.now();
    gameOverScreen.style.display = 'none';
    clearScreen.style.display = 'none';
    endingScreen.style.display = 'none';
    gameContainer.classList.remove('glitch-active');
    gameState = 'playing';
}

function update() {
    if (gameState !== 'playing') return;

    // 파티 모드 컨페티 (Stage 0)
    if (currentStage === 0 && frameCount % 5 === 0) {
        createParticles(Math.random() * 800 + cameraX, 0, 1, getRandomColor());
    }

    platforms.forEach(p => {
        if (p.moving) {
            p.x += p.vx;
            if (p.vx !== undefined && p.vx !== 0) {
                if (p.x < p.min || p.x > p.max) p.vx *= -1;
            }
            if (p.vy !== undefined && p.vy !== 0) {
                p.y += p.vy;
                if (p.y < p.minY || p.y > p.maxY) p.vy *= -1;
            } else if (p.vx !== 0) {
                if (player.onGround &&
                    player.y + player.h === p.y &&
                    player.x + player.w > p.x &&
                    player.x < p.x + p.w) {
                    player.x += p.vx;
                }

                enemies.forEach(e => {
                    if (e.alive && !e.passive &&
                        Math.abs((e.y + e.h) - p.y) < 5 &&
                        e.x + e.w > p.x &&
                        e.x < p.x + p.w) {
                        e.x += p.vx;
                    }
                });
            }
        }
    });

    player.update();
    enemies.forEach(e => e.update());
    bullets.forEach(b => b.update());
    particles.forEach(p => p.update());
    particles = particles.filter(p => p.life > 0);

    let targetCamX = player.x - 200;
    cameraX += (targetCamX - cameraX) * 0.1;

    let t = (Date.now() - startTime) / 1000;
    timerText.innerText = t.toFixed(2);
    dashText.innerText = player.canDash ? "DASH READY" : "RECHARGING...";
    dashText.style.color = player.canDash ? "#0ff" : "#555";
}

function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.moveTo(i - (cameraX % 50), 0);
        ctx.lineTo(i - (cameraX % 50), canvas.height);
    }
    ctx.stroke();

    if (startPoint.x - cameraX < canvas.width) {
        ctx.fillStyle = 'rgba(0,255,0,0.2)';
        ctx.fillRect(startPoint.x - cameraX, 0, startPoint.w, canvas.height);
        ctx.fillStyle = '#0f0'; ctx.font = '20px Courier New';
        ctx.fillText("START", startPoint.x - cameraX, 100);
    }
    if (endPoint.x - cameraX < canvas.width) {
        ctx.fillStyle = 'rgba(0,255,255,0.3)';
        ctx.fillRect(endPoint.x - cameraX, endPoint.y, endPoint.w, endPoint.h);
        ctx.strokeStyle = '#0ff'; ctx.strokeRect(endPoint.x - cameraX, endPoint.y, endPoint.w, endPoint.h);
        ctx.fillStyle = '#fff'; ctx.fillText("EXIT", endPoint.x - cameraX, endPoint.y - 10);
    }

    ctx.strokeStyle = '#b0f'; ctx.lineWidth = 2;
    platforms.forEach(p => {
        if (p.x - cameraX + p.w > 0 && p.x - cameraX < canvas.width) {
            ctx.fillStyle = p.moving ? '#505' : '#202';
            ctx.fillRect(p.x - cameraX, p.y, p.w, p.h);
            ctx.strokeRect(p.x - cameraX, p.y, p.w, p.h);
        }
    });

    // 체크포인트 깃발 그리기 (Stage 6)
    if (currentStage === 6) {
        const flagColor = checkpointActive ? '#0f0' : '#f00';
        const flagX = CHECKPOINT_X - cameraX;
        ctx.fillStyle = '#888';
        ctx.fillRect(flagX, CHECKPOINT_Y - 40, 5, 40);
        ctx.fillStyle = flagColor;
        ctx.fillRect(flagX + 5, CHECKPOINT_Y - 40, 20, 15);
        if (!checkpointActive) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px Courier New';
            ctx.fillText("SAVE", flagX - 5, CHECKPOINT_Y - 50);
        }
    }

    enemies.forEach(e => e.draw());
    bullets.forEach(b => b.draw());
    player.draw();
    particles.forEach(p => p.draw());
}

function loop() {
    requestAnimationFrame(loop);
    now = Date.now();
    delta = now - then;
    if (delta > interval) {
        then = now - (delta % interval);
        update();
        draw();
        frameCount++;
    }
}

function die() {
    if (gameState !== 'playing') return;
    gameState = 'gameover';
    createParticles(player.x, player.y, 50, '#0ff');
    gameOverScreen.style.display = 'flex';
    audioManager.playDie();
}

function stageClear() {
    if (gameState !== 'playing') return;
    gameState = 'clear';
    let t = (Date.now() - startTime) / 1000;

    // Save Data
    if (currentStage !== 0) { // Don't save progress for Easter Egg
        const isNewRecord = saveManager.saveTime(currentStage, t);
        saveManager.unlockStage(currentStage + 1);
        const bestTime = saveManager.getBestTime(currentStage);
        bestText.innerText = `BEST: ${bestTime.toFixed(2)}`;
        clearTimeResult.innerText = `TIME: ${t.toFixed(2)}s ${isNewRecord ? "(NEW RECORD!)" : ""}`;
    } else {
        clearTimeResult.innerText = `TIME: ${t.toFixed(2)}s`;
    }

    clearScreen.style.display = 'flex';
    clearTitle.style.color = "#0f0";
    clearTitle.innerText = "SYSTEM SECURED";
    nextBtn.style.display = "inline-block";

    audioManager.playClear();

    // 6 -> 7 글리치 연출 (Still keep this for lore?)
    // Maybe remove glitch transition if 7 is just a normal stage now.
    // Let's keep it but make it less intrusive or just remove it to keep flow standard.
    // Removing glitch transition for standard flow.
}

function resetGame() { initLevel(currentStage); }

function nextStage() {
    if (currentStage === 0) {
        showMainMenu(); // Exit Easter Egg to menu
        return;
    }

    currentStage++;
    checkpointActive = false;
    if (currentStage > 10) {
        gameState = 'ending';
        clearScreen.style.display = 'none';
        endingScreen.style.display = 'flex';
    } else {
        initLevel(currentStage);
    }
}

function restartFromBeginning() {
    currentStage = 1;
    checkpointActive = false;
    showMainMenu();
}

window.addEventListener('keydown', e => {
    if (gameState === 'menu') {
        if (e.code === 'Space' || e.code === 'Enter') {
            if (mainMenu.style.display !== 'none' && stageSelect.style.display === 'none') {
                startGame(saveManager.getUnlockedStages()); // Continue from latest
            }
        }
        // Easter Egg Trigger: Press 'P' in menu
        if (e.code === 'KeyP') {
            startGame(0);
        }
        return;
    }

    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowUp' || e.code === 'Space') keys.up = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.dash = true;
    if (e.code === 'KeyZ') keys.attack = true;
    if (e.code === 'KeyR' && gameState === 'gameover') resetGame();
});
window.addEventListener('keyup', e => {
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowUp' || e.code === 'Space') keys.up = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.dash = false;
    if (e.code === 'KeyZ') keys.attack = false;
});
canvas.addEventListener('mousedown', () => {
    if (gameState === 'playing') {
        keys.attack = true;
        audioManager.playShoot();
    }
});
canvas.addEventListener('mouseup', () => { keys.attack = false; });

// Initial Start
showMainMenu();
loop();
