/**
 * Builds a sequence into 8-bit frames with the measured statistics of every
 * frame (specification: Frames). Pure, so the worker and the tests share it.
 */
import { uniformArrays } from './prng';
import { frameCounts, type Row } from './schedule';
import { renderSequence, scheduleParams, uniformCount, type SequenceSetup } from './sequence';
import { drawFixation, fixationMask, frameStats, toUint8 } from './stats';

export interface BuildOptions extends SequenceSetup {
  seed: number;
  fixation: boolean;
}

export interface FrameSeries {
  mean: Float64Array;
  rms: Float64Array;
  similarity: Float64Array;
  clipped: Float64Array;
}

export interface BuiltSequence {
  size: number;
  rows: Row[];
  /** nFrames × size × size grey values, frame after frame. */
  frames: Uint8Array;
  stats: FrameSeries;
  /** Share of all values outside [0, 1] before the display mapping. */
  clippedShare: number;
}

export function totalFrames(options: SequenceSetup): number {
  const f = frameCounts(scheduleParams(options));
  return f.baseline + f.stimulus + f.post;
}

export function buildSequence(options: BuildOptions, onProgress?: (done: number, total: number) => void): BuiltSequence {
  const { size } = options;
  const pixels = size * size;
  const total = totalFrames(options);
  const uniformAt = uniformArrays(options.seed >>> 0, uniformCount(options), pixels);
  const mask = options.fixation ? fixationMask(size) : undefined;
  const frames = new Uint8Array(total * pixels);
  const stats: FrameSeries = {
    mean: new Float64Array(total),
    rms: new Float64Array(total),
    similarity: new Float64Array(total),
    clipped: new Float64Array(total),
  };
  const rows: Row[] = [];
  let clippedTotal = 0;
  for (const { row, frame, source } of renderSequence(options, uniformAt)) {
    const n = row.frame;
    const out = frames.subarray(n * pixels, (n + 1) * pixels);
    const clipped = toUint8(frame, out);
    if (mask) drawFixation(out, mask);
    const s = frameStats(out, source, clipped, mask);
    stats.mean[n] = s.mean;
    stats.rms[n] = s.rms;
    stats.similarity[n] = s.similarity;
    stats.clipped[n] = s.clipped;
    clippedTotal += clipped;
    rows.push(row);
    onProgress?.(n + 1, total);
  }
  return { size, rows, frames, stats, clippedShare: clippedTotal / frames.length };
}

/**
 * Frequency (Hz) of the largest spectral peak of a series between fMin and fMax,
 * from a Hann-windowed DFT evaluated on a fine grid.
 */
export function peakFrequency(series: ArrayLike<number>, rate: number, fMin: number, fMax: number, step = 0.001): number {
  const n = series.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += series[i] / n;
  let best = fMin, bestPower = -1;
  for (let f = fMin; f <= fMax; f += step) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, n - 1));
      const v = (series[i] - mean) * w;
      const angle = (-2 * Math.PI * f * i) / rate;
      re += v * Math.cos(angle);
      im += v * Math.sin(angle);
    }
    const power = re * re + im * im;
    if (power > bestPower) {
      bestPower = power;
      best = f;
    }
  }
  return best;
}
