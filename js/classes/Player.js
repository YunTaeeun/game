class Player {
    constructor() {
        this.w = 20; this.h = 40;
        this.x = 100; this.y = 200;
        this.vx = 0; this.vy = 0;
        this.color = '#0ff';
        this.onGround = false;
        this.onWall = 0; 
        this.canDash = true;
        this.isDashing = false;
        this.dashCooldown = 0;
        this.dashDuration = 0;
        this.facingRight = true;
        this.isAttacking = false;
        this.attackDuration = 0;
        this.attackCooldown = 0;
        this.trail = [];
    }

    update() {
        if (this.isDashing) {
            this.dashDuration--;
            this.vy = 0; 
            if (frameCount % 2 === 0) this.trail.push({x: this.x, y: this.y, alpha: 0.8});
            if (this.dashDuration <= 0) {
                this.isDashing = false;
                this.vx *= 0.2;
            }
        } else {
            if (keys.right) { this.vx += 1; this.facingRight = true; }
            if (keys.left) { this.vx -= 1; this.facingRight = false; }

            this.vx *= FRICTION;
            if (Math.abs(this.vx) > SPEED && !this.isDashing) this.vx = this.vx > 0 ? SPEED : -SPEED;
            this.vy += GRAVITY;

            if (this.onWall !== 0 && !this.onGround && this.vy > 0) this.vy = WALL_SLIDE_SPEED;
        }

        // 천장 충돌 처리
        if (this.y < 0) {
            this.y = 0;
            if (this.vy < 0) this.vy = 0;
        }

        if (keys.up) {
            if (this.onGround) {
                this.vy = -JUMP_FORCE;
                this.onGround = false;
                createParticles(this.x + this.w/2, this.y + this.h, 5, '#fff');
                keys.up = false;
            } else if (this.onWall !== 0) {
                this.vy = -WALL_JUMP_FORCE_Y;
                this.vx = -this.onWall * WALL_JUMP_FORCE_X;
                this.onWall = 0;
                createParticles(this.x + (this.onWall === 1 ? this.w : 0), this.y + this.h/2, 5, '#fff');
                keys.up = false;
            }
        }

        if (keys.dash && this.canDash && !this.isDashing) {
            this.isDashing = true;
            this.canDash = false;
            this.dashDuration = 10;
            this.dashCooldown = 60;
            let dashDir = this.facingRight ? 1 : -1;
            if (keys.right) dashDir = 1;
            if (keys.left) dashDir = -1;
            this.vx = dashDir * DASH_SPEED;
            keys.dash = false;
            createParticles(this.x + this.w/2, this.y + this.h/2, 10, '#0ff');
        }

        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.dashCooldown <= 0 && !this.isDashing) this.canDash = true;

        if (keys.attack && this.attackCooldown <= 0) {
            this.isAttacking = true;
            this.attackDuration = 10;
            this.attackCooldown = 20;
            keys.attack = false;
            checkAttackHit();
        }
        if (this.attackDuration > 0) this.attackDuration--;
        else this.isAttacking = false;
        if (this.attackCooldown > 0) this.attackCooldown--;

        this.onGround = false;
        this.onWall = 0;

        this.x += this.vx;
        checkWallCollision(this, 'x');

        this.y += this.vy;
        checkWallCollision(this, 'y');
        
        if (this.y > canvas.height + 100) die();

        if (this.x > endPoint.x && this.x < endPoint.x + endPoint.w &&
            this.y > endPoint.y && this.y < endPoint.y + endPoint.h) {
            stageClear();
        }

        // STAGE 6 체크포인트 로직
        if (currentStage === 6 && !checkpointActive) {
            if (this.x > CHECKPOINT_X - 20 && this.x < CHECKPOINT_X + 20 && this.onGround) {
                checkpointActive = true;
                centerMsg.innerText = "CHECKPOINT SAVED";
                centerMsg.style.color = "#0f0";
                centerMsg.style.opacity = 1;
                createParticles(this.x, this.y, 30, '#0f0');
                setTimeout(() => centerMsg.style.opacity = 0, 1500);
            }
        }
    }

    draw() {
        this.trail.forEach((t) => {
            ctx.fillStyle = `rgba(0, 255, 255, ${t.alpha})`;
            ctx.fillRect(t.x - cameraX, t.y, this.w, this.h);
            t.alpha -= 0.1;
        });
        this.trail = this.trail.filter(t => t.alpha > 0);

        ctx.fillStyle = this.isDashing ? '#fff' : this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x - cameraX, this.y, this.w, this.h);
        ctx.shadowBlur = 0;

        if (this.isAttacking) {
            ctx.save();
            ctx.translate(this.x - cameraX + this.w/2, this.y + this.h/2);
            if (!this.facingRight) ctx.scale(-1, 1);
            ctx.beginPath();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.moveTo(10, -20);
            ctx.quadraticCurveTo(40, 0, 10, 40);
            ctx.stroke();
            ctx.restore();
        }
    }
}
