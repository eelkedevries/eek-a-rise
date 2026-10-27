import { DEFAULT_ELLIPSE, type Ellipse } from './core/preprocess';
import type { Method } from './core/rise';
import { CHESSBOARD_SIZE, chessboard, chessboardOnGrey } from './examples/chessboards';
import { decodeUpload } from './image-input';

/** An image ready for preparation: a decoded bitmap, or grey values in [0, 1] on a square grid. */
export type ImageSource = { kind: 'bitmap'; bitmap: ImageBitmap } | { kind: 'grey'; grey: Float64Array; size: number };

export interface ImageItem {
  id: string;
  label: string;
  group: string;
  kind: 'face' | 'upload' | 'chessboard';
  /** For the demo faces: the expression that differs (eyes or mouth), from the file name. */
  band?: 'eyes' | 'mouth';
  thumb: string;
  load(): Promise<ImageSource>;
}

interface ManifestEntry {
  file: string;
  identity: string;
  band: 'eyes' | 'mouth';
  expression: string;
  label: string;
}

const BASE = import.meta.env.BASE_URL;
const items: ImageItem[] = [];
const listeners = new Set<() => void>();
let uploads = 0;

export function onItemsChange(listener: () => void): void {
  listeners.add(listener);
}

function changed(): void {
  for (const listener of listeners) listener();
}

export function allItems(): readonly ImageItem[] {
  return items;
}

export function itemById(id: string): ImageItem | undefined {
  return items.find((item) => item.id === id);
}

function greyThumb(grey: Float64Array, size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d')!;
  const data = context.createImageData(size, size);
  for (let i = 0; i < grey.length; i++) {
    const v = Math.round(Math.min(1, Math.max(0, grey[i])) * 255);
    data.data[4 * i] = data.data[4 * i + 1] = data.data[4 * i + 2] = v;
    data.data[4 * i + 3] = 255;
  }
  context.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}

async function bitmapFromUrl(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return createImageBitmap(await response.blob());
}

export async function loadExamples(): Promise<void> {
  const response = await fetch(`${BASE}examples/manifest.json`);
  const manifest: ManifestEntry[] = await response.json();
  const names: Record<string, string> = { ida: 'Ida', ben: 'Ben', cas: 'Cas' };
  for (const entry of manifest) {
    const url = `${BASE}examples/faces/${entry.file}`;
    items.push({
      id: entry.file.replace(/\.png$/, ''),
      label: entry.label,
      group: names[entry.identity] ?? entry.identity,
      kind: 'face',
      band: entry.band,
      thumb: url,
      load: async () => ({ kind: 'bitmap', bitmap: await bitmapFromUrl(url) }),
    });
  }
  for (const [id, label, make] of [
    ['chessboard', 'Chessboard', chessboard],
    ['chessboard-on-grey', 'Chessboard on grey', chessboardOnGrey],
  ] as const) {
    const grey = make();
    items.push({
      id,
      label,
      group: 'Chessboards',
      kind: 'chessboard',
      thumb: greyThumb(grey, CHESSBOARD_SIZE),
      load: async () => ({ kind: 'grey', grey, size: CHESSBOARD_SIZE }),
    });
  }
  changed();
}

/** Decodes an uploaded file on this device and adds it to the gallery. */
export async function addUpload(file: File): Promise<ImageItem> {
  const bitmap = await decodeUpload(file);
  const canvas = document.createElement('canvas');
  const side = Math.min(bitmap.width, bitmap.height);
  canvas.width = canvas.height = 144;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 144, 144);
  uploads++;
  const item: ImageItem = {
    id: `upload-${uploads}`,
    label: file.name || `Your image ${uploads}`,
    group: 'Your images',
    kind: 'upload',
    thumb: canvas.toDataURL('image/jpeg', 0.85),
    load: async () => ({ kind: 'bitmap', bitmap }),
  };
  items.push(item);
  changed();
  return item;
}

// ---------------------------------------------------------------- sequence set-up

export interface SequenceSettings {
  size: number;
  outline: boolean;
  ellipse: Ellipse;
  fps: number;
  tagHz: number;
  cyclesPerImage: number;
  baselineS: number;
  stimulusS: number;
  postS: number;
  peak: number;
  method: Method;
  normalise: boolean;
  normMean: number;
  normRms: number;
  fixation: boolean;
  seed: number;
}

/** The defaults of the specification (Defaults and their provenance). */
export const DEFAULT_SETTINGS: SequenceSettings = {
  size: 400,
  outline: false,
  ellipse: { ...DEFAULT_ELLIPSE },
  fps: 60,
  tagHz: 2,
  cyclesPerImage: 1,
  baselineS: 1,
  stimulusS: 4.5,
  postS: 0.5,
  peak: 1,
  method: 'circular',
  normalise: false,
  normMean: 0.5,
  normRms: 0.12,
  fixation: false,
  seed: 1,
};

const STORAGE_KEY = 'eek-a-rise:sequence-settings';

/** Parameters only; images are never stored. */
export function loadSettings(): SequenceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw), ellipse: { ...DEFAULT_ELLIPSE, ...JSON.parse(raw).ellipse } };
  } catch {
    // Storage may be unavailable (private windows, blocked site data); the defaults apply.
  }
  return structuredClone(DEFAULT_SETTINGS);
}

export function saveSettings(settings: SequenceSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Preferences are a convenience; nothing depends on them being kept.
  }
}

/** The nine eye-expression faces in manifest order, as the published clip's eye band shows them. */
export function demoSequenceIds(): string[] {
  return items.filter((item) => item.kind === 'face' && item.band === 'eyes').map((item) => item.id);
}
