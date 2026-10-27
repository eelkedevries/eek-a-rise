/** Checks a sequence's settings before anything is rendered: the schedule rules and the size limits. */
import { frameCounts, ScheduleError, type Frames, type ScheduleParams } from './schedule';

export const MAX_IMAGES = 64;
/** 8-bit frames held for the player and the downloads. */
export const MAX_FRAME_BYTES = 400 * 1024 * 1024;
/** Prepared images held in the worker (64 images at 400 × 400). */
export const MAX_IMAGE_PIXELS = 64 * 400 * 400;

export interface PlanInput extends Omit<ScheduleParams, 'nImages'> {
  size: number;
  nImages: number;
  normalise: boolean;
  normMean: number;
  normRms: number;
}

export interface Plan {
  frames: Frames | null;
  totalFrames: number;
  bytes: number;
  errors: string[];
  notes: string[];
}

export function planSequence(input: PlanInput): Plan {
  const errors: string[] = [];
  const notes: string[] = [];
  let frames: Frames | null = null;
  if (input.nImages < 1) errors.push('Add at least one image.');
  if (input.nImages > MAX_IMAGES) errors.push(`A sequence can hold at most ${MAX_IMAGES} images.`);
  try {
    frames = frameCounts({ ...input, nImages: Math.max(1, input.nImages) });
  } catch (error) {
    if (!(error instanceof ScheduleError)) throw error;
    errors.push(error.message);
  }
  if (input.normalise) {
    if (!(input.normMean > 0 && input.normMean < 1)) errors.push('The mean must lie between 0 and 1.');
    if (!(input.normRms > 0 && input.normRms <= 0.5)) errors.push('The RMS contrast must lie above 0 and at most 0.5.');
  }
  const totalFrames = frames ? frames.baseline + frames.stimulus + frames.post : 0;
  const bytes = totalFrames * input.size * input.size;
  if (bytes > MAX_FRAME_BYTES) {
    errors.push(`The sequence would need ${Math.round(bytes / 1048576)} MB of frames; the limit is ${MAX_FRAME_BYTES / 1048576} MB. Shorten it or use a smaller image size.`);
  }
  if (input.nImages * input.size * input.size > MAX_IMAGE_PIXELS) {
    errors.push(`At ${input.size} × ${input.size} px a sequence can hold at most ${Math.floor(MAX_IMAGE_PIXELS / (input.size * input.size))} images.`);
  }
  if (frames && input.nImages >= 1) {
    const shown = Math.min(input.nImages, Math.ceil(frames.cycles / input.cyclesPerImage));
    if (shown < input.nImages) notes.push(`Only the first ${shown} of the ${input.nImages} images are shown; all of them are used for matching brightness and contrast.`);
    if (frames.cycles % (input.cyclesPerImage * input.nImages) !== 0 && frames.cycles > input.cyclesPerImage * input.nImages) {
      notes.push('The images do not all appear equally often.');
    }
  }
  if (input.tagHz > 3) notes.push('Content changes faster than 3 times per second. Visitors sensitive to flicker may prefer lower rates.');
  return { frames, totalFrames, bytes, errors, notes };
}
