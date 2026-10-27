/**
 * Image preparation (specification: Image preparation): grey (Rec. 601), centre
 * square crop, S × S with high-quality smoothing, values in [0, 1]; and the
 * optional elliptical outline on the mean luminance inside it.
 */
import type { ImageSource } from '../state';

/** Centre and radii as fractions of the image size. */
export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** At 400 px: centre (200, 215), radii (125, 182). */
export const DEFAULT_ELLIPSE: Ellipse = { cx: 0.5, cy: 0.5375, rx: 0.3125, ry: 0.455 };

export const SIZES = [256, 400, 512, 600, 800] as const;

function canvas(size: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/** Draws the centre square of a bitmap at size × size, halving first so large images are smoothed well. */
function drawSquare(bitmap: ImageBitmap | HTMLCanvasElement | OffscreenCanvas, width: number, height: number, size: number): Uint8ClampedArray {
  let side = Math.min(width, height);
  let src: CanvasImageSource = bitmap;
  let sx = (width - side) / 2, sy = (height - side) / 2;
  while (side >= 2 * size) {
    const half = Math.floor(side / 2);
    const step = canvas(half);
    const ctx = step.getContext('2d') as CanvasRenderingContext2D;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, sx, sy, side, side, 0, 0, half, half);
    src = step as CanvasImageSource;
    sx = sy = 0;
    side = half;
  }
  const out = canvas(size);
  const ctx = out.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(src, sx, sy, side, side, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size).data;
}

/** Grey values in [0, 1] at size × size. Transparent pixels are composited on white. */
export function prepareImage(source: ImageSource, size: number): Float64Array {
  if (source.kind === 'grey' && source.size === size) return Float64Array.from(source.grey);
  let rgba: Uint8ClampedArray;
  if (source.kind === 'grey') {
    const c = canvas(source.size);
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    const data = ctx.createImageData(source.size, source.size);
    for (let i = 0; i < source.grey.length; i++) {
      const v = Math.round(Math.min(1, Math.max(0, source.grey[i])) * 255);
      data.data[4 * i] = data.data[4 * i + 1] = data.data[4 * i + 2] = v;
      data.data[4 * i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    rgba = drawSquare(c, source.size, source.size, size);
  } else {
    rgba = drawSquare(source.bitmap, source.bitmap.width, source.bitmap.height, size);
  }
  const grey = new Float64Array(size * size);
  for (let i = 0; i < grey.length; i++) {
    grey[i] = (0.299 * rgba[4 * i] + 0.587 * rgba[4 * i + 1] + 0.114 * rgba[4 * i + 2]) / 255;
  }
  return grey;
}

export function insideEllipse(x: number, y: number, size: number, e: Ellipse): boolean {
  const dx = (x + 0.5 - e.cx * size) / (e.rx * size);
  const dy = (y + 0.5 - e.cy * size) / (e.ry * size);
  return dx * dx + dy * dy <= 1;
}

/** Sets every pixel outside the ellipse to the mean luminance inside it. */
export function applyOutline(image: Float64Array, size: number, e: Ellipse = DEFAULT_ELLIPSE): Float64Array {
  const inside = new Uint8Array(size * size);
  let sum = 0, count = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (insideEllipse(x, y, size, e)) {
        inside[y * size + x] = 1;
        sum += image[y * size + x];
        count++;
      }
    }
  }
  if (count === 0) return Float64Array.from(image);
  const mean = sum / count;
  return image.map((v, i) => (inside[i] ? v : mean));
}
