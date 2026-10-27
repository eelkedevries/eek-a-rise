/**
 * Complex FFT for any length, on separate real and imaginary Float64Arrays.
 *
 * Conventions follow numpy.fft: the forward transform is unscaled,
 * X[k] = sum_t x[t] exp(-2 pi i t k / n), and the inverse is scaled by 1/n.
 * Lengths whose prime factors are all 2, 3 or 5 use a self-sorting (Stockham)
 * mixed-radix transform with radices 4, 2, 3 and 5; any other length uses
 * Bluestein's chirp-z algorithm on a power-of-two transform.
 */

interface Stage {
  radix: number;
  /** Length of the sub-transforms that remain after this stage. */
  m: number;
  /** Distance between the members of one sub-sequence. */
  stride: number;
  /** Twiddles w_n^(p k) for p < m and 1 <= k < radix, stored at (p * (radix - 1) + k - 1). */
  twRe: Float64Array;
  twIm: Float64Array;
}

interface MixedPlan {
  kind: 'mixed';
  n: number;
  stages: Stage[];
  bufRe: Float64Array;
  bufIm: Float64Array;
}

interface BluesteinPlan {
  kind: 'bluestein';
  n: number;
  inner: MixedPlan;
  chirpRe: Float64Array;
  chirpIm: Float64Array;
  /** FFT of the conjugate chirp filter, length inner.n. */
  filterRe: Float64Array;
  filterIm: Float64Array;
  workRe: Float64Array;
  workIm: Float64Array;
}

type Plan = MixedPlan | BluesteinPlan;

const plans = new Map<number, Plan>();

function factorise(n: number): number[] | null {
  const factors: number[] = [];
  let rest = n;
  while (rest % 4 === 0) {
    factors.push(4);
    rest /= 4;
  }
  for (const p of [2, 3, 5]) {
    while (rest % p === 0) {
      factors.push(p);
      rest /= p;
    }
  }
  return rest === 1 ? factors : null;
}

function mixedPlan(n: number, factors: number[]): MixedPlan {
  const stages: Stage[] = [];
  let len = n;
  let stride = 1;
  for (const radix of factors) {
    const m = len / radix;
    const twRe = new Float64Array(m * (radix - 1));
    const twIm = new Float64Array(m * (radix - 1));
    for (let p = 0; p < m; p++) {
      for (let k = 1; k < radix; k++) {
        const angle = (-2 * Math.PI * p * k) / len;
        twRe[p * (radix - 1) + k - 1] = Math.cos(angle);
        twIm[p * (radix - 1) + k - 1] = Math.sin(angle);
      }
    }
    stages.push({ radix, m, stride, twRe, twIm });
    len = m;
    stride *= radix;
  }
  return { kind: 'mixed', n, stages, bufRe: new Float64Array(n), bufIm: new Float64Array(n) };
}

function bluesteinPlan(n: number): BluesteinPlan {
  let size = 1;
  while (size < 2 * n - 1) size *= 2;
  const inner = mixedPlan(size, factorise(size)!);
  const chirpRe = new Float64Array(n);
  const chirpIm = new Float64Array(n);
  const twoN = 2 * n;
  for (let k = 0; k < n; k++) {
    // k^2 mod 2n keeps the angle small, so the chirp stays accurate for large k.
    const angle = (-Math.PI * ((k * k) % twoN)) / n;
    chirpRe[k] = Math.cos(angle);
    chirpIm[k] = Math.sin(angle);
  }
  const filterRe = new Float64Array(size);
  const filterIm = new Float64Array(size);
  filterRe[0] = chirpRe[0];
  filterIm[0] = -chirpIm[0];
  for (let k = 1; k < n; k++) {
    filterRe[k] = filterRe[size - k] = chirpRe[k];
    filterIm[k] = filterIm[size - k] = -chirpIm[k];
  }
  runMixed(inner, filterRe, filterIm);
  return {
    kind: 'bluestein',
    n,
    inner,
    chirpRe,
    chirpIm,
    filterRe,
    filterIm,
    workRe: new Float64Array(size),
    workIm: new Float64Array(size),
  };
}

function planFor(n: number): Plan {
  let plan = plans.get(n);
  if (!plan) {
    const factors = factorise(n);
    plan = factors ? mixedPlan(n, factors) : bluesteinPlan(n);
    plans.set(n, plan);
  }
  return plan;
}

const C3 = -0.5;
const S3 = Math.sqrt(3) / 2;
const C51 = Math.cos((2 * Math.PI) / 5);
const C52 = Math.cos((4 * Math.PI) / 5);
const S51 = Math.sin((2 * Math.PI) / 5);
const S52 = Math.sin((4 * Math.PI) / 5);

/**
 * One self-sorting decimation-in-frequency stage: for every sub-sequence it
 * takes the radix-point DFT of the elements p + j m, multiplies output k by
 * w_n^(p k), and writes it to position radix p + k, so that the next stage
 * finds its sub-sequences at a stride multiplied by the radix.
 */
