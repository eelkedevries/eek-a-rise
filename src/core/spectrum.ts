/**
 * Fourier helpers on row-major height × width Float64Arrays, as in
 * tools/reference/rise_reference.py (specification: Fourier conventions).
 */
import { fft2, ifft2 } from './fft';

interface Layout {
  /** negIndex[i] is the index of frequency -k for the bin at index i. */
  negIndex: Int32Array;
  /** One representative of every conjugate pair: index <= index of -k. */
  halfPlane: Uint8Array;
  /** DC and the Nyquist bins: -k = k. */
  selfConjugate: Uint8Array;
}

const layouts = new Map<string, Layout>();

export function layout(height: number, width: number): Layout {
  const key = `${height}x${width}`;
  let found = layouts.get(key);
  if (!found) {
    const n = height * width;
    const negIndex = new Int32Array(n);
    const halfPlane = new Uint8Array(n);
    const selfConjugate = new Uint8Array(n);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const j = ((height - y) % height) * width + ((width - x) % width);
        negIndex[i] = j;
        halfPlane[i] = i <= j ? 1 : 0;
        selfConjugate[i] = i === j ? 1 : 0;
      }
    }
    found = { negIndex, halfPlane, selfConjugate };
    layouts.set(key, found);
  }
  return found;
}

/** neg(a)[y, x] = a[(-y) mod H, (-x) mod W]. */
export function neg(a: Float64Array, height: number, width: number): Float64Array {
  const { negIndex } = layout(height, width);
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[negIndex[i]];
  return out;
}

export function halfPlane(height: number, width: number): Uint8Array {
  return layout(height, width).halfPlane;
}

export function selfConjugate(height: number, width: number): Uint8Array {
  return layout(height, width).selfConjugate;
}

/** Keeps the half-plane value and sets phi(-k) = -phi(k), so the inverse transform is real. */
export function antisymmetric(phase: Float64Array, height: number, width: number, out = new Float64Array(phase.length)): Float64Array {
  const { negIndex, halfPlane: hp } = layout(height, width);
  if (out === phase) throw new Error('antisymmetric cannot work in place');
  for (let i = 0; i < phase.length; i++) out[i] = hp[i] ? phase[i] : -phase[negIndex[i]];
  return out;
}

export interface Spectrum {
  amplitude: Float64Array;
  phase: Float64Array;
}

/** Amplitude and antisymmetric phase of a real image; angle in (-pi, pi] as Math.atan2. */
export function spectrum(image: Float64Array, height: number, width: number): Spectrum {
  const re = Float64Array.from(image);
  const im = new Float64Array(image.length);
  fft2(re, im, height, width);
  const amplitude = new Float64Array(image.length);
  const angle = new Float64Array(image.length);
  for (let i = 0; i < image.length; i++) {
    amplitude[i] = Math.hypot(re[i], im[i]);
    angle[i] = Math.atan2(im[i], re[i]);
  }
  return { amplitude, phase: antisymmetric(angle, height, width) };
}

/** Real part of ifft2(amplitude · exp(i · phase)). */
export function fromSpectrum(amplitude: Float64Array, phase: Float64Array, height: number, width: number): Float64Array {
  const re = new Float64Array(phase.length);
  const im = new Float64Array(phase.length);
  for (let i = 0; i < phase.length; i++) {
    re[i] = amplitude[i] * Math.cos(phase[i]);
    im[i] = amplitude[i] * Math.sin(phase[i]);
  }
  ifft2(re, im, height, width);
  return re;
}
