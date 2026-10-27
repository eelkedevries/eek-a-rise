import { describe, expect, it } from 'vitest';
import { fft, fft2, ifft2 } from '../../src/core/fft';
import { goldenArray, goldenCase, goldenShape, toFloat64 } from './load';

function maxAbs(a: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
  return m;
}

describe('fft2 against numpy.fft.fft2 (golden data)', () => {
  for (const name of ['fft_400', 'fft_45x60', 'fft_13x17']) {
    it(name, () => {
      const [h, w] = goldenShape(name, 'input');
      const re = toFloat64(goldenArray(name, 'input'));
      const im = new Float64Array(re.length);
      fft2(re, im, h, w);
      const expRe = goldenArray(name, 're');
      const expIm = goldenArray(name, 'im');
      let err = 0;
      for (let i = 0; i < re.length; i++) err = Math.max(err, Math.abs(re[i] - expRe[i]), Math.abs(im[i] - expIm[i]));
      const scale = Math.max(maxAbs(expRe), maxAbs(expIm));
      expect(err / scale).toBeLessThan(goldenCase(name).tolerance.max_abs_over_max_abs as number);
    });
  }
});

describe('fft', () => {
  it('matches a direct DFT for every length from 1 to 70', () => {
    for (let n = 1; n <= 70; n++) {
      const xr = Float64Array.from({ length: n }, (_, i) => Math.sin(1.7 * i + 0.3) + (i % 3));
      const xi = Float64Array.from({ length: n }, (_, i) => Math.cos(0.9 * i * i));
      const re = xr.slice(), im = xi.slice();
      fft(re, im);
      let err = 0;
      for (let k = 0; k < n; k++) {
        let sr = 0, si = 0;
        for (let t = 0; t < n; t++) {
          const a = (-2 * Math.PI * t * k) / n;
          sr += xr[t] * Math.cos(a) - xi[t] * Math.sin(a);
          si += xr[t] * Math.sin(a) + xi[t] * Math.cos(a);
        }
        err = Math.max(err, Math.abs(sr - re[k]), Math.abs(si - im[k]));
      }
      expect(err, `n = ${n}`).toBeLessThan(1e-10 * n);
    }
  });

  it('ifft2(fft2(x)) reproduces x at 400 × 400', () => {
    const n = 400 * 400;
    const x = Float64Array.from({ length: n }, (_, i) => ((i * 2654435761) % 1000) / 1000);
    const re = x.slice(), im = new Float64Array(n);
    fft2(re, im, 400, 400);
    ifft2(re, im, 400, 400);
    let err = 0;
    for (let i = 0; i < n; i++) err = Math.max(err, Math.abs(re[i] - x[i]), Math.abs(im[i]));
    expect(err).toBeLessThan(1e-12);
  });
});
