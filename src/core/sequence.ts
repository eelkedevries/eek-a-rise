/**
 * Renders a full-image RISE sequence frame by frame (specification: Sequence
 * schedule, Randomness), as tools/reference/rise_reference.py `Sequence.render`.
 *
 * Only the arrays the current cycle needs are held, so memory does not grow
 * with the length of the sequence. The uniform arrays are taken by index from
 * `uniformAt`, in the reference's draw order: R[0..K+2], the onset targets'
 * r for k = 0..K-1, the offset targets' r, then the baseline and post targets' r.
 */
import { fromSpectrum, spectrum } from './spectrum';
import { meanAmplitude, noisePath, noisePhase, normaliseAmplitude, riseFrame, targets, type Method } from './rise';
import { frameCounts, schedule, type Row, type ScheduleParams } from './schedule';

export interface SequenceSetup {
  /** Prepared images, size × size, values in [0, 1]. */
  images: readonly Float64Array[];
  size: number;
  params: Omit<ScheduleParams, 'nImages'>;
  method: Method;
  /** Mean and RMS contrast for every frame, or null to keep the set's own. */
  normalise: { mean: number; rms: number } | null;
}

export interface SequenceFrame {
  row: Row;
  /** The frame before the display mapping. */
  frame: Float64Array;
  /** The spectrum-matched source image of the frame's cycle (baseline: the first; post: the last). */
  source: Float64Array;
}

export function scheduleParams(setup: SequenceSetup): ScheduleParams {
  return { ...setup.params, nImages: setup.images.length };
}

/** Number of uniform arrays the sequence draws: 3K + 5 for K cycles. */
export function uniformCount(setup: SequenceSetup): number {
  return 3 * frameCounts(scheduleParams(setup)).cycles + 5;
}

/** A small cache that keeps only the most recently used entries. */
function recent<T>(limit: number, make: (key: number) => T): (key: number) => T {
  const cache = new Map<number, T>();
  return (key) => {
    let value = cache.get(key);
    if (value === undefined) {
      value = make(key);
      cache.set(key, value);
      if (cache.size > limit) cache.delete(cache.keys().next().value!);
    }
    return value;
  };
}

export function* renderSequence(setup: SequenceSetup, uniformAt: (index: number) => Float64Array): Generator<SequenceFrame> {
  const { images, size: n, method } = setup;
  if (images.length === 0) throw new Error('renderSequence needs at least one image');
  for (const image of images) if (image.length !== n * n) throw new Error('every image must be size × size');
  const rows = schedule(scheduleParams(setup));
  const K = frameCounts(scheduleParams(setup)).cycles;
  const target = targets[method];

  const matched = meanAmplitude(images, n, n);
  const amp = setup.normalise ? normaliseAmplitude(matched, setup.normalise.mean, setup.normalise.rms) : matched;
  // The source phase is taken from the spectrum-matched image, as the reference does.
  const source = recent(2, (k) => {
    const eq = fromSpectrum(matched, spectrum(images[k], n, n).phase, n, n);
    return { eq, phase: spectrum(eq, n, n).phase };
  });
  const noise = recent(3, (j) => noisePhase(uniformAt(j), n, n));
  const imageOf = (k: number) => rows.find((r) => r.cycle === k)!.image;

  let base: Float64Array | null = null;
  let post: Float64Array | null = null;
  let cycle = -1;
  let tOn: Float64Array | null = null;
  let tOff: Float64Array | null = null;

  for (const row of rows) {
    if (row.segment === 'baseline') {
      base ??= target(noise(0), noise(1), uniformAt(3 * K + 3), n, n);
      const phase = noisePath(noise(0), base, row.noiseW, n, n);
      yield { row, frame: fromSpectrum(amp, phase, n, n), source: source(imageOf(0)).eq };
    } else if (row.segment === 'post') {
      post ??= target(noise(K + 1), noise(K + 2), uniformAt(3 * K + 4), n, n);
      const phase = noisePath(noise(K + 1), post, row.noiseW, n, n);
      yield { row, frame: fromSpectrum(amp, phase, n, n), source: source(imageOf(K - 1)).eq };
    } else {
      const k = row.cycle;
      const src = source(row.image);
      if (k !== cycle) {
        cycle = k;
        tOn = target(src.phase, noise(k + 1), uniformAt(K + 3 + k), n, n);
        tOff = null;
      }
      if (row.half === 'off') tOff ??= target(src.phase, noise(k + 2), uniformAt(2 * K + 3 + k), n, n);
      const t = row.half === 'on' ? tOn! : tOff!;
      yield { row, frame: riseFrame(amp, src.phase, t, row.weight, n, n), source: src.eq };
    }
  }
}
