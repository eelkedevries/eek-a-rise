/** Typed promise interface to the RISE worker. */
import type { FrameResult, OneImageMethod, Request, Response, SourceStats } from './protocol';

type Pending = { resolve: (value: never) => void; reject: (error: Error) => void };
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

  private call<T>(request: WithoutId<Request>, transfer: Transferable[] = []): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: never) => void, reject });
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
}
