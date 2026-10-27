/// <reference lib="webworker" />
/** All spectral work runs here; the page only draws. */
import { buildSequence } from '../core/build';
import { makeZip } from '../export/zip';
import { Prng } from '../core/prng';
import { noisePhase, plainTarget, riseFrame, targets } from '../core/rise';
import { spectrum } from '../core/spectrum';
import { mean, rms, toUint8 } from '../core/stats';
import type { FrameResult, OneImageMethod, Request, Response, Result, SourceStats } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

interface Prepared {
  size: number;
  amplitude: Float64Array;
  source: Float64Array;
  target: Float64Array;
}

let one: Prepared | null = null;

function prepare(image: Float64Array, size: number, seed: number, method: OneImageMethod): SourceStats {
  const { amplitude, phase } = spectrum(image, size, size);
  const prng = new Prng(seed);
  const R = noisePhase(prng.uniformArray(size * size), size, size);
  const r = prng.uniformArray(size * size);
  const target = method === 'plain' ? plainTarget(phase, R, size, size) : targets[method](phase, R, r, size, size);
  one = { size, amplitude, source: phase, target };
  return { mean: mean(image), rms: rms(image) };
}

function frame(a: number): FrameResult {
  if (!one) throw new Error('No image is prepared.');
  const { size, amplitude, source, target } = one;
  const f = riseFrame(amplitude, source, target, a, size, size);
  const pixels = new Uint8Array(f.length);
  const clipped = toUint8(f, pixels);
  return { a, pixels, mean: mean(f), rms: rms(f), mean8: mean(pixels) / 255, rms8: rms(pixels) / 255, clipped: clipped / f.length };
}

function handle(request: Request): [Result, Transferable[]] {
  switch (request.type) {
    case 'prepare':
      return [prepare(request.image, request.size, request.seed, request.method), []];
    case 'frame': {
      const result = frame(request.a);
      return [result, [result.pixels.buffer]];
    }
    case 'build': {
      let last = 0;
      const built = buildSequence(request.options, (done, total) => {
        if (done - last >= 10 || done === total) {
          last = done;
          self.postMessage({ id: request.id, progress: done, total } satisfies Response);
        }
      });
      const { stats } = built;
      return [built, [built.frames.buffer, stats.mean.buffer, stats.rms.buffer, stats.similarity.buffer, stats.clipped.buffer]];
    }
    case 'zip': {
      const zip = makeZip(request.info, (done, total) => self.postMessage({ id: request.id, progress: done, total } satisfies Response));
      const frames = request.info.built.frames;
      return [{ zip, frames }, [zip.buffer, frames.buffer]];
    }
    case 'cycle': {
      const results: FrameResult[] = [];
      for (let j = 0; j < request.n; j++) results.push(frame(0.5 - 0.5 * Math.cos((2 * Math.PI * j) / request.n)));
      return [results, results.map((r) => r.pixels.buffer)];
    }
  }
}

self.onmessage = (event: MessageEvent<Request>) => {
  const request = event.data;
  try {
    const [result, transfer] = handle(request);
    self.postMessage({ id: request.id, ok: true, result } satisfies Response, transfer);
  } catch (error) {
    self.postMessage({ id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) } satisfies Response);
  }
};
