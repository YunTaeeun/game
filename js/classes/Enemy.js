class Enemy {
    constructor(x, y, passive = false) {
        this.x = x; this.y = y;
        this.w = 25; this.h = 40;
        this.vx = 0;
        this.vy = 0; // 점프용
        this.color = passive ? '#ff00ff' : '#f00'; // 파티 모드는 핑크
        this.alive = true;
        this.shootTimer = Math.random() * 100;
        this.passive = passive;
        this.onGround = false;
    }
    update() {
        if (!this.alive) return;

        // STAGE 7: 파티 모드 (점프만 함)
        if (this.passive) {
            // 중력
            this.vy += GRAVITY;
            this.y += this.vy;

            // 바닥 충돌 체크 (간단하게)
            let grounded = false;
            for (let p of platforms) {
                if (this.x < p.x + p.w && this.x + this.w > p.x &&
                    this.y < p.y + p.h && this.y + this.h > p.y) {
                    // 바닥 착지
                    if (this.vy > 0 && this.y + this.h - this.vy <= p.y) {
                        this.y = p.y - this.h;
                        this.vy = 0;
                        grounded = true;
                    }
                }
            }

            // 바닥에 있으면 랜덤 점프
            if (grounded) {
                if (Math.random() < 0.05) { // 5% 확률로 점프
                    this.vy = -10 - Math.random() * 5;
                    // 파티 효과
                    createParticles(this.x + this.w / 2, this.y + this.h, 3, getRandomColor());
                }
            }
            return; // 공격 안함
        }

        const dist = Math.abs(player.x - this.x);
        if (dist < 800 && Math.abs(player.y - this.y) < 200) {
            this.shootTimer++;
            if (this.shootTimer > 120) {
                this.shootTimer = 0;
                bullets.push(new Bullet(this.x + (player.x > this.x ? this.w : 0), this.y + 10, player.x > this.x ? 1 : -1));
            }
        }

        // 일반 스테이지에서는 플레이어 킬
        if (checkRectCollision(player, this)) die();
    }
    draw() {
        if (!this.alive) return;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.fillRect(this.x - cameraX, this.y, this.w, this.h);

        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
        if (this.passive) {
            // 웃는 눈 ^ ^
            ctx.fillRect(this.x - cameraX + 5, this.y + 10, 5, 2);
            ctx.fillRect(this.x - cameraX + 15, this.y + 10, 5, 2);
        } else {
            const eyeOffset = player.x > this.x ? 15 : 5;
            ctx.fillRect(this.x - cameraX + eyeOffset, this.y + 10, 5, 5);
        }
    }
}
