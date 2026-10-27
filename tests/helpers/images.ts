import { fromSpectrum } from '../../src/core/spectrum';
import { noisePhase } from '../../src/core/rise';
import { Prng } from '../../src/core/prng';

/** A natural-looking test image: 1/f amplitude, random phase, mean 0.5 and SD 0.1. */
export function pinkImage(size: number, seed: number): Float64Array {
  const prng = new Prng(seed);
  const phase = noisePhase(prng.uniformArray(size * size), size, size);
  const amp = new Float64Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fy = Math.min(y, size - y), fx = Math.min(x, size - x);
      amp[y * size + x] = 1 / Math.max(1, Math.hypot(fx, fy));
    }
  }
  const img = fromSpectrum(amp, phase, size, size);
  let m = 0, v = 0;
  for (const p of img) m += p / img.length;
  for (const p of img) v += (p - m) ** 2 / img.length;
  const sd = Math.sqrt(v);
  return img.map((p) => 0.5 + (0.1 * (p - m)) / sd);
}

/** Largest |z| among the 3 × 3 pixels at the four corners (the DFT origin wraps onto all four). */
export function cornerZ(frame: Float64Array, size: number): number {
  let m = 0, v = 0;
  for (const p of frame) m += p / frame.length;
  for (const p of frame) v += (p - m) ** 2 / frame.length;
  const sd = Math.sqrt(v);
  let worst = 0;
  for (const y of [0, 1, 2, size - 3, size - 2, size - 1]) {
    for (const x of [0, 1, 2, size - 3, size - 2, size - 1]) worst = Math.max(worst, Math.abs(frame[y * size + x] - m) / sd);
  }
  return worst;
}
