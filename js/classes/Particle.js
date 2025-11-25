class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.size = Math.random() * 3 + 1;
        this.life = 1.0;
        this.color = color;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 0.05; }
    draw() {
        ctx.globalAlpha = this.life; ctx.fillStyle = this.color;
        ctx.fillRect(this.x - cameraX, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}
