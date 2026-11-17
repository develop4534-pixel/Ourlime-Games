(function () {
  'use strict';

  const THEMES = {
    3: {
      name: 'Volcan Infernal',
      colors: ['#260d24', '#a42d26', '#ff8b38'],
      platform: '#74382c',
      accent: '#ffac35',
      hazards: ['fire', 'rock', 'roller', 'thorns', 'axe', 'cutter']
    },
    4: {
      name: 'Bosque Maldito',
      colors: ['#071d20', '#17543e', '#81ad46'],
      platform: '#346c4a',
      accent: '#c4e86d',
      hazards: ['swamp', 'thorns', 'tree', 'rock', 'axe', 'fire']
    },
    5: {
      name: 'Fabrica de la Muerte',
      colors: ['#1b202b', '#444454', '#7b7882'],
      platform: '#55516c',
      accent: '#ffbd42',
      hazards: ['roller', 'axe', 'cutter', 'crusher', 'fire']
    },
    6: {
      name: 'Montana Congelada',
      colors: ['#092844', '#2775a4', '#b9edff'],
      platform: '#438caf',
      accent: '#e1fbff',
      hazards: ['icicle', 'rock', 'thorns', 'ice', 'roller']
    },
    7: {
      name: 'Dimension del Caos',
      colors: ['#150b35', '#53218b', '#b84bd4'],
      platform: '#7136a1',
      accent: '#ff62e7',
      hazards: ['lightning', 'cutter', 'fire', 'roller', 'axe', 'crusher']
    }
  };

  const random = seed => {
    let value = Math.sin(seed * 127.1) * 43758.5453;
    return value - Math.floor(value);
  };

  class ExtremeWorld {
    constructor(number) {
      this.number = number;
      this.config = THEMES[number];
      if (!this.config) throw new Error('Unsupported world: ' + number);

      this.name = 'WORLD ' + number + ' - ' + this.config.name;
      this.width = 10000;
      this.time = 0;
      this.completed = false;
      this.platforms = [];
      this.movingPlatforms = [];
      this.hazards = [];
      this.stars = [];
      this.decorations = [];
      this.generate();
    }

    generate() {
      this.platforms.push({ x: 0, y: 420, w: 240, h: 24 });
      let previous = this.platforms[0];

      for (let i = 0; i < 36; i++) {
        const x = 300 + i * 260;
        const y = Math.max(245, Math.min(405, 335 + Math.sin(i * 1.7 + this.number) * 68));
        const w = 125 + random(i + this.number * 100) * 70;
        const platform = { x, y, w, h: 22 };
        this.platforms.push(platform);

        if (i % 3 === 1) {
          this.movingPlatforms.push({
            x: x + w + 35,
            y: y - 60,
            baseY: y - 60,
            w: 100,
            h: 18,
            range: 35 + random(i + 20) * 32,
            speed: 1.35 + this.number * 0.13,
            phase: i,
            moving: true
          });
        }

        if (i % 2 === 1 && i < 34) {
          this.hazards.push(this.makeHazard(i, platform));
        }

        if (i % 2 === 0) {
          this.stars.push({
            x: (previous.x + previous.w + platform.x) / 2,
            y: Math.min(previous.y, platform.y) - 92,
            phase: i,
            g: 0
          });
        }
        previous = platform;
      }

      this.platforms.push({
        x: this.width - 450,
        y: 350,
        w: 450,
        h: 28,
        fin: true
      });

      for (let i = 0; i < 52; i++) {
        this.decorations.push({
          x: i * 205 + random(i + this.number * 13) * 120,
          y: 65 + random(i + 90) * 300,
          size: 20 + random(i + 160) * 50,
          phase: i
        });
      }
    }

    makeHazard(index, platform) {
      const type = this.config.hazards[index % this.config.hazards.length];
      const sizes = {
        fire: [44, 58], rock: [48, 42], roller: [54, 46],
        thorns: [74, 34], axe: [42, 72], cutter: [52, 52],
        swamp: [90, 28], tree: [58, 92], icicle: [36, 68],
        ice: [82, 20], lightning: [55, 96], crusher: [62, 78]
      };
      const [w, h] = sizes[type] || [48, 44];
      return {
        type,
        x: platform.x + (platform.w - w) / 2,
        y: platform.y - h,
        baseX: platform.x + (platform.w - w) / 2,
        baseY: platform.y - h,
        w,
        h,
        radius: Math.min(w, h) * 0.42,
        phase: index,
        speed: 1.4 + this.number * 0.16,
        range: type === 'axe' || type === 'crusher' ? 42 : 24,
        rotation: 0,
        active: true
      };
    }

    createLevel() {
      const pads = this.platforms.map(platform => ({
        x: platform.x + platform.w / 2,
        y0: platform.y,
        y: platform.y,
        w: platform.w,
        a: 0,
        f: 0,
        ph: 0,
        fin: !!platform.fin
      }));

      for (const platform of this.movingPlatforms) {
        pads.push({
          x: platform.x + platform.w / 2,
          y0: platform.baseY,
          y: platform.baseY,
          w: platform.w,
          a: platform.range,
          f: platform.speed,
          ph: platform.phase,
          moving: true,
          fin: false
        });
      }

      pads.sort((a, b) => a.x - b.x);
      return { pads, stars: this.stars, hazards: this.hazards, world: this };
    }

    update(dt) {
      dt = Math.min(Math.max(dt || 0, 0), 0.05);
      this.time += dt;

      for (const platform of this.movingPlatforms) {
        platform.y = platform.baseY +
          Math.sin(this.time * platform.speed + platform.phase) * platform.range;
      }

      for (const hazard of this.hazards) {
        hazard.rotation += dt * hazard.speed * 3;
        hazard.x = hazard.baseX;
        hazard.y = hazard.baseY;
        if (hazard.type === 'roller' || hazard.type === 'cutter') {
          hazard.x += Math.sin(this.time * hazard.speed + hazard.phase) * 18;
        }
        if (hazard.type === 'axe' || hazard.type === 'crusher' || hazard.type === 'rock') {
          hazard.y += Math.sin(this.time * hazard.speed + hazard.phase) * hazard.range;
        }
        hazard.active = hazard.type !== 'lightning' && hazard.type !== 'fire' ||
          Math.sin(this.time * hazard.speed + hazard.phase) > -0.45;
      }
    }

    getPlatforms() {
      return [...this.platforms, ...this.movingPlatforms];
    }

    getHazards() {
      return this.hazards.filter(hazard => hazard.active);
    }

    isPlayerHit(player) {
      if (!player) return false;
      const px = player.x;
      const py = player.y;
      const pw = player.w || player.width || 48;
      const ph = player.h || player.height || 48;
      const radius = Math.min(pw, ph) * 0.32;

      return this.getHazards().some(hazard => {
        if (hazard.type === 'roller' || hazard.type === 'cutter') {
          const cx = hazard.x + hazard.w / 2;
          const cy = hazard.y + hazard.h / 2;
          const nx = Math.max(px, Math.min(cx, px + pw));
          const ny = Math.max(py, Math.min(cy, py + ph));
          return Math.hypot(cx - nx, cy - ny) < hazard.radius + radius;
        }

        const dx = Math.max(hazard.x - (px + pw), px - (hazard.x + hazard.w), 0);
        const dy = Math.max(hazard.y - (py + ph), py - (hazard.y + hazard.h), 0);
        return Math.hypot(dx, dy) < radius;
      });
    }

    draw(ctx, view) {
      const { width, height, scale, cameraX, cameraY } = view;
      const xOnScreen = x => (x - cameraX) * scale + width / 2;
      const yOnScreen = y => (y - cameraY) * scale + height * 0.58;
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, this.config.colors[0]);
      gradient.addColorStop(0.58, this.config.colors[1]);
      gradient.addColorStop(1, this.config.colors[2]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (const decoration of this.decorations) {
        const px = ((decoration.x - cameraX * 0.18) * scale) % (width + 200 * scale);
        const x = px < -100 * scale ? px + width + 200 * scale : px;
        const y = decoration.y * scale;
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = this.config.accent;
        ctx.beginPath();
        ctx.arc(x, y, decoration.size * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (let i = 0; i < 30; i++) {
        const x = ((i * 97 - this.time * 50 - cameraX * 0.08) * scale % width + width) % width;
        const y = ((i * 53 + this.time * 70) * scale) % height;
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = this.number === 6 ? '#fff' : this.config.accent;
        ctx.beginPath();
        ctx.arc(x, y, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const drawPlatform = platform => {
        const x = xOnScreen(platform.x);
        const y = yOnScreen(platform.y);
        const w = platform.w * scale;
        const h = platform.h * scale;
        ctx.fillStyle = '#21132e';
        ctx.fillRect(x + 5 * scale, y + h, Math.max(0, w - 10 * scale), 35 * scale);
        ctx.fillStyle = platform.moving ? '#3c9caa' : this.config.platform;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = this.config.accent;
        ctx.fillRect(x, y, w, Math.max(3 * scale, h * 0.18));
        ctx.strokeStyle = this.config.accent;
        ctx.lineWidth = Math.max(1, 2 * scale);
        ctx.strokeRect(x, y, w, h);
      };

      for (const platform of this.platforms) drawPlatform(platform);
      for (const platform of this.movingPlatforms) drawPlatform(platform);

      for (const hazard of this.hazards) {
        if (!hazard.active) continue;
        const x = xOnScreen(hazard.x);
        const y = yOnScreen(hazard.y);
        const w = hazard.w * scale;
        const h = hazard.h * scale;
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(hazard.type === 'roller' || hazard.type === 'cutter' ? hazard.rotation : 0);
        if (hazard.type === 'fire') {
          ctx.fillStyle = '#ff4c18';
          ctx.shadowColor = '#ff3b00';
          ctx.shadowBlur = 16 * scale;
          ctx.beginPath();
          ctx.moveTo(-w * 0.38, h / 2);
          ctx.quadraticCurveTo(-w * 0.45, -h * 0.2, 0, -h / 2);
          ctx.quadraticCurveTo(w * 0.4, -h * 0.1, w * 0.38, h / 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (hazard.type === 'swamp' || hazard.type === 'ice') {
          ctx.fillStyle = hazard.type === 'ice' ? '#9be8ff' : '#557c24';
          ctx.beginPath();
          ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (hazard.type === 'rock' || hazard.type === 'roller' || hazard.type === 'cutter') {
          ctx.fillStyle = hazard.type === 'rock' ? '#786d68' : '#c4ccd4';
          ctx.strokeStyle = '#343544';
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.arc(0, 0, hazard.radius * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (hazard.type !== 'rock') {
            ctx.strokeStyle = '#59616d';
            for (let i = 0; i < 4; i++) {
              ctx.rotate(Math.PI / 4);
              ctx.beginPath();
              ctx.moveTo(0, -hazard.radius * scale);
              ctx.lineTo(0, hazard.radius * scale);
              ctx.stroke();
            }
          }
        } else if (hazard.type === 'axe') {
          ctx.fillStyle = '#68462c';
          ctx.fillRect(-3 * scale, -h / 2, 6 * scale, h);
          ctx.fillStyle = '#b7c1ca';
          ctx.fillRect(0, -h * 0.35, w * 0.42, h * 0.28);
        } else if (hazard.type === 'lightning') {
          ctx.fillStyle = '#fff';
          ctx.shadowColor = '#db72ff';
          ctx.shadowBlur = 14 * scale;
          ctx.beginPath();
          ctx.moveTo(5 * scale, -h / 2);
          ctx.lineTo(-w * 0.28, 0);
          ctx.lineTo(0, 0);
          ctx.lineTo(-w * 0.18, h / 2);
          ctx.lineTo(w * 0.35, -h * 0.08);
          ctx.lineTo(w * 0.05, -h * 0.08);
          ctx.closePath();
          ctx.fill();
        } else if (hazard.type === 'thorns' || hazard.type === 'icicle') {
          ctx.fillStyle = hazard.type === 'icicle' ? '#e2fbff' : '#b8d83e';
          ctx.beginPath();
          const direction = hazard.type === 'icicle' ? 1 : -1;
          for (let i = 0; i < 5; i++) {
            const bx = -w / 2 + i * w / 4;
            ctx.moveTo(bx - w / 10, -direction * h / 2);
            ctx.lineTo(bx, direction * h / 2);
            ctx.lineTo(bx + w / 10, -direction * h / 2);
          }
          ctx.fill();
        } else {
          ctx.fillStyle = '#44434e';
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.fillStyle = this.config.accent;
          for (let i = -1; i <= 1; i++) ctx.fillRect(i * w / 4, h / 4, 5 * scale, h / 4);
        }
        ctx.restore();
      }

      for (const star of this.stars) {
        if (star.g) continue;
        const x = xOnScreen(star.x);
        const y = yOnScreen(star.y + Math.sin(this.time * 5 + star.phase) * 6);
        ctx.fillStyle = '#ffe32d';
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 12 * scale;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = i * Math.PI / 5 - Math.PI / 2;
          const radius = (i % 2 === 0 ? 14 : 7) * scale;
          const px = x + Math.cos(angle) * radius;
          const py = y + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const finish = this.platforms[this.platforms.length - 1];
      const fx = xOnScreen(finish.x + 25);
      const fy = yOnScreen(finish.y);
      ctx.fillStyle = '#fff';
      ctx.fillRect(fx, fy - 90 * scale, 5 * scale, 90 * scale);
      ctx.fillStyle = '#ff4d43';
      ctx.beginPath();
      ctx.moveTo(fx + 5 * scale, fy - 90 * scale);
      ctx.lineTo(fx + 55 * scale, fy - 72 * scale);
      ctx.lineTo(fx + 5 * scale, fy - 54 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${14 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', xOnScreen(finish.x + finish.w / 2), fy + 26 * scale);
    }
  }

  window.World3 = class World3 extends ExtremeWorld {
    constructor() { super(3); }
  };
  window.World4 = class World4 extends ExtremeWorld {
    constructor() { super(4); }
  };
  window.World5 = class World5 extends ExtremeWorld {
    constructor() { super(5); }
  };
  window.World6 = class World6 extends ExtremeWorld {
    constructor() { super(6); }
  };
  window.World7 = class World7 extends ExtremeWorld {
    constructor() { super(7); }
  };
})();
