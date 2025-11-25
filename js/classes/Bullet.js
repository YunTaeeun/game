class Bullet {
    constructor(x, y, dir) {
        this.x = x; this.y = y;
        this.vx = dir * 8;
        this.w = 10; this.h = 4;
        this.active = true;
    }
    update() {
        this.x += this.vx;
        if (Math.abs(this.x - player.x) > 1000) this.active = false;
        // 패시브 모드가 아닐때만 플레이어 사망
        if (this.active && checkRectCollision({ x: this.x, y: this.y, w: this.w, h: this.h }, player)) {
            if (!player.isDashing) die();
        }
        platforms.forEach(p => {
            if (checkRectCollision({ x: this.x, y: this.y, w: this.w, h: this.h }, p)) {
                this.active = false;
                createParticles(this.x, this.y, 3, '#f00');
            }
        });
    }
    draw() {
        if (!this.active) return;
        ctx.fillStyle = '#ff0';
        ctx.fillRect(this.x - cameraX, this.y, this.w, this.h);
    }
}
