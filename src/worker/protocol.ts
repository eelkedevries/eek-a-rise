/** Messages between the page and the worker. */

export type OneImageMethod = 'circular' | 'sign' | 'plain';

export interface SourceStats {
  mean: number;
  rms: number;
}

export interface FrameResult {
  a: number;
  /** The frame after the display mapping, size × size. */
  pixels: Uint8Array;
  /** Mean and RMS contrast before the display mapping. */
  mean: number;
  rms: number;
  /** Mean and RMS contrast of the 8-bit frame (values / 255). */
  mean8: number;
  rms8: number;
  clipped: number;
}

export type Request =
  | { id: number; type: 'prepare'; image: Float64Array; size: number; seed: number; method: OneImageMethod }
  | { id: number; type: 'frame'; a: number }
  | { id: number; type: 'cycle'; n: number };

export type Result = SourceStats | FrameResult | FrameResult[];

export type Response = { id: number; ok: true; result: Result } | { id: number; ok: false; error: string };
