import { describe, expect, it } from 'vitest';
import { renderSequence, uniformCount, type SequenceSetup } from '../../src/core/sequence';
import { goldenArray, goldenCase, goldenShape, uniformFrom } from './load';

describe('full-image sequence against the reference (golden data)', () => {
  it('sequence_64: every frame from the reference uniform arrays', () => {
    const [count, h, w] = goldenShape('sequence_64', 'inputs');
    const inputs = goldenArray('sequence_64', 'inputs');
    const images = Array.from({ length: count }, (_, k) => Float64Array.from(inputs.subarray(k * h * w, (k + 1) * h * w)));
    const setup: SequenceSetup = {
      images,
      size: h,
      params: { fps: 60, tagHz: 10, baselineS: 0.1, stimulusS: 0.4, postS: 0.05, cyclesPerImage: 1, peak: 0.9 },
      method: 'circular',
      normalise: { mean: 0.5, rms: 0.12 },
    };
    const uniforms = goldenArray('sequence_64', 'uniforms');
    const [nArrays] = goldenShape('sequence_64', 'uniforms');
    expect(uniformCount(setup)).toBe(nArrays);
    const expected = goldenArray('sequence_64', 'frames');
    const tol = goldenCase('sequence_64').tolerance.max_abs as number;
    let n = 0;
    for (const { frame } of renderSequence(setup, (k) => uniformFrom(uniforms, k * h * w, h * w))) {
      let err = 0;
      for (let i = 0; i < frame.length; i++) err = Math.max(err, Math.abs(frame[i] - expected[n * h * w + i]));
      expect(err, `frame ${n}`).toBeLessThan(tol);
      n++;
    }
    expect(n).toBe(goldenShape('sequence_64', 'frames')[0]);
  });
});
