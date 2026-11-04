/** The text files that travel with every download (specification: Exports). */
import type { BuiltSequence } from '../core/build';
import { frameCounts } from '../core/schedule';
import type { SequenceSettings } from '../state';

export interface ExportInfo {
  built: BuiltSequence;
  settings: SequenceSettings;
  imageNames: string[];
  /** ISO 8601 date and time of the export. */
  created: string;
}

export function baseName(settings: SequenceSettings): string {
  return `eek-a-rise_${settings.seed >>> 0}`;
}

function range(a: Float64Array): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (const v of a) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  return [lo, hi];
}

const round = (x: number, digits = 6) => Number(x.toFixed(digits));

export function parametersJson({ built, settings, imageNames, created }: ExportInfo): string {
  const counts = frameCounts({ ...settings, nImages: imageNames.length });
  const [meanLo, meanHi] = range(built.stats.mean);
  const [rmsLo, rmsHi] = range(built.stats.rms);
  const sampledPeak = Math.max(...built.rows.map((r) => r.weight));
  const peaks = built.rows.filter((r) => r.segment === 'stimulus' && r.weight === sampledPeak).map((r) => built.stats.similarity[r.frame]);
  const parameters = {
    app: 'eek-a-rise',
    version: __APP_VERSION__,
    url: 'https://eelkedevries.com/eek-a-rise/',
    created,
    seed: settings.seed >>> 0,
    method: settings.method === 'circular' ? 'RISE, circular target' : 'RISE, sign rule',
    frame_rate_hz: settings.fps,
    tag_frequency_hz: settings.tagHz,
    period_frames: counts.period,
    cycles: counts.cycles,
    cycles_per_image: settings.cyclesPerImage,
    baseline_s: settings.baselineS,
    stimulus_s: settings.stimulusS,
    post_s: settings.postS,
    frames: { baseline: counts.baseline, stimulus: counts.stimulus, post: counts.post, total: built.rows.length },
    peak_weight: settings.peak,
    sampled_peak_weight: sampledPeak,
    weight: 'peak * (0.5 - 0.5 * cos(2 * pi * p / period)), p = frame within the cycle',
    phase_path: 'one shared peak phase, made at peak_weight on the source-to-onset-noise path; both halves interpolate between this peak and their noise endpoint at weight / peak_weight',
    peak_provenance: 'project parameter; 0.85 retains residual phase noise in the demonstration, not an estimate of the published stimulus',
    image_size_px: settings.size,
    outline_ellipse: settings.outline ? { ...settings.ellipse, units: 'fractions of the image size' } : null,
    spectrum_matching: 'every image gets the set-average amplitude spectrum and keeps its own phase',
    normalise: settings.normalise ? { mean: settings.normMean, rms_contrast: settings.normRms } : null,
    fixation_cross: settings.fixation,
    display_mapping: 'round(clamp(v, 0, 1) * 255), 8-bit grey',
    clipped_share: built.clippedShare,
    images: imageNames,
    measured: {
      note: 'from the 8-bit frames (values / 255), fixation cross excluded; RMS contrast is population SD, not SD / mean; similarity is the Pearson correlation with the prepared source image of each cycle',
      mean_range: [round(meanLo), round(meanHi)],
      rms_contrast_range: [round(rmsLo), round(rmsHi)],
      similarity_at_peaks_min: peaks.length ? round(Math.min(...peaks), 4) : null,
    },
  };
  return `${JSON.stringify(parameters, null, 2)}\n`;
}

/** frame_stats.csv: the measurements of every frame, 6 decimals. */
export function frameStatsCsv(built: BuiltSequence): string {
  const lines = ['frame,mean,rms_contrast,similarity,clipped_share'];
  const { mean, rms, similarity, clipped } = built.stats;
  for (let n = 0; n < built.rows.length; n++) {
    lines.push([n, mean[n].toFixed(6), rms[n].toFixed(6), similarity[n].toFixed(6), clipped[n].toFixed(6)].join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function readmeText({ built, settings, imageNames }: ExportInfo): string {
  const n = built.rows.length;
  return `eek-a-rise sequence ${baseName(settings)}
Made at https://eelkedevries.com/eek-a-rise/ (version ${__APP_VERSION__}).

Files
  frame_0000.png ... frame_${String(n - 1).padStart(4, '0')}.png
                     ${n} frames, ${settings.size} x ${settings.size} px, 8-bit grey, lossless.
  parameters.json    every parameter, the seed and the image names.
  schedule.csv       one row per frame: time, segment, cycle, half, weight, image.
  frame_stats.csv    one row per frame: mean, RMS contrast, similarity to the source, clipped share.

Presentation
  Show one frame per screen refresh at exactly ${settings.fps} frames per second
  (frame n at n / ${settings.fps} s), with the display running at ${settings.fps} Hz or a whole
  multiple of it, using software locked to the refresh, such as Psychtoolbox or
  PsychoPy. Load all frames as textures before the sequence starts, flip once per
  frame (or a fixed whole number of refreshes per frame), and record dropped
  frames. Check the timing of the first frames with a photodiode.

  The tag frequency is ${settings.tagHz} Hz: one image emerges from noise and
  dissolves into it every ${frameCounts({ ...settings, nImages: imageNames.length }).period} frames. Cycle k shows image
  floor(k / ${settings.cyclesPerImage}) modulo ${imageNames.length}, counting from zero.

Brightness and contrast
  Before 8-bit mapping, mean and RMS contrast (population SD of grey values,
  not SD / mean) are constant. Rounding and clipping can change these statistics;
  frame_stats.csv reports the exported values. On a screen, luminance statistics
  also depend on display calibration. Local contrast and edges still change as
  the images emerge.

  Peak weight ${settings.peak} defines a common peak phase for both halves of each
  cycle. Below 1, residual phase noise remains even at maximum visibility.

Lossless frames and video
  PNG frames are lossless: use them for research. A compressed video changes
  pixel values and can undo the matched brightness and contrast; it is meant for
  viewing and sharing.
`;
}
