/** The Downloads panel under the player: PNG frames (ZIP), video, and the parameter and schedule files. */
import { scheduleCsv } from '../core/schedule';
import { baseName, parametersJson, type ExportInfo } from '../export/params';
import { makeVideo, videoSupport } from '../export/video';
import { RiseWorker } from '../worker/client';
import type { BuiltResult, SequencePlayer } from './sequence-player';

function save(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const megabytes = (bytes: number) => `${(bytes / 1048576).toFixed(bytes < 10 * 1048576 ? 1 : 0)} MB`;

export function mountDownloads(container: HTMLElement, player: SequencePlayer): void {
  container.innerHTML = `
    <h4 class="section-label">Downloads</h4>
    <div class="button-row">
      <button type="button" class="button button-primary" data-download="zip">PNG frames (ZIP)</button>
      <button type="button" class="button" data-download="video">Video</button>
      <button type="button" class="button button-small" data-download="parameters">parameters.json</button>
      <button type="button" class="button button-small" data-download="schedule">schedule.csv</button>
    </div>
    <p class="small" data-role="progress" aria-live="polite"></p>
    <p class="muted small">PNG frames are lossless: use them for research, presented with Psychtoolbox or PsychoPy on a display locked to the frame rate. Video is compressed, which changes pixel values and can undo the matched brightness and contrast. It is meant for viewing and sharing.</p>`;
  const button = (name: string) => container.querySelector<HTMLButtonElement>(`[data-download="${name}"]`)!;
  const line = container.querySelector<HTMLElement>('[data-role="progress"]')!;
  const worker = new RiseWorker();
  let result: BuiltResult | null = null;
  let busy = false;

  const info = (): ExportInfo => ({ ...result!, created: new Date().toISOString() });

  async function setUp(next: BuiltResult, fresh = true): Promise<void> {
    result = next;
    if (fresh) line.textContent = '';
    const video = button('video');
    const kind = await videoSupport(next.built.size, next.settings.fps);
    video.disabled = !kind;
    video.textContent = kind ? `Video (${kind.extension.toUpperCase()})` : 'Video';
    video.title = kind ? '' : 'This browser cannot encode video (no WebCodecs encoder for H.264 or VP9). The PNG frames are available.';
    if (!kind && fresh) line.textContent = 'This browser cannot encode video; the PNG frames are available.';
  }

  async function run(name: string, task: () => Promise<void>): Promise<void> {
    if (!result || busy) return;
    busy = true;
    for (const b of container.querySelectorAll<HTMLButtonElement>('button')) b.disabled = true;
    try {
      await task();
    } catch (error) {
      line.textContent = `The ${name} could not be made: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      busy = false;
      for (const b of container.querySelectorAll<HTMLButtonElement>('button')) b.disabled = false;
      if (result) await setUp(result, false).then(() => undefined, () => undefined);
    }
  }

  button('zip').addEventListener('click', () =>
    void run('ZIP', async () => {
      const current = result!;
      const started = performance.now();
      const { zip, frames } = await worker.zip(info(), (done, total) => {
        line.textContent = `Encoding PNG frames: ${done} of ${total}…`;
      });
      // The frames were lent to the worker; put them back for the player.
      current.built.frames = frames;
      save(new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }), `${baseName(current.settings)}.zip`);
      line.textContent = `ZIP ready: ${current.built.rows.length} PNG frames, ${megabytes(zip.byteLength)}, made in ${((performance.now() - started) / 1000).toFixed(1)} s.`;
    }),
  );

  button('video').addEventListener('click', () =>
    void run('video', async () => {
      const current = result!;
      const kind = await videoSupport(current.built.size, current.settings.fps);
      if (!kind) throw new Error('this browser cannot encode video.');
      const blob = await makeVideo(current.built, current.settings.fps, kind, (done, total) => {
        line.textContent = `Encoding video: ${done} of ${total} frames…`;
      });
      save(blob, `${baseName(current.settings)}.${kind.extension}`);
      line.textContent = `Video ready: ${kind.extension.toUpperCase()}, ${megabytes(blob.size)}, ${current.built.rows.length} frames at ${current.settings.fps} frames per second.`;
    }),
  );

  button('parameters').addEventListener('click', () => {
    if (result) save(new Blob([parametersJson(info())], { type: 'application/json' }), 'parameters.json');
  });
  button('schedule').addEventListener('click', () => {
    if (result) save(new Blob([scheduleCsv(result.built.rows)], { type: 'text/csv' }), 'schedule.csv');
  });

  player.onBuilt((next) => void setUp(next));
}
