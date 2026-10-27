/** The Sequence tab, result: build with progress and cancel, the player, and the per-frame measurements. */
import { peakFrequency, type BuiltSequence } from '../core/build';
import { applyOutline, prepareImage } from '../core/preprocess';
import type { SequenceSettings } from '../state';
import { RiseWorker } from '../worker/client';
import { drawGrey } from './draw';
import type { SequenceSetup } from './sequence-setup';

export interface BuiltResult {
  built: BuiltSequence;
  settings: SequenceSettings;
  imageNames: string[];
}

export interface SequencePlayer {
  onBuilt(listener: (result: BuiltResult) => void): void;
}

const CLIP_WARNING = 0.001;

/** Median interval between animation frames over about a second, as a refresh rate in Hz. */
function measureRefresh(): Promise<number> {
  return new Promise((resolve) => {
    const times: number[] = [];
    const step = (t: number) => {
      times.push(t);
      if (times.length < 2 || t - times[0] < 1000) requestAnimationFrame(step);
      else {
        const gaps = times.slice(1).map((v, i) => v - times[i]).sort((a, b) => a - b);
        resolve(1000 / gaps[Math.floor(gaps.length / 2)]);
      }
    };
    requestAnimationFrame(step);
  });
}

export function mountSequencePlayer(root: HTMLElement, setup: SequenceSetup): SequencePlayer {
  const $ = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const buildButton = $<HTMLButtonElement>('#seq-build');
  const cancelButton = $<HTMLButtonElement>('#seq-cancel');
  const note = $<HTMLElement>('#seq-build-note');
  const progressRow = $<HTMLElement>('#seq-progress-row');
  const progress = $<HTMLProgressElement>('#seq-progress');
  const eta = $<HTMLElement>('#seq-eta');
  const result = $<HTMLElement>('#seq-result');
  const canvas = $<HTMLCanvasElement>('#seq-canvas');
  const info = $<HTMLElement>('#seq-frame-info');
  const playButton = $<HTMLButtonElement>('#seq-play');
  const scrub = $<HTMLInputElement>('#seq-scrub');
  const loop = $<HTMLInputElement>('#seq-loop');
  const refresh = $<HTMLElement>('#seq-refresh');
  const playerNote = $<HTMLElement>('#seq-player-note');
  const clipWarning = $<HTMLElement>('#seq-clip-warning');
  const plot = $<HTMLCanvasElement>('#seq-plot');
  const measured = $<HTMLElement>('#seq-measured');

  const worker = new RiseWorker();
  const listeners = new Set<(result: BuiltResult) => void>();
  let current: BuiltResult | null = null;
  let frame = 0;
  let playing = false;
  let startTime = -1;
  let startFrame = 0;
  let building = false;

  let blocked = false;
  function updateBuildButton(): void {
    const plan = setup.plan();
    buildButton.disabled = building || plan.errors.length > 0;
    if (building) return;
    if (plan.errors.length > 0) note.textContent = 'Fix the settings above to build.';
    else if (blocked) note.textContent = '';
    blocked = plan.errors.length > 0;
  }
  setup.onChange(updateBuildButton);
  updateBuildButton();

  function show(n: number): void {
    if (!current) return;
    const { built, settings } = current;
    frame = Math.max(0, Math.min(built.rows.length - 1, n));
    const size = built.size;
    // While the ZIP is being made the frames are lent to the worker.
    if (built.frames.length > 0) drawGrey(canvas, built.frames, size, frame * size * size);
    scrub.value = String(frame);
    const row = built.rows[frame];
    const image = row.image >= 0 ? current.imageNames[row.image] : '–';
    info.textContent =
      `${(frame / settings.fps).toFixed(3)} s · frame ${frame} · ${row.segment}` +
      (row.segment === 'stimulus' ? ` · cycle ${row.cycle} · weight ${row.weight.toFixed(3)} · ${image}` : '');
    drawPlot();
  }

  function tick(now: number): void {
    if (!playing || !current) return;
    if (startTime < 0) startTime = now;
    const fps = current.settings.fps;
    const total = current.built.rows.length;
    // Frames are chosen by elapsed time, so a slow display drops frames rather than slowing down.
    let n = startFrame + Math.floor(((now - startTime) / 1000) * fps);
    if (n >= total) {
      if (!loop.checked) {
        show(total - 1);
        setPlaying(false);
        return;
      }
      n %= total;
    }
    if (n !== frame) show(n);
    requestAnimationFrame(tick);
  }

  function setPlaying(on: boolean): void {
    playing = on;
    playButton.textContent = on ? 'Pause' : 'Play';
    playButton.setAttribute('aria-pressed', String(on));
    if (on) {
      startFrame = current && frame >= current.built.rows.length - 1 ? 0 : frame;
      startTime = -1;
      requestAnimationFrame(tick);
    }
  }

  function drawPlot(): void {
    if (!current) return;
    const { built, settings } = current;
    const { stats, rows } = built;
    const width = Math.max(280, Math.round(plot.getBoundingClientRect().width || 800));
    const height = 260;
    const ratio = window.devicePixelRatio || 1;
    if (plot.width !== width * ratio) {
      plot.width = width * ratio;
      plot.height = height * ratio;
    }
    const ctx = plot.getContext('2d')!;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const left = 54, right = width - 10;
    const x = (n: number) => left + ((n + 0.5) / rows.length) * (right - left);
    const panels = [
      { top: 14, h: 120, lo: -0.5, hi: 1, ticks: [-0.5, 0, 0.5, 1], label: 'Similarity to the image' },
      { top: 168, h: 70, lo: -1, hi: 1, ticks: [-1, 0, 1], label: 'Mean and RMS contrast, % from their average' },
    ];
    ctx.font = '11px "JetBrains Mono", monospace';
    for (const p of panels) {
      const y = (v: number) => p.top + p.h - ((v - p.lo) / (p.hi - p.lo)) * p.h;
      const first = rows.findIndex((r) => r.segment === 'stimulus');
      const last = rows.length - 1 - [...rows].reverse().findIndex((r) => r.segment === 'stimulus');
      ctx.fillStyle = 'rgba(154, 154, 164, 0.10)';
      ctx.fillRect(left, p.top, x(first - 0.5) - left, p.h);
      ctx.fillRect(x(last + 0.5), p.top, right - x(last + 0.5), p.h);
      ctx.strokeStyle = '#2a2a35';
      ctx.fillStyle = '#9a9aa4';
      ctx.lineWidth = 1;
      for (const t of p.ticks) {
        ctx.beginPath();
        ctx.moveTo(left, y(t));
        ctx.lineTo(right, y(t));
        ctx.stroke();
        ctx.fillText(String(t), 8, y(t) + 4);
      }
      ctx.fillText(p.label, left, p.top - 3);
    }
    const line = (values: ArrayLike<number>, colour: string, p: (typeof panels)[number], transform: (v: number) => number) => {
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let n = 0; n < values.length; n++) {
        const v = Math.max(p.lo, Math.min(p.hi, transform(values[n])));
        const yy = p.top + p.h - ((v - p.lo) / (p.hi - p.lo)) * p.h;
        if (n === 0) ctx.moveTo(x(n), yy);
        else ctx.lineTo(x(n), yy);
      }
      ctx.stroke();
    };
    const average = (a: Float64Array) => a.reduce((s, v) => s + v, 0) / a.length;
    const mMean = average(stats.mean), mRms = average(stats.rms);
    line(stats.similarity, '#6ba6e4', panels[0], (v) => v);
    line(stats.mean, '#e8b43a', panels[1], (v) => (100 * (v - mMean)) / mMean);
    line(stats.rms, '#c792ea', panels[1], (v) => (100 * (v - mRms)) / mRms);
    const legendY = panels[1].top + panels[1].h + 16;
    ctx.fillStyle = '#e8b43a';
    ctx.fillText('mean', left, legendY);
    ctx.fillStyle = '#c792ea';
    ctx.fillText('RMS contrast', left + 48, legendY);
    ctx.fillStyle = '#9a9aa4';
    ctx.fillText('shaded: noise before and after the images', left + 150, legendY);
    ctx.strokeStyle = 'rgba(244, 241, 234, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x(frame), panels[0].top);
    ctx.lineTo(x(frame), panels[1].top + panels[1].h);
    ctx.stroke();
    ctx.fillStyle = '#9a9aa4';
    ctx.textAlign = 'right';
    ctx.fillText(`${(rows.length / settings.fps).toFixed(1)} s`, right, legendY);
    ctx.textAlign = 'left';
  }

  function summarise(): void {
    if (!current) return;
    const { built, settings } = current;
    const { stats, rows } = built;
    const range = (a: Float64Array) => {
      let lo = Infinity, hi = -Infinity;
      for (const v of a) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      return [lo, hi];
    };
    const [m0, m1] = range(stats.mean);
    const [r0, r1] = range(stats.rms);
    const peaks = rows.filter((r) => r.segment === 'stimulus' && r.weight === Math.max(...rows.map((q) => q.weight)));
    const minima = rows.filter((r) => r.segment === 'stimulus' && r.weight === 0);
    const peakSim = Math.min(...peaks.map((r) => stats.similarity[r.frame]));
    const minSim = Math.max(...minima.map((r) => Math.abs(stats.similarity[r.frame])));
    const stim = rows.filter((r) => r.segment === 'stimulus').map((r) => stats.similarity[r.frame]);
    const fMax = Math.min(settings.fps / 2, 4 * settings.tagHz);
    const tag = peakFrequency(stim, settings.fps, Math.max(0.05, settings.tagHz / 4), fMax, 0.005);
    measured.textContent =
      `Mean ${((m0 + m1) / 2).toFixed(4)} in every frame (range ${(m1 - m0).toFixed(5)}); ` +
      `RMS contrast ${((r0 + r1) / 2).toFixed(4)} (range ${((100 * (r1 - r0)) / r1).toFixed(2)} %). ` +
      `Similarity to the image: at least ${peakSim.toFixed(3)} at every peak, at most ${minSim.toFixed(2)} in absolute value at every minimum; ` +
      `its spectrum peaks at ${tag.toFixed(2)} Hz. Clipped by the display: ${(100 * built.clippedShare).toFixed(4)} % of all pixel values.`;
    clipWarning.hidden = built.clippedShare <= CLIP_WARNING;
    clipWarning.textContent =
      'More than 0.1 % of the pixel values were clipped to black or white, which changes brightness and contrast slightly. Set a lower RMS contrast under Timing and method.';
  }

  async function checkRefresh(): Promise<void> {
    if (!current) return;
    const fps = current.settings.fps;
    const hz = await measureRefresh();
    const ratio = hz / fps;
    const whole = Math.round(ratio) >= 1 && Math.abs(ratio - Math.round(ratio)) < 0.04;
    refresh.textContent = whole
      ? `This display refreshes at about ${hz.toFixed(0)} Hz, a whole multiple of ${fps} frames per second.`
      : `This display refreshes at about ${hz.toFixed(0)} Hz, which is not a whole multiple of ${fps} frames per second, so the preview shows some frames longer than others.`;
    refresh.classList.toggle('warning', !whole);
  }

  async function build(): Promise<void> {
    const plan = setup.plan();
    if (plan.errors.length > 0) return;
    const settings = setup.settings();
    const items = setup.images();
    building = true;
    setPlaying(false);
    updateBuildButton();
    cancelButton.hidden = false;
    progressRow.hidden = false;
    progress.value = 0;
    eta.textContent = 'Preparing the images…';
    note.textContent = '';
    const started = performance.now();
    try {
      const images: Float64Array[] = [];
      for (const item of items) {
        let grey = prepareImage(await item.load(), settings.size);
        if (settings.outline) grey = applyOutline(grey, settings.size, settings.ellipse);
        images.push(grey);
      }
      const built = await worker.build(
        {
          images,
          size: settings.size,
          params: settings,
          method: settings.method,
          normalise: settings.normalise ? { mean: settings.normMean, rms: settings.normRms } : null,
          seed: settings.seed,
          fixation: settings.fixation,
        },
        (done, total) => {
          progress.value = done / total;
          const elapsed = (performance.now() - started) / 1000;
          const left = (elapsed / done) * (total - done);
          eta.textContent = `${done} of ${total} frames · about ${Math.ceil(left)} s left`;
        },
      );
      const seconds = (performance.now() - started) / 1000;
      current = { built, settings, imageNames: items.map((item) => item.label) };
      result.hidden = false;
      scrub.max = String(built.rows.length - 1);
      playerNote.textContent = `This preview shows frames by elapsed time at ${settings.fps} frames per second. Browsers do not guarantee exact frame timing, so use the downloads for experiments.`;
      note.textContent = `Built ${built.rows.length} frames in ${seconds.toFixed(1)} s.`;
      summarise();
      show(0);
      for (const listener of listeners) listener(current);
      void checkRefresh();
    } catch (error) {
      note.textContent = error instanceof Error && error.message === 'Cancelled.' ? 'Build cancelled.' : `The build failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      building = false;
      cancelButton.hidden = true;
      progressRow.hidden = true;
      updateBuildButton();
    }
  }

  buildButton.addEventListener('click', () => void build());
  cancelButton.addEventListener('click', () => worker.restart());
  playButton.addEventListener('click', () => setPlaying(!playing));
  $<HTMLButtonElement>('#seq-back').addEventListener('click', () => {
    setPlaying(false);
    show(frame - 1);
  });
  $<HTMLButtonElement>('#seq-forward').addEventListener('click', () => {
    setPlaying(false);
    show(frame + 1);
  });
  scrub.addEventListener('input', () => {
    setPlaying(false);
    show(Number(scrub.value));
  });
  window.addEventListener('resize', drawPlot);

  return {
    onBuilt(listener) {
      listeners.add(listener);
    },
  };
}
