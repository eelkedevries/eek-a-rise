# Task: Downloads (lossless PNG frames and timed video)

## Goal

Let a visitor download a built trial as lossless greyscale PNG frames in a ZIP,
and as an H.264 MP4 whose frames are timestamped exactly, each with the
parameters and the frame schedule.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification: *Exports*, *Privacy*.
- The built trial is a `Uint8Array` of `nFrames × 400 × 400` grey values (prompt
  009). The schedule rows come from `src/core/schedule.ts`.
- Text for the download section: `explainer_texts.md` section 5, *Downloads*.

## Required changes

1. Add `src/export/params.ts`: `parameters.json` (every parameter, the seed, the
   app version from `package.json`, the identity names and image labels in use,
   the clipped share, and an ISO date) and `schedule.csv` (the columns and number
   format of `tools/reference/golden/schedule_default.csv`).
2. **PNG ZIP:**
   - encode each frame as 8-bit greyscale PNG with `fast-png` (pinned exact
     version);
   - pack it with `fflate` (pinned exact version, no compression for the PNGs) as
     `eek-a-rise_<seed>_<cue>/frame_0000.png …`, plus `parameters.json`,
     `schedule.csv` and a short `README.txt` (what the files are, the frame rate,
     the lossless-versus-video note);
   - encode in the worker, with progress.
3. **Video:**
   - with WebCodecs, configure an H.264 encoder (`avc1.*`, checked with
     `VideoEncoder.isConfigSupported`) at 400 × 400 and the trial frame rate, with
     a high bitrate (at least 8 Mbit/s) and a keyframe every second;
   - convert each grey frame to I420 (Y = grey, U = V = 128);
   - give frame n the timestamp `round(n · 1e6 / fps)` µs and duration
     `1e6 / fps`;
   - mux with Mediabunny (pinned exact version) into MP4;
   - where H.264 encoding is unsupported, fall back to VP9 in WebM; without
     WebCodecs, disable the button with an explanation;
   - add `parameters.json` and `schedule.csv` as separate small downloads next to
     the button.
4. Add a *Downloads* panel under the player with the two buttons, file sizes when
   known, progress, and the *Downloads* note.
5. Add `scripts/verify-export.sh`, which runs `ffprobe` on a downloaded video and
   checks the frame count (360 for the defaults), the frame rate (60/1), the
   duration (6.000 s ± one frame) and strictly increasing timestamps. It is for
   the owner and agents, not part of `npm run check`.
6. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- server-side encoding or ffmpeg.wasm;
- other image formats (TIFF, 16-bit);
- the explainer section (prompt 011).

## Acceptance criteria

The task is complete when:
- the PNG ZIP of the default trial contains 360 greyscale PNGs. Decoding
  `frame_0075.png` returns exactly the bytes of frame 75 of the built trial (an
  automated check in the worker or a test);
- the MP4 downloaded in Chrome passes `scripts/verify-export.sh`; where headless
  Chromium lacks H.264, the WebM passes it, and the owner checks the MP4 in Chrome;
- `npm run check` passes.

## Checks

`npm run check`; `npm run deploy`; download both formats on the live page and run
`scripts/verify-export.sh` on the video.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push. Then
run `npm run deploy`.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
