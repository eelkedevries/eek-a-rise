/** The display mapping, the fixation cross and per-frame measurements (specification: Frames). */

/** round(clamp(v, 0, 1) · 255) into out; returns the number of values outside [0, 1]. */
export function toUint8(frame: Float64Array, out: Uint8Array): number {
  let clipped = 0;
  for (let i = 0; i < frame.length; i++) {
    const v = frame[i];
    if (v < 0 || v > 1) clipped++;
    out[i] = Math.round(Math.min(1, Math.max(0, v)) * 255);
  }
  return clipped;
}

/** Pixels of the optional fixation cross: arms round(0.015 S) px from the centre, 2 px wide. */
export function fixationMask(size: number): Uint8Array {
  const mask = new Uint8Array(size * size);
  const c = Math.floor(size / 2);
  const arm = Math.round(0.015 * size);
  for (let d = -arm; d <= arm; d++) {
    for (const t of [c - 1, c]) {
      mask[t * size + c + d] = 1;
      mask[(c + d) * size + t] = 1;
    }
  }
  return mask;
}

export function drawFixation(pixels: Uint8Array, mask: Uint8Array): void {
  for (let i = 0; i < mask.length; i++) if (mask[i]) pixels[i] = 0;
}

export interface FrameStats {
  /** Mean of the 8-bit values / 255. */
  mean: number;
  /** Population standard deviation of the 8-bit values / 255. */
  rms: number;
  /** Pearson correlation with the source image of the frame's cycle. */
  similarity: number;
  /** Share of the frame's values outside [0, 1] before the display mapping. */
  clipped: number;
}

/** Measures an 8-bit frame against its source, leaving out the pixels under `exclude`. */
export function frameStats(pixels: Uint8Array, source: Float64Array, clippedCount: number, exclude?: Uint8Array): FrameStats {
  let n = 0, sx = 0, sy = 0;
  for (let i = 0; i < pixels.length; i++) {
    if (exclude?.[i]) continue;
    n++;
    sx += pixels[i] / 255;
    sy += source[i];
  }
  const mx = sx / n, my = sy / n;
  let vx = 0, vy = 0, cxy = 0;
  for (let i = 0; i < pixels.length; i++) {
    if (exclude?.[i]) continue;
    const dx = pixels[i] / 255 - mx, dy = source[i] - my;
    vx += dx * dx;
    vy += dy * dy;
    cxy += dx * dy;
  }
  return { mean: mx, rms: Math.sqrt(vx / n), similarity: cxy / Math.sqrt(vx * vy), clipped: clippedCount / pixels.length };
}

export function mean(a: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
}

/** Population standard deviation (RMS contrast of an image in [0, 1]). */
export function rms(a: ArrayLike<number>): number {
  const m = mean(a);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2;
  return Math.sqrt(s / a.length);
}

export function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const ma = mean(a), mb = mean(b);
  let va = 0, vb = 0, c = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    va += da * da;
    vb += db * db;
    c += da * db;
  }
  return c / Math.sqrt(va * vb);
}
