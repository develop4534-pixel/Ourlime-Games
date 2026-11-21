(function () {
  'use strict';

  const FLOCK = [
    { x: 0.08, y: 0.18, size: 0.022, speed: 0.095, phase: 0.4, color: '#334553', accent: '#e5c27b' },
    { x: 0.3, y: 0.25, size: 0.027, speed: 0.072, phase: 1.8, color: '#49576a', accent: '#dce8df' },
    { x: 0.62, y: 0.15, size: 0.02, speed: 0.11, phase: 3.2, color: '#344454', accent: '#edbc69' },
    { x: 0.88, y: 0.3, size: 0.024, speed: 0.083, phase: 4.7, color: '#526174', accent: '#e1d7bc' }
  ];
  const BIRDS = [
    { start: 3, period: 60, duration: 4.5, dropPhase: 0.36, y: 0.18, size: 0.026, phase: 0.7, color: '#4b515d', accent: '#e8ad75' },
    { start: 6, period: 60, duration: 4.5, dropPhase: 0.34, y: 0.2, size: 0.027, phase: 0.4, color: '#334553', accent: '#e5c27b' },
    { start: 9, period: 60, duration: 4.5, dropPhase: 0.4, y: 0.24, size: 0.028, phase: 2.7, color: '#5d4c40', accent: '#d8c28a' },
    { start: 12, period: 60, duration: 4.5, dropPhase: 0.38, y: 0.18, size: 0.026, phase: 0.9, color: '#514557', accent: '#e9c27a' },
    { start: 15, period: 60, duration: 4.5, dropPhase: 0.44, y: 0.16, size: 0.026, phase: 4.1, color: '#405965', accent: '#aed8d6' },
    { start: 18, period: 60, duration: 4.5, dropPhase: 0.42, y: 0.17, size: 0.026, phase: 1.8, color: '#49576a', accent: '#dce8df' },
    { start: 21, period: 60, duration: 4.5, dropPhase: 0.48, y: 0.21, size: 0.027, phase: 5.5, color: '#604a57', accent: '#f0b5bf' },
    { start: 24, period: 60, duration: 4.5, dropPhase: 0.46, y: 0.22, size: 0.028, phase: 2.1, color: '#5a4940', accent: '#e6b29a' },
    { start: 27, period: 60, duration: 4.5, dropPhase: 0.52, y: 0.19, size: 0.026, phase: 0.2, color: '#58634a', accent: '#e5dc8e' },
    { start: 30, period: 60, duration: 4.5, dropPhase: 0.5, y: 0.23, size: 0.028, phase: 3.2, color: '#344454', accent: '#edbc69' },
    { start: 33, period: 60, duration: 4.5, dropPhase: 0.56, y: 0.24, size: 0.028, phase: 1.3, color: '#4d5366', accent: '#b9c9ee' },
    { start: 36, period: 60, duration: 4.5, dropPhase: 0.54, y: 0.16, size: 0.026, phase: 4, color: '#41556a', accent: '#a4d5e0' },
    { start: 39, period: 60, duration: 4.5, dropPhase: 0.6, y: 0.18, size: 0.026, phase: 2.9, color: '#65503e', accent: '#ecb886' },
    { start: 42, period: 60, duration: 4.5, dropPhase: 0.58, y: 0.19, size: 0.026, phase: 4.7, color: '#526174', accent: '#e1d7bc' },
    { start: 45, period: 60, duration: 4.5, dropPhase: 0.64, y: 0.22, size: 0.028, phase: 4.4, color: '#3f605b', accent: '#a4e0c3' },
    { start: 48, period: 60, duration: 4.5, dropPhase: 0.62, y: 0.24, size: 0.028, phase: 5.2, color: '#655248', accent: '#f1d0a2' },
    { start: 51, period: 60, duration: 4.5, dropPhase: 0.68, y: 0.17, size: 0.026, phase: 5.8, color: '#51485b', accent: '#d3b0eb' },
    { start: 54, period: 60, duration: 4.5, dropPhase: 0.66, y: 0.22, size: 0.027, phase: 2.4, color: '#425a50', accent: '#b5e3a1' },
    { start: 57, period: 60, duration: 4.5, dropPhase: 0.72, y: 0.2, size: 0.027, phase: 3.6, color: '#655746', accent: '#dfc19a' },
    { start: 60, period: 60, duration: 4.5, dropPhase: 0.7, y: 0.19, size: 0.025, phase: 3.7, color: '#445744', accent: '#c5e283' }
  ];
  window.SkyBirds = class SkyBirds {
    constructor() {
      this.reduceMotion = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.hitDrops = new Set();
    }

    reset() {
      this.hitDrops.clear();
    }

    drawBird(context, x, y, size, time, bird, dropping) {
      const flap = this.reduceMotion ? 0 : Math.sin(time * 7 + bird.phase);
      const wingTip = -0.3 - flap * 0.62 + (dropping ? 0.2 : 0);

      context.save();
      context.translate(x, y);
      if (dropping) context.rotate(0.16);
      context.scale(size, size);

      context.fillStyle = bird.color;
      for (const side of [-1, 1]) {
        context.save();
        context.scale(side, 1);
        context.beginPath();
        context.moveTo(-0.15, -0.08);
        context.quadraticCurveTo(-0.64, -0.36 - flap * 0.16, -1.28, wingTip);
        context.quadraticCurveTo(-0.94, 0.37 + flap * 0.14, -0.25, 0.2);
        context.closePath();
        context.fill();

        context.globalAlpha = 0.48;
        context.strokeStyle = bird.accent;
        context.lineWidth = 0.035;
        for (let feather = 0; feather < 3; feather++) {
          context.beginPath();
          context.moveTo(-0.27, 0.06 + feather * 0.035);
          context.quadraticCurveTo(
            -0.72 - feather * 0.08,
            -0.03 + feather * 0.06,
            -1.06 - feather * 0.07,
            wingTip * (0.68 + feather * 0.08)
          );
          context.stroke();
        }
        context.restore();
      }

      context.globalAlpha = 1;
      context.fillStyle = bird.color;
      context.beginPath();
      context.ellipse(0, 0.06, 0.62, 0.25, -0.06, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.arc(0.47, -0.04, 0.22, 0, Math.PI * 2);
      context.fill();

      context.beginPath();
      context.moveTo(-0.48, 0.08);
      context.lineTo(-0.98, -0.13);
      context.lineTo(-0.75, 0.18);
      context.lineTo(-1.02, 0.3);
      context.closePath();
      context.fill();

      context.fillStyle = bird.accent;
      context.beginPath();
      context.moveTo(0.62, -0.06);
      context.lineTo(0.98, 0.02);
      context.lineTo(0.62, 0.08);
      context.closePath();
      context.fill();

      context.fillStyle = '#fff';
      context.beginPath();
      context.arc(0.52, -0.1, 0.045, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#1f2832';
      context.beginPath();
      context.arc(0.535, -0.1, 0.02, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    passAt(gameTime, bird) {
      if (gameTime < bird.start) return null;
      const cycle = Math.floor((gameTime - bird.start) / bird.period);
      const elapsed = gameTime - bird.start - cycle * bird.period;
      if (elapsed < 0 || elapsed > bird.duration) return null;
      return { cycle, phase: elapsed / bird.duration };
    }

    droppingAt(gameTime, width, height, bird) {
      if (gameTime < bird.start + bird.duration * bird.dropPhase) return null;
      const cycle = Math.floor(
        (gameTime - bird.start - bird.duration * bird.dropPhase) / bird.period
      );
      if (cycle < 0) return null;

      const dropTime = bird.start + cycle * bird.period + bird.duration * bird.dropPhase;
      const age = gameTime - dropTime;
      if (age < 0 || age > 2.5) return null;

      const unit = Math.min(width, height);
      const size = unit * bird.size;
      const margin = size * 1.35;
      const x = -margin + (width + margin * 2) * bird.dropPhase;
      const y = height * bird.y +
        Math.sin(dropTime * 0.8 + bird.phase) * unit * 0.012 +
        age * height * 0.48;
      return { id: `${BIRDS.indexOf(bird)}:${cycle}`, x, y, radius: Math.max(5, size * 0.38) };
    }

    hitTest(gameTime, width, height, playerX, playerY, playerRadius) {
      for (const bird of BIRDS) {
        const dropping = this.droppingAt(gameTime, width, height, bird);
        if (!dropping || this.hitDrops.has(dropping.id)) continue;
        if (Math.hypot(playerX - dropping.x, playerY - dropping.y) <= playerRadius + dropping.radius) {
          this.hitDrops.add(dropping.id);
          return true;
        }
      }
      return false;
    }

    drawPoop(context, x, y, radius, time) {
      context.save();
      context.translate(x, y);
      context.rotate(Math.sin(time * 8) * 0.12);
      context.fillStyle = '#70421f';
      context.strokeStyle = '#442817';
      context.lineWidth = Math.max(1, radius * 0.18);
      context.beginPath();
      context.moveTo(-radius * 0.72, -radius * 0.12);
      context.quadraticCurveTo(-radius * 0.62, -radius * 0.82, -radius * 0.08, -radius * 0.68);
      context.quadraticCurveTo(radius * 0.5, -radius * 0.56, radius * 0.52, -radius * 0.08);
      context.quadraticCurveTo(radius * 0.9, radius * 0.38, 0, radius * 0.52);
      context.quadraticCurveTo(-radius * 0.88, radius * 0.42, -radius * 0.72, -radius * 0.12);
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    }

    draw(context, width, height, time, gameTime) {
      const unit = Math.min(width, height);
      for (const bird of FLOCK) {
        const size = unit * bird.size;
        const halfWidth = size * 1.35;
        const travel = width + halfWidth * 2;
        const initialX = width * bird.x + halfWidth;
        const distance = this.reduceMotion ? 0 : time * bird.speed * unit;
        const centerX = ((initialX + distance) % travel + travel) % travel - halfWidth;
        const bob = this.reduceMotion ? 0 : Math.sin(time * 0.8 + bird.phase) * unit * 0.012;
        const centerY = height * bird.y + bob;

        for (const x of [centerX - travel, centerX, centerX + travel]) {
          if (x + halfWidth < 0 || x - halfWidth > width) continue;
          this.drawBird(context, x, centerY, size, time, bird, false);
        }
      }

      for (const bird of BIRDS) {
        const pass = this.passAt(gameTime, bird);
        if (pass) {
          const size = unit * bird.size;
          const margin = size * 1.35;
          const x = -margin + (width + margin * 2) * pass.phase;
          const bob = Math.sin(time * 0.8 + bird.phase) * unit * 0.012;
          this.drawBird(
            context,
            x,
            height * bird.y + bob,
            size,
            time,
            bird,
            Math.abs(pass.phase - bird.dropPhase) < 0.09
          );
        }

        const dropping = this.droppingAt(gameTime, width, height, bird);
        if (dropping) this.drawPoop(context, dropping.x, dropping.y, dropping.radius, time);
      }
    }
  };
})();
