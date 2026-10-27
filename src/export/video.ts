/**
 * The viewing download: H.264 in MP4 (VP9 in WebM where H.264 encoding is not
 * available), encoded frame by frame with WebCodecs through Mediabunny, with
 * frame n at exactly n / fps.
 */
import { BufferTarget, canEncodeVideo, Mp4OutputFormat, Output, VideoSample, VideoSampleSource, WebMOutputFormat } from 'mediabunny';
import type { BuiltSequence } from '../core/build';

export type VideoKind = { codec: 'avc'; extension: 'mp4'; mime: string } | { codec: 'vp9'; extension: 'webm'; mime: string };

const BITRATE = 8e6;

export async function videoSupport(size: number, fps: number): Promise<VideoKind | null> {
  if (typeof VideoEncoder === 'undefined') return null;
  if (await canEncodeVideo('avc', { width: size, height: size, bitrate: BITRATE, frameRate: fps })) {
    return { codec: 'avc', extension: 'mp4', mime: 'video/mp4' };
  }
  if (await canEncodeVideo('vp9', { width: size, height: size, bitrate: BITRATE, frameRate: fps })) {
    return { codec: 'vp9', extension: 'webm', mime: 'video/webm' };
  }
  return null;
}

/**
 * One grey frame as I420. Grey values are mapped to the video range (16–235),
 * which players assume for H.264 and VP9, so the video shows the frames' grey
 * levels; U and V are neutral.
 */
function toI420(frames: Uint8Array, size: number, n: number, out: Uint8Array): void {
  const pixels = size * size;
  const offset = n * pixels;
  for (let i = 0; i < pixels; i++) out[i] = Math.round(16 + (frames[offset + i] * 219) / 255);
  out.fill(128, pixels);
}

export async function makeVideo(built: BuiltSequence, fps: number, kind: VideoKind, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const size = built.size;
  const output = new Output({
    format: kind.codec === 'avc' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
    target: new BufferTarget(),
  });
  const source = new VideoSampleSource({ codec: kind.codec, bitrate: BITRATE, keyFrameInterval: 1 });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();
  const buffer = new Uint8Array(size * size * 1.5);
  const total = built.rows.length;
  for (let n = 0; n < total; n++) {
    toI420(built.frames, size, n, buffer);
    const sample = new VideoSample(buffer, {
      format: 'I420',
      codedWidth: size,
      codedHeight: size,
      timestamp: n / fps,
      duration: 1 / fps,
      colorSpace: { primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false },
    });
    await source.add(sample);
    sample.close();
    if ((n + 1) % 10 === 0 || n + 1 === total) onProgress?.(n + 1, total);
  }
  await output.finalize();
  return new Blob([output.target.buffer!], { type: kind.mime });
}
