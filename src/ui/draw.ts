/** Drawing helpers shared by the two modes. */

const imageData = new WeakMap<HTMLCanvasElement, ImageData>();

/** Draws 8-bit grey pixels (size × size) on a canvas of the same size. */
export function drawGrey(canvas: HTMLCanvasElement, pixels: Uint8Array, size: number, offset = 0): void {
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = canvas.height = size;
    imageData.delete(canvas);
  }
  const context = canvas.getContext('2d')!;
  let data = imageData.get(canvas);
  if (!data) {
    data = context.createImageData(size, size);
    imageData.set(canvas, data);
  }
  const rgba = data.data;
  for (let i = 0, n = size * size; i < n; i++) {
    const v = pixels[offset + i];
    rgba[4 * i] = rgba[4 * i + 1] = rgba[4 * i + 2] = v;
    rgba[4 * i + 3] = 255;
  }
  context.putImageData(data, 0, 0);
}

/** A random 32-bit seed, shown to the visitor so a result can be reproduced. */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
