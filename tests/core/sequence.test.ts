import { describe, expect, it } from 'vitest';
import { buildSequence, peakFrequency, type BuildOptions } from '../../src/core/build';
import { uniformArrays } from '../../src/core/prng';
import { meanAmplitude } from '../../src/core/rise';
import { renderSequence, uniformCount } from '../../src/core/sequence';
import { spectrum } from '../../src/core/spectrum';
import { mean, rms } from '../../src/core/stats';
import { cornerZ, DEMO_SEQUENCE, demoFaces } from '../helpers/images';

// A reduced default sequence: the nine demo faces at 128 × 128, 2 Hz at 60 frames/s,
// 0.5 s of noise, 1.5 s of images (three cycles), 0.5 s of noise.
const SIZE = 128;
const images = demoFaces(DEMO_SEQUENCE, SIZE);
const options: BuildOptions = {
  images,
  size: SIZE,
  params: { fps: 60, tagHz: 2, baselineS: 0.5, stimulusS: 1.5, postS: 0.5, cyclesPerImage: 1, peak: 1 },
  method: 'circular',
  normalise: null,
  seed: 20191001,
  fixation: false,
};
const built = buildSequence(options);
const { rows, stats } = built;

describe('constant visual stimulation: every frame has the same global statistics', () => {
  it('float frames share the set-average amplitude spectrum, mean and RMS contrast (relative error < 1e-9)', () => {
    const amp = meanAmplitude(images, SIZE, SIZE);
    const uniformAt = uniformArrays(options.seed, uniformCount(options), SIZE * SIZE);
    let m0 = Number.NaN, s0 = Number.NaN, n = 0;
    for (const { frame } of renderSequence(options, uniformAt)) {
      if (n === 0) {
        m0 = mean(frame);
        s0 = rms(frame);
      }
      expect(Math.abs(mean(frame) - m0) / m0).toBeLessThan(1e-9);
      expect(Math.abs(rms(frame) - s0) / s0).toBeLessThan(1e-9);
      if (n % 10 === 0) {
        const a = spectrum(frame, SIZE, SIZE).amplitude;
        let worst = 0;
        for (let i = 0; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - amp[i]));
        expect(worst / amp[0]).toBeLessThan(1e-9);
      }
      n++;
    }
    expect(n).toBe(rows.length);
  });

  it('8-bit frames keep the mean within 2e-4 and the RMS contrast within 0.5 %', () => {
    const m0 = stats.mean[0], s0 = stats.rms[0];
    for (let n = 0; n < rows.length; n++) {
      expect(Math.abs(stats.mean[n] - m0)).toBeLessThan(2e-4);
      expect(Math.abs(stats.rms[n] - s0) / s0).toBeLessThan(0.005);
    }
  });
});

describe('dynamic content: the image emerges and dissolves at the tag frequency', () => {
  it('the similarity to the source is above 0.99 at every peak and noise-like at every minimum', () => {
    const peaks = rows.filter((r) => r.segment === 'stimulus' && r.weight === 1);
    const minima = rows.filter((r) => r.segment === 'stimulus' && r.weight === 0);
    expect(peaks.length).toBe(3);
    expect(minima.length).toBe(3);
    for (const r of peaks) expect(stats.similarity[r.frame]).toBeGreaterThan(0.99);
    for (const r of minima) expect(Math.abs(stats.similarity[r.frame])).toBeLessThan(0.5);
  });

  it('the similarity peaks at 2 Hz', () => {
    const stim = rows.filter((r) => r.segment === 'stimulus').map((r) => stats.similarity[r.frame]);
    expect(Math.abs(peakFrequency(stim, 60, 0.5, 6) - 2)).toBeLessThan(0.15);
  });

  it('consecutive frames join without jumps at cycle and segment boundaries', () => {
    const steps: number[] = [];
    const px = SIZE * SIZE;
    for (let n = 1; n < rows.length; n++) {
      let s = 0;
      for (let i = 0; i < px; i++) s += Math.abs(built.frames[n * px + i] - built.frames[(n - 1) * px + i]);
      steps.push(s / px);
    }
    const sorted = [...steps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const joins = rows.slice(1).map((_, k) => k).filter((k) => rows[k + 1].segment !== rows[k].segment || rows[k + 1].cycle !== rows[k].cycle);
    expect(joins.length).toBe(4);
    for (const k of joins) expect(steps[k]).toBeLessThanOrEqual(1.5 * median);
  });
});

describe('no position-specific artefact', () => {
  it('with the circular target the corners stay within 5 SD in every frame; with the sign rule they do not', () => {
    const worst = (method: 'circular' | 'sign') => {
      const o = { ...options, method };
      const uniformAt = uniformArrays(o.seed, uniformCount(o), SIZE * SIZE);
      let w = 0;
      for (const { frame } of renderSequence(o, uniformAt)) w = Math.max(w, cornerZ(frame, SIZE));
      return w;
    };
    expect(worst('circular')).toBeLessThan(5);
    expect(worst('sign')).toBeGreaterThan(8);
  });
});

describe('reproducibility', () => {
  it('the same seed gives byte-identical frames, a different seed does not', () => {
    const again = buildSequence(options);
    expect(Buffer.compare(Buffer.from(again.frames), Buffer.from(built.frames))).toBe(0);
    const other = buildSequence({ ...options, seed: 1 });
    expect(Buffer.compare(Buffer.from(other.frames), Buffer.from(built.frames))).not.toBe(0);
  });

  it('a fixation cross is drawn identically on every frame and left out of the statistics', () => {
    const crossed = buildSequence({ ...options, fixation: true });
    const px = SIZE * SIZE, c = SIZE / 2;
    for (let n = 0; n < crossed.rows.length; n++) expect(crossed.frames[n * px + c * SIZE + c]).toBe(0);
    // The cross hides a few changing pixels (about 0.1 % of them at 128 px), so the
    // mean of the rest varies by their share; it stays within 1e-3.
    for (let n = 0; n < crossed.rows.length; n++) expect(Math.abs(crossed.stats.mean[n] - crossed.stats.mean[0])).toBeLessThan(1e-3);
  });
});
