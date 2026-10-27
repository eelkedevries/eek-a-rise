/**
 * The seeded generator of the specification (Randomness): sfc32, seeded from one
 * 32-bit integer through splitmix32, with the first 12 outputs discarded.
 */

export type PrngState = [number, number, number, number];

function splitmix32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

export class Prng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number) {
    const mix = splitmix32(seed);
    this.a = mix();
    this.b = mix();
    this.c = mix();
    this.d = mix();
    for (let i = 0; i < 12; i++) this.nextUint32();
  }

  static fromState(state: PrngState): Prng {
    const prng = Object.create(Prng.prototype) as Prng;
    prng.setState(state);
    return prng;
  }

  state(): PrngState {
    return [this.a, this.b, this.c, this.d];
  }

  setState([a, b, c, d]: PrngState): void {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
  }

  nextUint32(): number {
    let a = this.a | 0, b = this.b | 0, c = this.c | 0, d = this.d | 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    return t >>> 0;
  }

  /** n uniform values in [0, 1), uint32 / 2^32, in row-major order. */
  uniformArray(n: number): Float64Array {
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) out[i] = this.nextUint32() / 4294967296;
    return out;
  }

  skip(n: number): void {
    for (let i = 0; i < n; i++) this.nextUint32();
  }
}

/**
 * Random access to the k-th uniform array of a stream of equally long arrays
 * drawn from one seed: the generator state at the start of every array is kept,
 * so array k can be redrawn without holding the earlier ones.
 */
export function uniformArrays(seed: number, count: number, length: number): (index: number) => Float64Array {
  const prng = new Prng(seed);
  const starts: PrngState[] = [];
  for (let k = 0; k < count; k++) {
    starts.push(prng.state());
    prng.skip(length);
  }
  return (index) => {
    if (index < 0 || index >= count) throw new RangeError(`uniform array ${index} of ${count}`);
    return Prng.fromState(starts[index]).uniformArray(length);
  };
}
