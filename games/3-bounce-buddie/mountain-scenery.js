(function () {
  'use strict';

  const noise = (index, seed) => {
    const value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };

  class MountainScenery {
    constructor() {
      const texture = document.createElement('canvas');
      texture.width = 96;
      texture.height = 96;
      const textureContext = texture.getContext('2d');
      for (let i = 0; i < 420; i++) {
        const x = noise(i, 17) * texture.width;
        const y = noise(i, 29) * texture.height;
        const light = i % 3 === 0;
        textureContext.fillStyle = light ? 'rgba(238,232,185,.2)' : 'rgba(26,52,39,.14)';
        textureContext.fillRect(x, y, 1 + noise(i, 43) * 2.5, 1 + noise(i, 53) * 2);
      }
      this.texture = texture;
    }

    draw(ctx, width, height, time, cameraX, scale) {
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, '#9ed3df');
      sky.addColorStop(0.48, '#d7e9d7');
      sky.addColorStop(0.76, '#f2e7b7');
      sky.addColorStop(1, '#c9d58a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      const sunX = width * 0.075;
      const sunY = height * 0.24;
      const sunlight = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, width * 0.5);
      sunlight.addColorStop(0, 'rgba(255,249,210,.94)');
      sunlight.addColorStop(0.15, 'rgba(255,235,174,.43)');
      sunlight.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sunlight;
      ctx.fillRect(0, 0, width, height * 0.82);

      this.drawRidge(ctx, width, height, cameraX, scale, {
        base: 0.68, peak: 0.37, step: 0.3, factor: 0.025, seed: 2,
        colors: ['#9bb8ae', '#789991', '#d2ded0'], snow: true
      });
      this.drawRidge(ctx, width, height, cameraX, scale, {
        base: 0.77, peak: 0.31, step: 0.34, factor: 0.065, seed: 8,
        colors: ['#536f5f', '#385a4b', '#a8bd87']
      });

      this.drawValley(ctx, width, height, cameraX, scale, time);
      this.drawTrees(ctx, width, height, cameraX, scale);

      const haze = ctx.createLinearGradient(0, height * 0.48, 0, height * 0.82);
      haze.addColorStop(0, 'rgba(234,239,214,0)');
      haze.addColorStop(0.6, 'rgba(234,239,214,.34)');
      haze.addColorStop(1, 'rgba(234,239,214,0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, height * 0.45, width, height * 0.4);
    }

    drawSkyMountains(ctx, width, height, cameraX, scale) {
      this.drawRidge(ctx, width, height, cameraX, scale, {
        base: 0.69, peak: 0.29, step: 0.36, factor: 0.018, seed: 30,
        colors: ['#b4d7e3', '#8eb8ce', '#edf4eb'], snow: true
      });
      this.drawRidge(ctx, width, height, cameraX, scale, {
        base: 0.79, peak: 0.27, step: 0.34, factor: 0.052, seed: 42,
        colors: ['#7898b4', '#566f96', '#dcecf2'], snow: true
      });
      this.drawRidge(ctx, width, height, cameraX, scale, {
        base: 0.92, peak: 0.2, step: 0.48, factor: 0.1, seed: 54,
        colors: ['#657394', '#465475', '#d2e7ee'], snow: true
      });

      const haze = ctx.createLinearGradient(0, height * 0.53, 0, height * 0.91);
      haze.addColorStop(0, 'rgba(207,235,246,0)');
      haze.addColorStop(0.65, 'rgba(207,235,246,.3)');
      haze.addColorStop(1, 'rgba(207,235,246,0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, height * 0.5, width, height * 0.42);
    }

    drawRidge(ctx, width, height, cameraX, scale, layer) {
      const segment = Math.max(width * layer.step, 130 * scale);
      const offset = cameraX * scale * layer.factor;
      const firstIndex = Math.floor(offset / segment);
      const remainder = offset - firstIndex * segment;
      const start = -remainder - segment;
      const count = Math.ceil(width / segment) + 3;
      const base = height * layer.base;
      const peak = height * layer.peak;

      ctx.save();
      const gradient = ctx.createLinearGradient(0, base - peak, 0, height);
      gradient.addColorStop(0, layer.colors[0]);
      gradient.addColorStop(0.52, layer.colors[1]);
      gradient.addColorStop(1, layer.colors[1]);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(start, height);
      ctx.lineTo(start, base);

      const peaks = [];
      for (let i = 0; i < count; i++) {
        const x = start + i * segment;
        const seedIndex = firstIndex + i - 1;
        const center = x + segment * (0.38 + noise(seedIndex, layer.seed) * 0.24);
        const peakY = base - peak * (0.64 + noise(seedIndex, layer.seed + 1) * 0.36);
        const leftX = center - segment * 0.075;
        const rightX = center + segment * 0.07;
        const leftY = base - peak * (0.5 + noise(seedIndex, layer.seed + 2) * 0.28);
        const rightY = base - peak * (0.42 + noise(seedIndex, layer.seed + 3) * 0.3);
        const shoulderX = center - segment * 0.2;
        const rightShoulderX = center + segment * 0.2;
        const shoulderY = base - peak * (0.2 + noise(seedIndex, layer.seed + 5) * 0.15);
        const rightShoulderY = base - peak * (0.16 + noise(seedIndex, layer.seed + 6) * 0.17);
        ctx.lineTo(x + segment * 0.12, base - peak * (0.09 + noise(seedIndex, layer.seed + 7) * 0.13));
        ctx.lineTo(shoulderX, shoulderY);
        ctx.lineTo(center - segment * 0.13, base - peak * (0.31 + noise(seedIndex, layer.seed + 8) * 0.14));
        ctx.lineTo(leftX, leftY);
        ctx.lineTo(center, peakY);
        ctx.lineTo(rightX, rightY);
        ctx.lineTo(center + segment * 0.13, base - peak * (0.3 + noise(seedIndex, layer.seed + 9) * 0.16));
        ctx.lineTo(rightShoulderX, rightShoulderY);
        ctx.lineTo(x + segment * 0.88, base - peak * (0.08 + noise(seedIndex, layer.seed + 10) * 0.13));
        ctx.lineTo(x + segment, base + (noise(seedIndex, layer.seed + 4) - 0.5) * peak * 0.06);
        peaks.push({
          x: center, y: peakY, base, leftX, leftY, rightX, rightY,
          shoulderX, shoulderY, rightShoulderX, rightShoulderY, segment
        });
      }

      ctx.lineTo(start + count * segment, height);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.clip();
      ctx.globalAlpha = layer.snow ? 0.5 : 0.34;
      ctx.fillStyle = ctx.createPattern(this.texture, 'repeat');
      ctx.fillRect(start, base - peak, width + segment * 2, height - base + peak);
      ctx.restore();

      for (const mountain of peaks) {
        ctx.fillStyle = layer.colors[1];
        ctx.beginPath();
        ctx.moveTo(mountain.x, mountain.y);
        ctx.lineTo(mountain.shoulderX, mountain.shoulderY);
        ctx.lineTo(mountain.leftX, mountain.leftY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = layer.colors[0];
        ctx.beginPath();
        ctx.moveTo(mountain.x, mountain.y);
        ctx.lineTo(mountain.rightX, mountain.rightY);
        ctx.lineTo(mountain.rightShoulderX, mountain.rightShoulderY);
        ctx.closePath();
        ctx.fill();

        if (layer.snow) {
          ctx.fillStyle = layer.colors[2];
          ctx.beginPath();
          ctx.moveTo(mountain.x, mountain.y);
          ctx.lineTo(mountain.x - mountain.segment * 0.055, mountain.y + peak * 0.13);
          ctx.lineTo(mountain.x - mountain.segment * 0.01, mountain.y + peak * 0.09);
          ctx.lineTo(mountain.x + mountain.segment * 0.045, mountain.y + peak * 0.16);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }

    drawValley(ctx, width, height, cameraX, scale, time) {
      const drift = cameraX * scale * 0.12;
      const ground = ctx.createLinearGradient(0, height * 0.64, 0, height);
      ground.addColorStop(0, '#7f9d55');
      ground.addColorStop(0.38, '#658743');
      ground.addColorStop(1, '#354f36');
      ctx.fillStyle = ground;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.79);
      ctx.quadraticCurveTo(width * 0.16 - drift % width, height * 0.66, width * 0.34, height * 0.83);
      ctx.quadraticCurveTo(width * 0.5, height * 0.95, width * 0.68, height * 0.81);
      ctx.quadraticCurveTo(width * 0.88, height * 0.65, width, height * 0.75);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      const sunlitSlope = ctx.createLinearGradient(0, height * 0.7, width, height);
      sunlitSlope.addColorStop(0, 'rgba(202,204,117,.66)');
      sunlitSlope.addColorStop(0.45, 'rgba(142,166,83,.08)');
      sunlitSlope.addColorStop(1, 'rgba(199,195,102,.46)');
      ctx.fillStyle = sunlitSlope;
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.strokeStyle = '#e5d992';
      ctx.lineWidth = Math.max(1, scale * 1.5);
      for (let i = 0; i < 5; i++) {
        const y = height * (0.82 + i * 0.035);
        ctx.beginPath();
        ctx.moveTo(-20, y + Math.sin(time * 0.08 + i) * 2 * scale);
        ctx.quadraticCurveTo(width * 0.48, y + height * 0.06, width + 20, y - height * 0.015);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawTrees(ctx, width, height, cameraX, scale) {
      const spacing = 42 * scale;
      const offset = cameraX * scale * 0.19;
      const first = Math.floor(offset / spacing) - 1;
      const count = Math.ceil(width / spacing) + 3;

      for (let i = 0; i < count; i++) {
        const index = first + i;
        const x = index * spacing - offset;
        const depth = noise(index, 41);
        const y = height * (0.75 + depth * 0.13);
        const size = scale * (9 + depth * 17);
        if (x < -size || x > width + size) continue;

        ctx.globalAlpha = 0.48 + depth * 0.32;
        ctx.fillStyle = depth > 0.62 ? '#294d3a' : '#365c43';
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - size * 0.42, y + size * 0.14);
        ctx.lineTo(x + size * 0.42, y + size * 0.14);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - size * 0.055, y + size * 0.1, size * 0.11, size * 0.27);
      }
      ctx.globalAlpha = 1;
    }
  }

  window.MountainScenery = MountainScenery;
})();
