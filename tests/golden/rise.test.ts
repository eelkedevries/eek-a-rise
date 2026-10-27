import { describe, expect, it } from 'vitest';
import { spectrum, fromSpectrum } from '../../src/core/spectrum';
import { circularTarget, noisePath, noisePhase, plainTarget, riseFrame, riseTarget, specMatch } from '../../src/core/rise';
import { goldenArray, goldenCase, goldenShape, toFloat64, uniformFrom } from './load';

function maxAbsDiff(a: ArrayLike<number>, b: ArrayLike<number>, offset = 0): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[offset + i]));
  return m;
}

describe('RISE against the reference (golden data)', () => {
  const [h, w] = goldenShape('rise_200', 'input');
  const n = h * w;
  const img = toFloat64(goldenArray('rise_200', 'input'));
  const u = uniformFrom(goldenArray('rise_200', 'u'));
  const r = uniformFrom(goldenArray('rise_200', 'r'));
  const { amplitude, phase: src } = spectrum(img, h, w);
  const R = noisePhase(u, h, w);
  const weights = goldenCase('rise_200').files.weights.values!;

  it('rise_200: amplitude, sign-rule frames and the plain frame at 0.5', () => {
    const tol = goldenCase('rise_200').tolerance.max_abs as number;
    expect(maxAbsDiff(amplitude, goldenArray('rise_200', 'amplitude'))).toBeLessThan(tol);
    const expected = goldenArray('rise_200', 'frames');
    const target = riseTarget(src, R, r, h, w);
    weights.forEach((a, k) => expect(maxAbsDiff(riseFrame(amplitude, src, target, a, h, w), expected, k * n), `a = ${a}`).toBeLessThan(tol));
    const plain = riseFrame(amplitude, src, plainTarget(src, R, h, w), 0.5, h, w);
    expect(maxAbsDiff(plain, goldenArray('rise_200', 'naive_frame_0p5'))).toBeLessThan(tol);
  });

  it('rise_circular_200: circular-target frames', () => {
    const tol = goldenCase('rise_circular_200').tolerance.max_abs as number;
    const expected = goldenArray('rise_circular_200', 'frames');
    const target = circularTarget(src, R, r, h, w);
    weights.forEach((a, k) => expect(maxAbsDiff(riseFrame(amplitude, src, target, a, h, w), expected, k * n), `a = ${a}`).toBeLessThan(tol));
  });
});

describe('spectrum matching and the noise path (golden data)', () => {
  it('spec_match_64', () => {
    const [count, h, w] = goldenShape('spec_match_64', 'inputs');
    const inputs = goldenArray('spec_match_64', 'inputs');
    const images = Array.from({ length: count }, (_, k) => Float64Array.from(inputs.subarray(k * h * w, (k + 1) * h * w)));
    const { images: out, amplitude } = specMatch(images, h, w);
    const tol = goldenCase('spec_match_64').tolerance.max_abs as number;
    expect(maxAbsDiff(amplitude, goldenArray('spec_match_64', 'amplitude'))).toBeLessThan(tol);
    const expected = goldenArray('spec_match_64', 'outputs');
    out.forEach((image, k) => expect(maxAbsDiff(image, expected, k * h * w)).toBeLessThan(tol));
  });

  it('noise_and_mask_64: the noise path (the mask belongs to the compound stimulus and is not ported)', () => {
    const [h, w] = goldenShape('noise_and_mask_64', 'u0');
    const amp = goldenArray('noise_and_mask_64', 'amplitude') as Float64Array;
    const R0 = noisePhase(uniformFrom(goldenArray('noise_and_mask_64', 'u0')), h, w);
    const R1 = noisePhase(uniformFrom(goldenArray('noise_and_mask_64', 'u1')), h, w);
    const t = riseTarget(R0, R1, uniformFrom(goldenArray('noise_and_mask_64', 'r')), h, w);
    const expected = goldenArray('noise_and_mask_64', 'path');
    const tol = goldenCase('noise_and_mask_64').tolerance.max_abs as number;
    [0, 0.5, 1].forEach((wt, k) => expect(maxAbsDiff(fromSpectrum(amp, noisePath(R0, t, wt, h, w), h, w), expected, k * h * w)).toBeLessThan(tol));
  });
});
