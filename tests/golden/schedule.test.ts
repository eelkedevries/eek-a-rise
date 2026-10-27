import { describe, expect, it } from 'vitest';
import { schedule, scheduleCsv, ScheduleError, type ScheduleParams } from '../../src/core/schedule';
import { goldenCase, goldenText } from './load';

function parseCsv(text: string): Record<string, string>[] {
  const [head, ...lines] = text.trim().split('\n');
  const keys = head.split(',');
  return lines.map((line) => Object.fromEntries(line.split(',').map((v, i) => [keys[i], v])));
}

const paper: ScheduleParams = { fps: 60, tagHz: 2, baselineS: 1, stimulusS: 4.5, postS: 0.5, cyclesPerImage: 3, nImages: 3, peak: 1 };

describe('sequence schedule', () => {
  it('equals the eye columns of the paper schedule at 2 Hz (schedule_default.csv)', () => {
    const expected = parseCsv(goldenText('schedule_default.csv'));
    const rows = schedule(paper);
    expect(rows.length).toBe(expected.length);
    rows.forEach((row, n) => {
      const e = expected[n];
      expect(row.frame).toBe(Number(e.frame));
      expect(row.timeS.toFixed(12)).toBe(e.time_s);
      expect(row.segment).toBe(e.segment);
      expect(row.stimFrame).toBe(Number(e.stim_frame));
      expect(row.cycle).toBe(Number(e.eyes_cycle));
      expect(row.half).toBe(e.eyes_half);
      expect(row.image).toBe(Number(e.identity));
      expect(Math.abs(row.weight - Number(e.eyes_weight))).toBeLessThanOrEqual(1e-12);
      if (e.noise_w === 'nan') expect(row.noiseW).toBeNaN();
      else expect(row.noiseW.toFixed(12)).toBe(e.noise_w);
    });
  });

  it('writes sequence_64_schedule.csv as the reference does', () => {
    const golden = goldenText(goldenCase('sequence_64').files.schedule.file);
    const csv = scheduleCsv(schedule({ fps: 60, tagHz: 10, baselineS: 0.1, stimulusS: 0.4, postS: 0.05, cyclesPerImage: 1, nImages: 2, peak: 0.9 }));
    const g = parseCsv(golden), c = parseCsv(csv);
    expect(c.length).toBe(g.length);
    c.forEach((row, n) => {
      for (const key of Object.keys(g[n])) {
        if (key === 'weight') expect(Math.abs(Number(row[key]) - Number(g[n][key]))).toBeLessThanOrEqual(1e-12);
        else expect(row[key], `${key} in row ${n}`).toBe(g[n][key]);
      }
    });
  });

  it('assigns one image per cycle by default and repeats images in order', () => {
    const rows = schedule({ ...paper, cyclesPerImage: 1, nImages: 4 });
    const firstOfCycle = rows.filter((r) => r.segment === 'stimulus' && r.stimFrame % 30 === 0).map((r) => r.image);
    expect(firstOfCycle).toEqual([0, 1, 2, 3, 0, 1, 2, 3, 0]);
  });

  it('refuses periods and durations that are not whole frames', () => {
    expect(() => schedule({ ...paper, tagHz: 7 })).toThrow(ScheduleError);
    expect(() => schedule({ ...paper, tagHz: 7 })).toThrow(/not a whole number of frames/);
    expect(() => schedule({ ...paper, stimulusS: 4.4 })).toThrow(/whole number of 30-frame cycles/);
    expect(() => schedule({ ...paper, baselineS: 0.0125 })).toThrow(/baseline/);
    expect(() => schedule({ ...paper, peak: 0 })).toThrow(/peak/);
    expect(() => schedule({ ...paper, tagHz: 60 })).toThrow(/at least 2 frames/);
  });
});
