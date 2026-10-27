/** The One image tab: a weight slider, a play loop and live readouts of mean and RMS contrast. */
import { applyOutline, DEFAULT_ELLIPSE, prepareImage } from '../core/preprocess';
import type { ImageItem } from '../state';
import { RiseWorker } from '../worker/client';
import type { FrameResult, OneImageMethod, SourceStats } from '../worker/protocol';
import { drawGrey, randomSeed } from './draw';

const SIZE = 400;
const PLAY_FRAMES = 60;

export interface OneImage {
  show(item: ImageItem): Promise<void>;
}

export function mountOneImage(root: HTMLElement, status: (message: string, error?: boolean) => void): OneImage {
  const $ = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const canvas = $<HTMLCanvasElement>('.stage canvas');
  const overlay = $<SVGElement>('.outline-overlay');
  const slider = $<HTMLInputElement>('#one-weight');
  const weightOut = $<HTMLOutputElement>('#one-weight-value');
  const playButton = $<HTMLButtonElement>('#one-play');
  const noiseButton = $<HTMLButtonElement>('#one-noise');
  const seedOut = $<HTMLElement>('#one-seed');
  const outline = $<HTMLInputElement>('#one-outline');
  const readout = (name: string) => $<HTMLElement>(`[data-readout="${name}"]`);

  const worker = new RiseWorker();
  let item: ImageItem | null = null;
  let image: Float64Array | null = null;
  let seed = randomSeed();
  let ready = false;
  let busy = false;
  let wanted: number | null = null;
  let cycle: FrameResult[] | null = null;
  let playing = false;
  let start = 0;
  let version = 0;

  const method = (): OneImageMethod => ($<HTMLInputElement>('input[name="one-method"]:checked')?.value as OneImageMethod) ?? 'circular';

  const ellipse = overlay.querySelector('ellipse')!;
  ellipse.setAttribute('cx', String(DEFAULT_ELLIPSE.cx));
  ellipse.setAttribute('cy', String(DEFAULT_ELLIPSE.cy));
  ellipse.setAttribute('rx', String(DEFAULT_ELLIPSE.rx));
  ellipse.setAttribute('ry', String(DEFAULT_ELLIPSE.ry));

  const fmt = (x: number) => x.toFixed(4);

  function showSource(stats: SourceStats): void {
    readout('source-mean').textContent = fmt(stats.mean);
    readout('source-rms').textContent = fmt(stats.rms);
  }

  function showFrame(result: FrameResult): void {
    drawGrey(canvas, result.pixels, SIZE);
    readout('frame-mean').textContent = fmt(result.mean);
    readout('frame-rms').textContent = fmt(result.rms);
    readout('frame-mean8').textContent = fmt(result.mean8);
    readout('frame-rms8').textContent = fmt(result.rms8);
    readout('clipped').textContent = `${(100 * result.clipped).toFixed(3)} %`;
    weightOut.value = result.a.toFixed(2);
  }

  async function request(a: number): Promise<void> {
    wanted = a;
    if (busy || !ready) return;
    busy = true;
    try {
      while (wanted !== null) {
        const next = wanted;
        wanted = null;
        const mine = version;
        const result = await worker.frame(next);
        if (mine === version && !playing) showFrame(result);
      }
    } finally {
      busy = false;
    }
  }

  async function prepare(): Promise<void> {
    if (!image) return;
    const mine = ++version;
    ready = false;
    cycle = null;
    seedOut.textContent = String(seed);
    const prepared = outline.checked ? applyOutline(image, SIZE, DEFAULT_ELLIPSE) : image;
    const stats = await worker.prepare(prepared, SIZE, seed, method());
    if (mine !== version) return;
    showSource(stats);
    ready = true;
    if (playing) await startCycle();
    else await request(Number(slider.value));
  }

  async function startCycle(): Promise<void> {
    const mine = version;
    if (!cycle) {
      playButton.textContent = 'Preparing…';
      cycle = await worker.cycle(PLAY_FRAMES);
      if (playing) playButton.textContent = 'Pause';
    }
    if (mine !== version || !playing) return;
    start = -1;
    requestAnimationFrame(tick);
  }

  function tick(now: number): void {
    if (!playing || !cycle) return;
    // The first callback's timestamp can precede the moment Play was pressed, so time starts there.
    if (start < 0) start = now;
    // Frames are chosen by elapsed time, so a slow display skips frames rather than slowing down.
    const j = Math.floor(((now - start) / 1000) * PLAY_FRAMES) % PLAY_FRAMES;
    showFrame(cycle[j]);
    slider.value = cycle[j].a.toFixed(2);
    requestAnimationFrame(tick);
  }

  function setPlaying(on: boolean): void {
    playing = on;
    playButton.textContent = on ? 'Pause' : 'Play';
    playButton.setAttribute('aria-pressed', String(on));
    if (on) void startCycle();
    else void request(Number(slider.value));
  }

  slider.addEventListener('input', () => {
    if (playing) setPlaying(false);
    weightOut.value = Number(slider.value).toFixed(2);
    void request(Number(slider.value));
  });
  playButton.addEventListener('click', () => setPlaying(!playing));
  noiseButton.addEventListener('click', () => {
    seed = randomSeed();
    void prepare();
  });
  for (const radio of root.querySelectorAll<HTMLInputElement>('input[name="one-method"]')) radio.addEventListener('change', () => void prepare());
  outline.addEventListener('change', () => {
    overlay.toggleAttribute('hidden', !outline.checked);
    void prepare();
  });

  return {
    async show(next) {
      item = next;
      try {
        const source = await next.load();
        if (item !== next) return;
        image = prepareImage(source, SIZE);
        $<HTMLElement>('.stage-caption').textContent = next.label;
        await prepare();
      } catch (error) {
        status(error instanceof Error ? error.message : 'That image could not be prepared.', true);
      }
    },
  };
}