function runStage(st: Stage, xr: Float64Array, xi: Float64Array, yr: Float64Array, yi: Float64Array): void {
  const { radix, m, stride: s, twRe, twIm } = st;
  const sm = s * m;
  for (let p = 0; p < m; p++) {
    const t = p * (radix - 1);
    const inBase = s * p;
    const outBase = s * radix * p;
    if (radix === 4) {
      const w1r = twRe[t], w1i = twIm[t], w2r = twRe[t + 1], w2i = twIm[t + 1], w3r = twRe[t + 2], w3i = twIm[t + 2];
      for (let q = 0; q < s; q++) {
        const i0 = inBase + q;
        const ar = xr[i0], ai = xi[i0];
        const br = xr[i0 + sm], bi = xi[i0 + sm];
        const cr = xr[i0 + 2 * sm], ci = xi[i0 + 2 * sm];
        const dr = xr[i0 + 3 * sm], di = xi[i0 + 3 * sm];
        const apcR = ar + cr, apcI = ai + ci, amcR = ar - cr, amcI = ai - ci;
        const bpdR = br + dr, bpdI = bi + di, bmdR = br - dr, bmdI = bi - di;
        const o = outBase + q;
        yr[o] = apcR + bpdR;
        yi[o] = apcI + bpdI;
        // X1 = (a - c) - i (b - d)
        let vr = amcR + bmdI, vi = amcI - bmdR;
        yr[o + s] = vr * w1r - vi * w1i;
        yi[o + s] = vr * w1i + vi * w1r;
        vr = apcR - bpdR;
        vi = apcI - bpdI;
        yr[o + 2 * s] = vr * w2r - vi * w2i;
        yi[o + 2 * s] = vr * w2i + vi * w2r;
        // X3 = (a - c) + i (b - d)
        vr = amcR - bmdI;
        vi = amcI + bmdR;
        yr[o + 3 * s] = vr * w3r - vi * w3i;
        yi[o + 3 * s] = vr * w3i + vi * w3r;
      }
    } else if (radix === 2) {
      const w1r = twRe[t], w1i = twIm[t];
      for (let q = 0; q < s; q++) {
        const i0 = inBase + q;
        const ar = xr[i0], ai = xi[i0], br = xr[i0 + sm], bi = xi[i0 + sm];
        const o = outBase + q;
        yr[o] = ar + br;
        yi[o] = ai + bi;
        const vr = ar - br, vi = ai - bi;
        yr[o + s] = vr * w1r - vi * w1i;
        yi[o + s] = vr * w1i + vi * w1r;
      }
    } else if (radix === 3) {
      const w1r = twRe[t], w1i = twIm[t], w2r = twRe[t + 1], w2i = twIm[t + 1];
      for (let q = 0; q < s; q++) {
        const i0 = inBase + q;
        const ar = xr[i0], ai = xi[i0];
        const br = xr[i0 + sm], bi = xi[i0 + sm];
        const cr = xr[i0 + 2 * sm], ci = xi[i0 + 2 * sm];
        const sr = br + cr, si = bi + ci, dr = br - cr, di = bi - ci;
        const mr = ar + C3 * sr, mi = ai + C3 * si;
        const o = outBase + q;
        yr[o] = ar + sr;
        yi[o] = ai + si;
        // X1 = m - i S3 (b - c), X2 = m + i S3 (b - c)
        let vr = mr + S3 * di, vi = mi - S3 * dr;
        yr[o + s] = vr * w1r - vi * w1i;
        yi[o + s] = vr * w1i + vi * w1r;
        vr = mr - S3 * di;
        vi = mi + S3 * dr;
        yr[o + 2 * s] = vr * w2r - vi * w2i;
        yi[o + 2 * s] = vr * w2i + vi * w2r;
      }
    } else {
      const w1r = twRe[t], w1i = twIm[t], w2r = twRe[t + 1], w2i = twIm[t + 1];
      const w3r = twRe[t + 2], w3i = twIm[t + 2], w4r = twRe[t + 3], w4i = twIm[t + 3];
      for (let q = 0; q < s; q++) {
        const i0 = inBase + q;
        const ar = xr[i0], ai = xi[i0];
        const br = xr[i0 + sm], bi = xi[i0 + sm];
        const cr = xr[i0 + 2 * sm], ci = xi[i0 + 2 * sm];
        const dr = xr[i0 + 3 * sm], di = xi[i0 + 3 * sm];
        const er = xr[i0 + 4 * sm], ei = xi[i0 + 4 * sm];
        const s1r = br + er, s1i = bi + ei, d1r = br - er, d1i = bi - ei;
        const s2r = cr + dr, s2i = ci + di, d2r = cr - dr, d2i = ci - di;
        const m1r = ar + C51 * s1r + C52 * s2r, m1i = ai + C51 * s1i + C52 * s2i;
        const m2r = ar + C52 * s1r + C51 * s2r, m2i = ai + C52 * s1i + C51 * s2i;
        // -i times the sine combinations
        const n1r = S51 * d1i + S52 * d2i, n1i = -(S51 * d1r + S52 * d2r);
        const n2r = S52 * d1i - S51 * d2i, n2i = -(S52 * d1r - S51 * d2r);
        const o = outBase + q;
        yr[o] = ar + s1r + s2r;
        yi[o] = ai + s1i + s2i;
        let vr = m1r + n1r, vi = m1i + n1i;
        yr[o + s] = vr * w1r - vi * w1i;
        yi[o + s] = vr * w1i + vi * w1r;
        vr = m2r + n2r;
        vi = m2i + n2i;
        yr[o + 2 * s] = vr * w2r - vi * w2i;
        yi[o + 2 * s] = vr * w2i + vi * w2r;
        vr = m2r - n2r;
        vi = m2i - n2i;
        yr[o + 3 * s] = vr * w3r - vi * w3i;
        yi[o + 3 * s] = vr * w3i + vi * w3r;
        vr = m1r - n1r;
        vi = m1i - n1i;
        yr[o + 4 * s] = vr * w4r - vi * w4i;
        yi[o + 4 * s] = vr * w4i + vi * w4r;
      }
    }
  }
}

