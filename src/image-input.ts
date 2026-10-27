export const MAX_SIDE = 1600;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export class ImageInputError extends Error {}

/** Returns the bitmap itself if it already fits, otherwise a downscaled copy. */
export async function fitWithin(bitmap: ImageBitmap, maxSide = MAX_SIDE): Promise<ImageBitmap> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return bitmap;

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return createImageBitmap(canvas);
}

/** Decodes a visitor's file locally; nothing is sent over the network. */
export async function decodeUpload(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith('image/')) {
    throw new ImageInputError('That file is not an image. Please choose a JPEG or PNG image.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ImageInputError('That image is larger than 25 MB. Please choose a smaller one.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageInputError('This browser cannot open that image. Please try a JPEG or PNG.');
  }
  return fitWithin(bitmap);
}

/** Calls onFile for every image dropped on the element, highlighting it while a file is dragged over. */
export function acceptDrops(element: HTMLElement, onFile: (file: File) => void): void {
  let depth = 0;
  element.addEventListener('dragenter', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    depth++;
    element.classList.add('dragging');
  });
  element.addEventListener('dragover', (event) => {
    if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
  });
  element.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) element.classList.remove('dragging');
  });
  element.addEventListener('drop', (event) => {
    event.preventDefault();
    depth = 0;
    element.classList.remove('dragging');
    for (const file of Array.from(event.dataTransfer?.files ?? [])) onFile(file);
  });
}
