import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSequence } from '../../src/core/build';
import { Prng } from '../../src/core/prng';
import { circularTarget, DEMO_PEAK, noisePhase, riseFrame } from '../../src/core/rise';
import { spectrum } from '../../src/core/spectrum';
import { mean, rms } from '../../src/core/stats';
import { demoFaces } from '../helpers/images';

const entries: { file: string }[] = JSON.parse(readFileSync(new URL('../../public/examples/manifest.json', import.meta.url), 'utf8'));
const names = entries.map(e => e.file.replace(/\.png$/, ''));
const size = 128;
const images = demoFaces(names, size);
const surround = (frame: Float64Array) => frame.filter((_, i) => i % size < 8 || i % size >= size - 8);

describe('public face examples retain a textured surround at full visibility', () => {
  it('reaches weight 1 and keeps texture in all 15 inputs and through the full slider range', () => {
    expect(DEMO_PEAK).toBe(1);
    const prng = new Prng(20191001);
    for (const [index, image] of images.entries()) {
      const { amplitude, phase } = spectrum(image, size, size);
      const target = circularTarget(phase, noisePhase(prng.uniformArray(image.length), size, size), prng.uniformArray(image.length), size, size);
      for (let step = 0; step <= 20; step++) {
        const weight = step / 20;
        const frame = riseFrame(amplitude, phase, target, weight, size, size);
        expect(rms(surround(frame)), `${names[index]}, weight ${weight}`).toBeGreaterThan(0.02);
        expect(mean(frame)).toBeCloseTo(mean(image), 10);
        expect(rms(frame)).toBeCloseTo(rms(image), 10);
        if (weight === 1) expect(Math.max(...frame.map((v, i) => Math.abs(v - image[i])))).toBeLessThan(1e-10);
      }
    }
  });

  it('retains surround texture at the full-restoration peak of every sequence image', () => {
    const built = buildSequence({
      images, size, method: 'circular', normalise: null, seed: 1, fixation: false,
      params: { fps: 60, tagHz: 2, baselineS: 0, stimulusS: names.length / 2, postS: 0, cyclesPerImage: 1, peak: 1 },
    });
    const peaks = built.rows.filter(r => r.weight === 1);
    expect(peaks.length).toBe(15);
    for (const row of peaks) {
      const pixels = built.frames.subarray(row.frame * size * size, (row.frame + 1) * size * size);
      expect(rms(surround(Float64Array.from(pixels, v => v / 255)))).toBeGreaterThan(0.02);
      expect(built.stats.similarity[row.frame]).toBeGreaterThan(0.99);
    }
  });
});
