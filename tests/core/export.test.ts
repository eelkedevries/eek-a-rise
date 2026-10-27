import { decode } from 'fast-png';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildSequence } from '../../src/core/build';
import { scheduleCsv } from '../../src/core/schedule';
import { mean, rms } from '../../src/core/stats';
import { frameStatsCsv } from '../../src/export/params';
import { makeZip } from '../../src/export/zip';
import { DEFAULT_SETTINGS, type SequenceSettings } from '../../src/state';
import { DEMO_SEQUENCE, demoFaces } from '../helpers/images';

describe('PNG ZIP export', () => {
  const settings: SequenceSettings = { ...DEFAULT_SETTINGS, size: 96, baselineS: 0.25, stimulusS: 1, postS: 0.25, seed: 7, fixation: true };
  const names = DEMO_SEQUENCE.slice(0, 3);
  const built = buildSequence({
    images: demoFaces(names, settings.size),
    size: settings.size,
    params: settings,
    method: settings.method,
    normalise: null,
    seed: settings.seed,
    fixation: settings.fixation,
  });
  const zip = makeZip({ built, settings, imageNames: names, created: '2026-10-27T00:00:00.000Z' });
  const files = unzipSync(zip);
  const folder = 'eek-a-rise_7';

  it('holds every frame as an 8-bit grey PNG that decodes to exactly the built frame', () => {
    const px = settings.size * settings.size;
    expect(built.rows.length).toBe(90);
    for (let n = 0; n < built.rows.length; n++) {
      const png = decode(files[`${folder}/frame_${String(n).padStart(4, '0')}.png`]);
      expect(png.channels).toBe(1);
      expect(png.depth).toBe(8);
      expect(png.width).toBe(settings.size);
      expect(Buffer.compare(Buffer.from(png.data as Uint8Array), Buffer.from(built.frames.subarray(n * px, (n + 1) * px)))).toBe(0);
    }
  });

  it('holds the schedule, the statistics, the parameters and a README', () => {
    expect(strFromU8(files[`${folder}/schedule.csv`])).toBe(scheduleCsv(built.rows));
    expect(strFromU8(files[`${folder}/frame_stats.csv`])).toBe(frameStatsCsv(built));
    const parameters = JSON.parse(strFromU8(files[`${folder}/parameters.json`]));
    expect(parameters.seed).toBe(7);
    expect(parameters.frames.total).toBe(90);
    expect(parameters.images).toEqual(names);
    expect(strFromU8(files[`${folder}/README.txt`])).toContain('lossless');
  });

  it('reports statistics that can be recomputed from the decoded frames', () => {
    const lines = strFromU8(files[`${folder}/frame_stats.csv`]).trim().split('\n').slice(1);
    const c = settings.size / 2, arm = Math.round(0.015 * settings.size);
    lines.forEach((line, n) => {
      const [, m, s] = line.split(',').map(Number);
      const values = Array.from(decode(files[`${folder}/frame_${String(n).padStart(4, '0')}.png`]).data as Uint8Array)
        .map((v, i) => ({ v: v / 255, y: Math.floor(i / settings.size), x: i % settings.size }))
        .filter(({ x, y }) => !((y === c - 1 || y === c) && Math.abs(x - c) <= arm) && !((x === c - 1 || x === c) && Math.abs(y - c) <= arm))
        .map(({ v }) => v);
      expect(Math.abs(mean(values) - m)).toBeLessThan(1e-6);
      expect(Math.abs(rms(values) - s)).toBeLessThan(1e-6);
    });
  });
});
