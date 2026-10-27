import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decode } from 'fast-png';
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

/** The demo faces, decoded from the committed PNGs and resampled by area averaging to size × size. */
export function demoFaces(names: string[], size: number): Float64Array[] {
  return names.map((name) => {
    const png = decode(readFileSync(fileURLToPath(new URL(`../../public/examples/faces/${name}.png`, import.meta.url))));
    const src = png.data as Uint8Array;
    const step = png.channels;
    const w = png.width, h = png.height;
    const out = new Float64Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const y0 = Math.floor((y * h) / size), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / size));
        const x0 = Math.floor((x * w) / size), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / size));
        let s = 0;
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) s += src[(yy * w + xx) * step];
        out[y * size + x] = s / ((y1 - y0) * (x1 - x0) * 255);
      }
    }
    return out;
  });
}

export const DEMO_SEQUENCE = [
  'ida_eyes_squeezed', 'ida_eyes_wide', 'ida_eyes_closed',
  'ben_eyes_left-closed', 'ben_eyes_squeezed', 'ben_eyes_look-right',
  'cas_eyes_right-closed', 'cas_eyes_closed', 'cas_eyes_look-left',
];
