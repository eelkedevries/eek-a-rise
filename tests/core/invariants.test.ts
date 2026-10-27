import { describe, expect, it } from 'vitest';
import { Prng, uniformArrays } from '../../src/core/prng';
import { circularTarget, noisePhase, riseFrame, riseTarget, wrap } from '../../src/core/rise';
import { spectrum } from '../../src/core/spectrum';
import { mean, rms } from '../../src/core/stats';
import { cornerZ, pinkImage } from '../helpers/images';

describe('RISE invariants', () => {
  const size = 64;
  const prng = new Prng(7);
  const img = prng.uniformArray(size * size);
  const { amplitude, phase: src } = spectrum(img, size, size);
  const R = noisePhase(prng.uniformArray(size * size), size, size);
  const r = prng.uniformArray(size * size);

  for (const [name, make] of [['circular', circularTarget], ['sign rule', riseTarget]] as const) {
    it(`${name}: mean, RMS contrast and amplitude spectrum are constant over the weight`, () => {
      const target = make(src, R, r, size, size);
      const m0 = mean(img), s0 = rms(img);
      for (let a = 0; a <= 1.0001; a += 0.05) {
        const frame = riseFrame(amplitude, src, target, a, size, size);
        expect(Math.abs(mean(frame) - m0) / m0).toBeLessThan(1e-9);
        expect(Math.abs(rms(frame) - s0) / s0).toBeLessThan(1e-9);
        const amp = spectrum(frame, size, size).amplitude;
        let worst = 0;
        for (let i = 0; i < amp.length; i++) worst = Math.max(worst, Math.abs(amp[i] - amplitude[i]));
        expect(worst / amplitude[0]).toBeLessThan(1e-9);
      }
    });

    it(`${name}: a weight of 1 reproduces the source`, () => {
      const frame = riseFrame(amplitude, src, make(src, R, r, size, size), 1, size, size);
      let err = 0;
      for (let i = 0; i < frame.length; i++) err = Math.max(err, Math.abs(frame[i] - img[i]));
      expect(err).toBeLessThan(1e-12);
    });
  }

  it('wrap maps every angle into [-pi, pi) and keeps it modulo 2 pi', () => {
    for (const x of [-7, -Math.PI, -1, 0, 1, Math.PI, 3.5, 9.9]) {
      const y = wrap(x);
      expect(y).toBeGreaterThanOrEqual(-Math.PI);
      expect(y).toBeLessThan(Math.PI);
      expect(Math.abs(Math.cos(y) - Math.cos(x)) + Math.abs(Math.sin(y) - Math.sin(x))).toBeLessThan(1e-12);
    }
  });
});

describe('corner artefacts', () => {
  // The sign rule biases the phases at weights other than 0.5, which brightens and
  // then darkens the DFT origin, that is the image corners; the circular target does not.
  const size = 128;
  const img = pinkImage(size, 3);
  const { amplitude, phase: src } = spectrum(img, size, size);

  it('the sign rule brightens the corners near 0.3 and darkens them near 0.75; the circular target does neither', () => {
    for (let draw = 0; draw < 3; draw++) {
      const prng = new Prng(100 + draw);
      const R = noisePhase(prng.uniformArray(size * size), size, size);
      const r = prng.uniformArray(size * size);
      const sign = riseTarget(src, R, r, size, size);
      const circ = circularTarget(src, R, r, size, size);
      for (const a of [0.3, 0.75]) {
        expect(cornerZ(riseFrame(amplitude, src, sign, a, size, size), size), `sign rule, a = ${a}`).toBeGreaterThan(8);
        expect(cornerZ(riseFrame(amplitude, src, circ, a, size, size), size), `circular, a = ${a}`).toBeLessThan(4.5);
      }
    }
  });
});

describe('seeded generator', () => {
  it('reproduces the test vectors of the specification', () => {
    const first5 = (seed: number) => {
      const p = new Prng(seed);
      return Array.from({ length: 5 }, () => p.nextUint32());
    };
    expect(first5(1)).toEqual([1130556604, 2591592147, 3014952990, 960850752, 2734082507]);
    expect(first5(20191001)).toEqual([1003360215, 1765151852, 1754808311, 2067470915, 1903539223]);
  });

  it('gives random access to the arrays of one stream', () => {
    const at = uniformArrays(5, 4, 10);
    const p = new Prng(5);
    const stream = [p.uniformArray(10), p.uniformArray(10), p.uniformArray(10), p.uniformArray(10)];
    expect(at(2)).toEqual(stream[2]);
    expect(at(0)).toEqual(stream[0]);
    expect(at(3)).toEqual(stream[3]);
  });
});
