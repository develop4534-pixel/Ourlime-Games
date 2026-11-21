(function () {
  'use strict';

  class DarkTitan {
    constructor(worldWidth) {
      this.name = 'DARK TITAN';
      this.x = worldWidth - 800;
      this.y = 255;
      this.width = 180;
      this.height = 190;
      this.maxHealth = 100;
      this.health = 100;
      this.phase = 1;
      this.time = 0;
      this.attackTimer = 0;
      this.damageCooldown = 0;
      this.hitFlash = 0;
      this.defeated = false;
      this.projectiles = [];
      this.shockwaves = [];
      this.onDefeated = null;
    }

    update(dt, player) {
      if (this.defeated) return;
      dt = Math.min(Math.max(dt || 0, 0), 0.05);
      this.time += dt;
      this.attackTimer += dt;
      this.damageCooldown = Math.max(0, this.damageCooldown - dt);
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.phase = this.health <= 30 ? 3 : this.health <= 65 ? 2 : 1;
      this.y = 255 + Math.sin(this.time * 2) * 10;

      const interval = [0, 2.7, 1.9, 1.2][this.phase];
      if (this.attackTimer >= interval) {
        this.attackTimer = 0;
        this.attack(player);
      }

      for (const projectile of this.projectiles) {
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        projectile.life -= dt;
        projectile.warning = Math.max(0, (projectile.warning || 0) - dt);
      }
      this.projectiles = this.projectiles.filter(projectile => projectile.life > 0);

      for (const wave of this.shockwaves) {
        wave.radius += wave.speed * dt;
        wave.life -= dt;
      }
      this.shockwaves = this.shockwaves.filter(wave => wave.life > 0);

      if (player) this.checkPlayerAttack(player);
      if (this.health <= 0) this.die();
    }

    attack(player) {
      const type = Math.floor(Math.random() * 3);
      if (type === 0) this.fireball(player);
      else if (type === 1) this.groundSmash();
      else this.lightningAttack(player);
    }

    fireball(player) {
      const targetX = player ? player.x + player.w / 2 : this.x - 250;
      const targetY = player ? player.y + player.h / 2 : this.y + 90;
      const startX = this.x;
      const startY = this.y + 82;
      const dx = targetX - startX;
      const dy = targetY - startY;
      const distance = Math.hypot(dx, dy) || 1;
      const speed = 300 + this.phase * 90;
      this.projectiles.push({
        x: startX,
        y: startY,
        vx: dx / distance * speed,
        vy: dy / distance * speed,
        radius: 17,
        life: 5,
        type: 'fire'
      });
    }

    groundSmash() {
      this.shockwaves.push({
        x: this.x + this.width / 2,
        y: this.y + this.height,
        radius: 12,
        speed: 330 + this.phase * 95,
        life: 2
      });
    }

    lightningAttack(player) {
      this.projectiles.push({
        x: player ? player.x + player.w / 2 : this.x - 180,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 30,
        life: 1.1,
        warning: 0.45,
        type: 'lightning'
      });
    }

    checkPlayerAttack(player) {
      const playerBottom = player.y + player.h;
      const horizontal = player.x + player.w > this.x + 22 &&
        player.x < this.x + this.width - 22;
      const descending = player.vy > 0;
      if (horizontal && descending &&
          playerBottom >= this.y && playerBottom <= this.y + 30 &&
          this.damageCooldown <= 0) {
        if (this.takeDamage(10)) {
          this.damageCooldown = 0.65;
          player.vy = -480;
        }
      }
    }

    takeDamage(amount = 10, ignoreCooldown = false) {
      if (this.defeated || (!ignoreCooldown && this.damageCooldown > 0)) return false;
      this.health = Math.max(0, this.health - amount);
      this.hitFlash = 0.2;
      this.damageCooldown = ignoreCooldown ? 0.12 : 0.35;
      if (this.health <= 0) this.die();
      return true;
    }

    isPlayerHit(player) {
      if (this.defeated || !player) return false;
      const left = player.x;
      const right = left + player.w;
      const top = player.y;
      const bottom = top + player.h;
      const overlapsCircle = (x, y, radius) => {
        const nx = Math.max(left, Math.min(x, right));
        const ny = Math.max(top, Math.min(y, bottom));
        return Math.hypot(x - nx, y - ny) < radius;
      };

      if (this.projectiles.some(projectile => {
        if (projectile.type === 'lightning') {
          return projectile.warning <= 0 && Math.abs((left + right) / 2 - projectile.x) < projectile.radius;
        }
        return overlapsCircle(projectile.x, projectile.y, projectile.radius);
      })) return true;

      return this.shockwaves.some(wave =>
        Math.abs((left + right) / 2 - wave.x) < wave.radius + player.w / 2 &&
        bottom >= wave.y - 36 && top <= wave.y + 8
      );
    }

    die() {
      if (this.defeated) return;
      this.defeated = true;
      this.projectiles = [];
      this.shockwaves = [];
      if (typeof this.onDefeated === 'function') this.onDefeated();
    }

    drawMonster(ctx) {
      const bob = Math.sin(this.time * 3) * 4;
      ctx.save();
      ctx.translate(this.x + this.width / 2, this.y + bob);

      ctx.fillStyle = '#21102f';
      ctx.beginPath();
      ctx.moveTo(-50, 18);
      ctx.lineTo(-82, -34);
      ctx.lineTo(-31, -15);
      ctx.moveTo(50, 18);
      ctx.lineTo(82, -34);
      ctx.lineTo(31, -15);
      ctx.fill();

      ctx.fillStyle = '#41204f';
      ctx.fillRect(-88, 75, 38, 72);
      ctx.fillRect(50, 75, 38, 72);
      ctx.fillStyle = '#1f102a';
      ctx.beginPath();
      ctx.arc(-70, 150, 23, 0, Math.PI * 2);
      ctx.arc(70, 150, 23, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.hitFlash > 0 ? '#fff' : '#52246b';
      ctx.beginPath();
      ctx.roundRect(-66, 34, 132, 132, 24);
      ctx.fill();
      ctx.fillStyle = '#261630';
      ctx.beginPath();
      ctx.moveTo(-58, 60);
      ctx.lineTo(0, 44);
      ctx.lineTo(58, 60);
      ctx.lineTo(44, 140);
      ctx.lineTo(0, 160);
      ctx.lineTo(-44, 140);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ff31d9';
      ctx.shadowColor = '#ff00cc';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(0, 68);
      ctx.lineTo(18, 98);
      ctx.lineTo(0, 126);
      ctx.lineTo(-18, 98);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#603078';
      ctx.beginPath();
      ctx.arc(0, 18, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff16cf';
      ctx.shadowColor = '#ff00cc';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(-18, 14, 10, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(18, 14, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    draw(ctx, view) {
      const { width, height, scale, cameraX, cameraY } = view;
      if (!this.defeated) {
        ctx.save();
        ctx.translate(width / 2 - cameraX * scale, height * 0.58 - cameraY * scale);
        ctx.scale(scale, scale);
        this.drawMonster(ctx);

        for (const projectile of this.projectiles) {
          if (projectile.type === 'lightning') {
            if (projectile.warning > 0) {
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 22px Arial';
              ctx.fillText('⚡', projectile.x - 10, 110);
            } else {
              ctx.fillStyle = 'rgba(255,255,255,.7)';
              ctx.fillRect(projectile.x - 18, 0, 36, 640);
              ctx.strokeStyle = '#d66bff';
              ctx.lineWidth = 7;
              ctx.beginPath();
              ctx.moveTo(projectile.x, 0);
              ctx.lineTo(projectile.x - 14, 190);
              ctx.lineTo(projectile.x + 15, 320);
              ctx.lineTo(projectile.x, 640);
              ctx.stroke();
            }
          } else {
            ctx.fillStyle = '#ff4b00';
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffeb39';
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, projectile.radius * 0.45, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        for (const wave of this.shockwaves) {
          ctx.strokeStyle = '#ff572c';
          ctx.lineWidth = 7;
          ctx.globalAlpha = Math.min(1, wave.life);
          ctx.beginPath();
          ctx.ellipse(wave.x, wave.y, wave.radius, 16, 0, Math.PI, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      const uiScale = Math.max(scale, 0.85);
      const barWidth = Math.min(330 * uiScale, width * 0.86);
      const barHeight = 24 * uiScale;
      const barX = (width - barWidth) / 2;
      const barY = 28 * uiScale;
      ctx.fillStyle = '#241326';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = this.health > 60 ? '#36e05a' : this.health > 30 ? '#ffba25' : '#ff263c';
      ctx.fillRect(barX + 4 * uiScale, barY + 4 * uiScale,
        Math.max(0, (barWidth - 8 * uiScale) * this.health / this.maxHealth),
        barHeight - 8 * uiScale);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = `bold ${18 * uiScale}px Arial`;
      ctx.fillText(`DARK TITAN - ${this.health} HP`, width / 2, barY - 5 * uiScale);

      if (this.defeated) {
        ctx.fillStyle = 'rgba(10,5,25,.78)';
        ctx.fillRect(0, 0, width, height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffe44c';
        ctx.font = `bold ${48 * uiScale}px Arial`;
        ctx.fillText('VICTORY!', width / 2, height / 2 - 25 * uiScale);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${21 * uiScale}px Arial`;
        ctx.fillText('DARK TITAN DEFEATED', width / 2, height / 2 + 20 * uiScale);
      }
    }
  }

  window.DarkTitan = DarkTitan;
})();
