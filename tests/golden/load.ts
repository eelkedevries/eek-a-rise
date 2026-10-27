import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../tools/reference/golden/', import.meta.url));

export interface FileEntry {
  file: string;
  dtype?: 'uint8' | 'uint32' | 'float32' | 'float64';
  shape?: number[];
  values?: number[];
}

export interface GoldenCase {
  name: string;
  description: string;
  tolerance: Record<string, number | string>;
  files: Record<string, FileEntry>;
}

export type Typed = Uint8Array | Uint32Array | Float32Array | Float64Array;

const manifest: { cases: GoldenCase[] } = JSON.parse(readFileSync(`${ROOT}manifest.json`, 'utf8'));

export function goldenCase(name: string): GoldenCase {
  const found = manifest.cases.find((c) => c.name === name);
  if (!found) throw new Error(`golden case ${name} not in manifest.json`);
  return found;
}

/** Reads one binary file of a case as its little-endian typed array (copied, so it is aligned). */
export function goldenArray(name: string, key: string): Typed {
  const entry = goldenCase(name).files[key];
  if (!entry?.dtype) throw new Error(`${name}.${key} is not a binary array`);
  const bytes = readFileSync(`${ROOT}${entry.file}`);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const out = { uint8: Uint8Array, uint32: Uint32Array, float32: Float32Array, float64: Float64Array }[entry.dtype];
  const array = new out(buffer);
  const expected = entry.shape!.reduce((a, b) => a * b, 1);
  if (array.length !== expected) throw new Error(`${entry.file}: ${array.length} values, expected ${expected}`);
  return array;
}

export function goldenShape(name: string, key: string): number[] {
  return goldenCase(name).files[key].shape!;
}

export function goldenText(file: string): string {
  return readFileSync(`${ROOT}${file}`, 'utf8');
}

/** Uniform values in [0, 1) from the stored uint32 draws (x / 2**32, exact in float64). */
export function uniformFrom(u: Typed, offset = 0, length = u.length - offset): Float64Array {
  const out = new Float64Array(length);
  for (let i = 0; i < length; i++) out[i] = u[offset + i] / 4294967296;
  return out;
}

export function toFloat64(a: Typed): Float64Array {
  return Float64Array.from(a);
}
