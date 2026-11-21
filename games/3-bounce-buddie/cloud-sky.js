(function () {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smoothstep = (edge0, edge1, value) => {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const SPRITES = [
    { crop: [348, 58, 130, 84], x: 0.67, y: 0.16, size: 0.23, speed: 0.12, opacity: 0.96 },
    { crop: [185, 145, 110, 105], x: 0.34, y: 0.27, size: 0.24, speed: 0.09, opacity: 0.83 },
    { crop: [296, 162, 100, 125], x: 0.48, y: 0.35, size: 0.19, speed: 0.11, opacity: 0.88 },
    { crop: [502, 135, 160, 130], x: 0.95, y: 0.24, size: 0.24, speed: 0.08, opacity: 0.84 },
    { crop: [172, 137, 142, 150], x: 0.5, y: 0.56, size: 0.42, speed: 0.075, opacity: 0.9 },
    { crop: [445, 115, 233, 260], x: 0.84, y: 0.42, size: 0.43, speed: 0.062, opacity: 0.92 },
    { crop: [0, 195, 205, 257], x: 0.12, y: 0.78, size: 0.48, speed: 0.042, opacity: 0.96 },
    { crop: [320, 300, 155, 152], x: 0.74, y: 0.76, size: 0.25, speed: 0.064, opacity: 0.9 },
    { crop: [168, 280, 300, 172], x: 0.5, y: 0.89, size: 0.58, speed: 0.07, opacity: 0.96 },
    { crop: [30, 250, 116, 118], x: 0.08, y: 0.58, size: 0.2, speed: 0.095, opacity: 0.76 },
    { crop: [220, 250, 120, 118], x: 0.34, y: 0.61, size: 0.22, speed: 0.07, opacity: 0.74 },
    { crop: [548, 208, 125, 125], x: 0.91, y: 0.55, size: 0.21, speed: 0.055, opacity: 0.78 },
    { crop: [386, 320, 140, 120], x: 0.6, y: 0.23, size: 0.18, speed: 0.09, opacity: 0.72 }
  ];

  function makeCloudSprite(image, crop) {
    const [sourceX, sourceY, width, height] = crop;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, sourceX, sourceY, width, height, 0, 0, width, height);

    const pixels = context.getImageData(0, 0, width, height);
    const featherX = Math.min(width * 0.3, height * 0.42);
    const featherY = Math.min(height * 0.22, width * 0.3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const red = pixels.data[index];
        const green = pixels.data[index + 1];
        const blue = pixels.data[index + 2];
        const greenBias = green - red;
        const blueBias = blue - red;
        const blueShift = blue - green;
        const cyanHue = 1 - smoothstep(26, 60, blueShift);
        const sky = smoothstep(14, 58, greenBias) *
          smoothstep(20, 70, blueBias) * cyanHue;
        const edgeX = Math.min(x, width - 1 - x);
        const edgeY = Math.min(y, height - 1 - y);
        const cropFade = smoothstep(0, featherX, edgeX) *
          smoothstep(0, featherY, edgeY);
        pixels.data[index + 3] = Math.round(pixels.data[index + 3] * (1 - sky) * cropFade);
      }
    }

    context.putImageData(pixels, 0, 0);
    return canvas;
  }

  window.RealisticClouds = class RealisticClouds {
    constructor() {
      this.reduceMotion = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.sprites = SPRITES.map(sprite => ({ ...sprite, image: null }));
      this.image = new Image();
      this.image.onload = () => {
        this.sprites.forEach(sprite => {
          sprite.image = makeCloudSprite(this.image, sprite.crop);
        });
      };
      this.image.onerror = () => {
        console.error('Unable to load cloud.jpg for Sky Adventure.');
      };
      this.image.src = 'cloud.jpg';
    }

    draw(context, width, height, time, opacityScale = 1) {
      const unit = Math.min(width, height);
      for (const cloud of this.sprites) {
        if (!cloud.image) continue;

        const drawWidth = unit * cloud.size * 1.15;
        const drawHeight = drawWidth * cloud.image.height / cloud.image.width;
        const travel = width + drawWidth;
        const initialX = width * cloud.x + drawWidth / 2;
        const distance = this.reduceMotion ? 0 : time * cloud.speed * unit;
        const centerX = ((initialX + distance) % travel + travel) % travel - drawWidth / 2;
        const centerY = height * cloud.y;

        context.save();
        context.globalAlpha = cloud.opacity * opacityScale;
        for (const wrappedX of [centerX - travel, centerX, centerX + travel]) {
          context.drawImage(
            cloud.image,
            wrappedX - drawWidth / 2,
            centerY - drawHeight / 2,
            drawWidth,
            drawHeight
          );
        }
        context.restore();
      }
    }
  };
})();
