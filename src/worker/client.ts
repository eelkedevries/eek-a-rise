/** Typed promise interface to the RISE worker. */
import type { BuildOptions, BuiltSequence } from '../core/build';
import type { ExportInfo } from '../export/params';
import type { FrameResult, OneImageMethod, Request, Response, SourceStats, ZipResult } from './protocol';

type Pending = { resolve: (value: never) => void; reject: (error: Error) => void; progress?: (done: number, total: number) => void };
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

export class RiseWorker {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor() {
    this.worker = this.start();
  }

  private start(): Worker {
    const worker = new Worker(new URL('./rise.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<Response>) => {
      const message = event.data;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      if ('progress' in message) {
        pending.progress?.(message.progress, message.total);
        return;
      }
      this.pending.delete(message.id);
      if (message.ok) pending.resolve(message.result as never);
      else pending.reject(new Error(message.error));
    };
    worker.onerror = (event) => {
      for (const p of this.pending.values()) p.reject(new Error(event.message || 'The worker stopped.'));
      this.pending.clear();
    };
    return worker;
  }

  private call<T>(request: WithoutId<Request>, transfer: Transferable[] = [], progress?: Pending['progress']): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: never) => void, reject, progress });
      this.worker.postMessage({ ...request, id }, transfer);
    });
  }

  /** Stops whatever the worker is doing and starts a fresh one; pending calls are rejected. */
  restart(): void {
    this.worker.terminate();
    for (const p of this.pending.values()) p.reject(new Error('Cancelled.'));
    this.pending.clear();
    this.worker = this.start();
  }

  prepare(image: Float64Array, size: number, seed: number, method: OneImageMethod): Promise<SourceStats> {
    const copy = Float64Array.from(image);
    return this.call({ type: 'prepare', image: copy, size, seed, method }, [copy.buffer]);
  }

  frame(a: number): Promise<FrameResult> {
    return this.call({ type: 'frame', a });
  }

  cycle(n: number): Promise<FrameResult[]> {
    return this.call({ type: 'cycle', n });
  }

  /**
   * Makes the PNG ZIP. The frames are lent to the worker (transferred, not copied)
   * and come back with the result; until then info.built.frames is empty.
   */
  zip(info: ExportInfo, progress: (done: number, total: number) => void): Promise<ZipResult> {
    return this.call({ type: 'zip', info }, [info.built.frames.buffer], progress);
  }

  /** Renders a whole sequence; the prepared images are transferred, so the caller passes copies it can spare. */
  build(options: BuildOptions, progress: (done: number, total: number) => void): Promise<BuiltSequence> {
    return this.call({ type: 'build', options }, options.images.map((image) => image.buffer), progress);
  }
}
