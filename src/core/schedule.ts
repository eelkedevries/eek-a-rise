/**
 * The frame schedule of a full-image sequence (specification: Sequence schedule).
 * Integer frame arithmetic only, so the browser, the exports and the Python
 * reference agree on every frame.
 */

export interface ScheduleParams {
  fps: number;
  tagHz: number;
  baselineS: number;
  stimulusS: number;
  postS: number;
  cyclesPerImage: number;
  nImages: number;
  /** Interpolation weight at the top of each cycle, in (0, 1]. */
  peak: number;
}

export type Segment = 'baseline' | 'stimulus' | 'post';

export interface Row {
  frame: number;
  timeS: number;
  segment: Segment;
  stimFrame: number;
  cycle: number;
  half: '' | 'on' | 'off';
  weight: number;
  image: number;
  noiseW: number;
}

export interface Frames {
  baseline: number;
  stimulus: number;
  post: number;
  period: number;
  cycles: number;
}

export class ScheduleError extends Error {}

const EPS = 1e-9;

function format(x: number, digits = 3): string {
  return Number(x.toFixed(digits)).toString();
}

export function periodFrames(tagHz: number, fps: number): number {
  const p = fps / tagHz;
  if (!Number.isFinite(p) || Math.abs(p - Math.round(p)) > EPS) {
    const lo = Math.max(2, Math.floor(p)), hi = Math.max(2, Math.ceil(p));
    const options = [...new Set([lo, hi])].map((n) => `${format(fps / n)} Hz (${n} frames)`).join(' or ');
    throw new ScheduleError(`${format(tagHz)} Hz is not a whole number of frames at ${fps} frames/s. Nearest: ${options}.`);
  }
  return Math.round(p);
}

export function wholeFrames(seconds: number, fps: number, what: string): number {
  const n = seconds * fps;
  if (!Number.isFinite(n) || n < 0 || Math.abs(n - Math.round(n)) > EPS) {
    throw new ScheduleError(`The ${what} (${format(seconds)} s) is not a whole number of frames at ${fps} frames/s.`);
  }
  return Math.round(n);
}

/** Frame counts of the segments, or a ScheduleError with a readable message. */
export function frameCounts(p: ScheduleParams): Frames {
  if (!Number.isInteger(p.fps) || p.fps < 1) throw new ScheduleError('The frame rate must be a whole number of frames per second.');
  if (!(p.tagHz > 0)) throw new ScheduleError('The tag frequency must be above 0 Hz.');
  const period = periodFrames(p.tagHz, p.fps);
  if (period < 2) throw new ScheduleError('A cycle needs at least 2 frames.');
  const baseline = wholeFrames(p.baselineS, p.fps, 'baseline');
  const stimulus = wholeFrames(p.stimulusS, p.fps, 'stimulus');
  const post = wholeFrames(p.postS, p.fps, 'post period');
  if (stimulus === 0 || stimulus % period !== 0) {
    const cycles = Math.max(1, Math.round(stimulus / period));
    throw new ScheduleError(
      `The stimulus (${stimulus} frames) must hold a whole number of ${period}-frame cycles, so that it starts and ends in noise; for example ${format((cycles * period) / p.fps)} s.`,
    );
  }
  if (!Number.isInteger(p.cyclesPerImage) || p.cyclesPerImage < 1) throw new ScheduleError('Cycles per image must be a whole number of at least 1.');
  if (!Number.isInteger(p.nImages) || p.nImages < 1) throw new ScheduleError('The sequence needs at least one image.');
  if (!(p.peak > 0 && p.peak <= 1)) throw new ScheduleError('The peak weight must be above 0 and at most 1.');
  return { baseline, stimulus, post, period, cycles: stimulus / period };
}

/** Raised-cosine interpolation weight at frame p of a cycle of `period` frames (0 at p = 0). */
export function weight(p: number, period: number, peak: number): number {
  const aMin = 0.0;
  return aMin + (peak - aMin) * (0.5 - 0.5 * Math.cos((2 * Math.PI * p) / period));
}

export function schedule(p: ScheduleParams): Row[] {
  const { baseline: nb, stimulus: ns, post: npost, period: P } = frameCounts(p);
  const rows: Row[] = [];
  for (let n = 0; n < nb + ns + npost; n++) {
    const timeS = n / p.fps;
    if (n < nb) {
      rows.push({ frame: n, timeS, segment: 'baseline', stimFrame: -1, cycle: -1, half: '', weight: 0.0, image: -1, noiseW: n / nb });
    } else if (n < nb + ns) {
      const i = n - nb;
      const k = Math.floor(i / P);
      const q = i % P;
      rows.push({
        frame: n,
        timeS,
        segment: 'stimulus',
        stimFrame: i,
        cycle: k,
        half: 2 * q < P ? 'on' : 'off',
        weight: weight(q, P, p.peak),
        image: Math.floor(k / p.cyclesPerImage) % p.nImages,
        noiseW: Number.NaN,
      });
    } else {
      const j = n - nb - ns;
      rows.push({ frame: n, timeS, segment: 'post', stimFrame: -1, cycle: -1, half: '', weight: 0.0, image: -1, noiseW: (j + 1) / npost });
    }
  }
  return rows;
}

function float12(x: number): string {
  return Number.isNaN(x) ? 'nan' : x.toFixed(12);
}

/** schedule.csv: the columns and number format of tools/reference/golden/sequence_64_schedule.csv. */
export function scheduleCsv(rows: readonly Row[]): string {
  const lines = ['frame,time_s,segment,stim_frame,cycle,half,weight,image,noise_w'];
  for (const r of rows) {
    lines.push([r.frame, float12(r.timeS), r.segment, r.stimFrame, r.cycle, r.half, float12(r.weight), r.image, float12(r.noiseW)].join(','));
  }
  return `${lines.join('\n')}\n`;
}