function runMixed(plan: MixedPlan, re: Float64Array, im: Float64Array): void {
  let xr = re, xi = im, yr = plan.bufRe, yi = plan.bufIm;
  for (const st of plan.stages) {
    runStage(st, xr, xi, yr, yi);
    [xr, yr] = [yr, xr];
    [xi, yi] = [yi, xi];
  }
  if (xr !== re) {
    re.set(xr);
    im.set(xi);
  }
}

function runBluestein(plan: BluesteinPlan, re: Float64Array, im: Float64Array): void {
  const { n, inner, chirpRe, chirpIm, filterRe, filterIm, workRe, workIm } = plan;
  const size = inner.n;
  for (let k = 0; k < n; k++) {
    workRe[k] = re[k] * chirpRe[k] - im[k] * chirpIm[k];
    workIm[k] = re[k] * chirpIm[k] + im[k] * chirpRe[k];
  }
  workRe.fill(0, n);
  workIm.fill(0, n);
  runMixed(inner, workRe, workIm);
  // Multiply by the filter, then invert via conjugation: ifft(x) = conj(fft(conj(x))) / size.
  for (let k = 0; k < size; k++) {
    const r = workRe[k] * filterRe[k] - workIm[k] * filterIm[k];
    const i = workRe[k] * filterIm[k] + workIm[k] * filterRe[k];
    workRe[k] = r;
    workIm[k] = -i;
  }
  runMixed(inner, workRe, workIm);
  for (let k = 0; k < n; k++) {
    const cr = workRe[k] / size, ci = -workIm[k] / size;
    re[k] = cr * chirpRe[k] - ci * chirpIm[k];
    im[k] = cr * chirpIm[k] + ci * chirpRe[k];
  }
}

/** In-place forward FFT of length re.length (unscaled). */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n <= 1) return;
  const plan = planFor(n);
  if (plan.kind === 'mixed') runMixed(plan, re, im);
  else runBluestein(plan, re, im);
}

/** In-place inverse FFT (scaled by 1/n). */
export function ifft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let k = 0; k < n; k++) im[k] = -im[k];
  fft(re, im);
  for (let k = 0; k < n; k++) {
    re[k] /= n;
    im[k] = -im[k] / n;
  }
}

const lineBuffers = new Map<number, [Float64Array, Float64Array]>();

function lineBuffer(n: number): [Float64Array, Float64Array] {
  let buf = lineBuffers.get(n);
  if (!buf) {
    buf = [new Float64Array(n), new Float64Array(n)];
    lineBuffers.set(n, buf);
  }
  return buf;
}

function transform2(re: Float64Array, im: Float64Array, height: number, width: number, line: typeof fft): void {
  if (re.length !== height * width || im.length !== height * width) throw new Error('fft2: array size does not match height × width');
  const [rowRe, rowIm] = lineBuffer(width);
  for (let y = 0; y < height; y++) {
    const o = y * width;
    rowRe.set(re.subarray(o, o + width));
    rowIm.set(im.subarray(o, o + width));
    line(rowRe, rowIm);
    re.set(rowRe, o);
    im.set(rowIm, o);
  }
  const [colRe, colIm] = lineBuffer(height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      colRe[y] = re[y * width + x];
      colIm[y] = im[y * width + x];
    }
    line(colRe, colIm);
    for (let y = 0; y < height; y++) {
      re[y * width + x] = colRe[y];
      im[y * width + x] = colIm[y];
    }
  }
}

/** In-place 2-D forward FFT of a row-major height × width array (numpy.fft.fft2). */
export function fft2(re: Float64Array, im: Float64Array, height: number, width: number): void {
  transform2(re, im, height, width, fft);
}

/** In-place 2-D inverse FFT (numpy.fft.ifft2: scaled by 1/(height · width)). */
export function ifft2(re: Float64Array, im: Float64Array, height: number, width: number): void {
  transform2(re, im, height, width, ifft);
}
