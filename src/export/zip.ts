/** The lossless download: 8-bit grey PNG frames and the text files, in one ZIP (fast-png and fflate). */
import { encode } from 'fast-png';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { scheduleCsv } from '../core/schedule';
import { baseName, frameStatsCsv, parametersJson, readmeText, type ExportInfo } from './params';

export function framePng(frames: Uint8Array, size: number, n: number): Uint8Array {
  const pixels = size * size;
  return encode({ width: size, height: size, data: frames.subarray(n * pixels, (n + 1) * pixels), depth: 8, channels: 1 }, { zlib: { level: 6 } });
}

export function makeZip(info: ExportInfo, onProgress?: (done: number, total: number) => void): Uint8Array {
  const { built, settings } = info;
  const folder = baseName(settings);
  const files: Zippable = {};
  const total = built.rows.length;
  for (let n = 0; n < total; n++) {
    // PNG data is already compressed, so the archive only stores it.
    files[`${folder}/frame_${String(n).padStart(4, '0')}.png`] = [framePng(built.frames, built.size, n), { level: 0 }];
    if ((n + 1) % 10 === 0 || n + 1 === total) onProgress?.(n + 1, total);
  }
  files[`${folder}/parameters.json`] = strToU8(parametersJson(info));
  files[`${folder}/schedule.csv`] = strToU8(scheduleCsv(built.rows));
  files[`${folder}/frame_stats.csv`] = strToU8(frameStatsCsv(built));
  files[`${folder}/README.txt`] = strToU8(readmeText(info));
  return zipSync(files, { level: 6 });
}
