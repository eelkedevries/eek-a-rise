/**
 * Random Image Structure Evolution (Sadr & Sinha, 2004), as defined in the
 * specification (Domain rules, RISE) and tools/reference/rise_reference.py.
 * Randomness is always passed in as arrays of uniform values in [0, 1).
 */
import { antisymmetric, fromSpectrum, layout, spectrum } from './spectrum';

const TWO_PI = 2 * Math.PI;

/** Angle in [-pi, pi), written with floor so that every IEEE implementation agrees bit for bit. */
export function wrap(x: number): number {
  return x - 2 * Math.PI * Math.floor((x + Math.PI) / (2 * Math.PI));
}

/** Random phase spectrum from a uniform noise image u. */
export function noisePhase(u: Float64Array, height: number, width: number): Float64Array {
  return spectrum(u, height, width).phase;
}

/**
 * Sign rule (specification 0.1): R + 2 pi sign(src) for the pairs with r(k) + r(-k) < 1.
 * Brightens the image corners near weight 0.3 and darkens them near 0.75.
 */
export function riseTarget(src: Float64Array, rand: Float64Array, r: Float64Array, height: number, width: number): Float64Array {
  const { negIndex, selfConjugate } = layout(height, width);
  const target = new Float64Array(src.length);
  for (let i = 0; i < src.length; i++) {
    if (selfConjugate[i]) target[i] = src[i];
    else target[i] = rand[i] + (r[i] + r[negIndex[i]] < 1 ? TWO_PI * Math.sign(src[i]) : 0);
  }
  return antisymmetric(target, height, width);
}

/**
 * Circular target (the default): each component travels the shorter way round
 * the circle from the noise phase to the source phase; the pairs with
 * r(k) + r(-k) < 1 add one full turn, positive where r(k) < r(-k). The expected
 * frame is then the source scaled towards its mean, the same at every position.
 */
export function circularTarget(src: Float64Array, rand: Float64Array, r: Float64Array, height: number, width: number): Float64Array {
  const { negIndex, selfConjugate } = layout(height, width);
  const target = new Float64Array(src.length);
  for (let i = 0; i < src.length; i++) {
    if (selfConjugate[i]) {
      target[i] = src[i];
      continue;
    }
    const rn = r[negIndex[i]];
    const turn = r[i] + rn < 1 ? (r[i] < rn ? TWO_PI : -TWO_PI) : 0;
    target[i] = src[i] + wrap(rand[i] - src[i]) + turn;
  }
  return antisymmetric(target, height, width);
}

export type Method = 'circular' | 'sign';

export const targets: Record<Method, typeof circularTarget> = { circular: circularTarget, sign: riseTarget };

/** Plain interpolation: the sign rule without any extra turn (r = 1 everywhere). */
export function plainTarget(src: Float64Array, rand: Float64Array, height: number, width: number): Float64Array {
  return riseTarget(src, rand, new Float64Array(src.length).fill(1), height, width);
}

/** a = 1: the source image; a = 0: noise with the source's amplitude spectrum. */
export function riseFrame(amp: Float64Array, src: Float64Array, target: Float64Array, a: number, height: number, width: number): Float64Array {
  const phase = new Float64Array(src.length);
  for (let i = 0; i < src.length; i++) phase[i] = a * src[i] + (1.0 - a) * target[i];
  return fromSpectrum(amp, phase, height, width);
}

/** Phase on the path from one noise end-point to the next (t1 is a target from r0 to the next noise). */
export function noisePath(r0: Float64Array, t1: Float64Array, w: number, height: number, width: number): Float64Array {
  const phase = new Float64Array(r0.length);
  for (let i = 0; i < r0.length; i++) phase[i] = (1.0 - w) * r0[i] + w * t1[i];
  return antisymmetric(phase, height, width);
}

/** Mean amplitude spectrum of a set of images. */
export function meanAmplitude(images: readonly Float64Array[], height: number, width: number): Float64Array {
  const amp = new Float64Array(height * width);
  for (const image of images) {
    const { amplitude } = spectrum(image, height, width);
    for (let i = 0; i < amp.length; i++) amp[i] += amplitude[i];
  }
  for (let i = 0; i < amp.length; i++) amp[i] /= images.length;
  return amp;
}

/** Every image gets the set's mean amplitude spectrum and keeps its own phase. */
export function specMatch(images: readonly Float64Array[], height: number, width: number): { images: Float64Array[]; amplitude: Float64Array } {
  const amplitude = meanAmplitude(images, height, width);
  return {
    images: images.map((image) => fromSpectrum(amplitude, spectrum(image, height, width).phase, height, width)),
    amplitude,
  };
}

/** Amplitude spectrum with the given mean (DC) and RMS contrast (Parseval); one linear map for every frame. */
export function normaliseAmplitude(amp: Float64Array, mean: number, rms: number): Float64Array {
  const n = amp.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += amp[i] * amp[i];
  const ac = Math.sqrt(sum - amp[0] * amp[0]);
  const scale = (rms * n) / ac;
  const out = amp.map((v) => v * scale);
  out[0] = mean * n;
  return out;
}
