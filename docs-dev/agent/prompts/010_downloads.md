# Task: Downloads (lossless PNG frames and timed video) and the export verifier

## Goal

Let a visitor download a built sequence as lossless greyscale PNG frames in a
ZIP, and as an H.264 MP4 whose frames are timestamped exactly, each with the
parameters, the frame schedule and the measured statistics; and check an export
independently.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification 0.2: *Exports*, *Validation*, *Privacy*.
- The built sequence is a `Uint8Array` of `nFrames × S × S` grey values plus the
  per-frame statistics (prompt 009). The schedule rows and `scheduleCsv` come from
  `src/core/schedule.ts`.
- Text for the download section: `explainer_texts.md` section 5, *Downloads*.

## Required changes

1. Add `src/export/params.ts`: `parameters.json` (every parameter, the seed, the
   app version from `package.json`, the image names in order, the clipped share,
   and an ISO date), `schedule.csv` and `frame_stats.csv` (frame, mean, RMS
   contrast, similarity, clipped share; 6 decimals).
2. **PNG ZIP:**
   - encode each frame as 8-bit greyscale PNG with `fast-png` (pinned exact
     version);
   - pack it with `fflate` (pinned exact version, no compression for the PNGs) as
     `eek-a-rise_<seed>/frame_0000.png …`, plus `parameters.json`,
     `schedule.csv`, `frame_stats.csv` and a short `README.txt` (what the files
     are, the frame rate, how to present the frames, the lossless-versus-video
     note, gamma);
   - encode in the worker, with progress.
3. **Video:**
   - with WebCodecs, configure an H.264 encoder (`avc1.*`, checked with
     `VideoEncoder.isConfigSupported`) at S × S and the frame rate, with a high
     bitrate (at least 8 Mbit/s) and a keyframe every second;
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
5. Add `tests/core/export.test.ts`: render a small sequence in Node, build the ZIP
   with the same export code, unzip and decode it, and require exactly the built
   frames, a schedule equal to `scheduleCsv`, and statistics recomputed from the
   decoded frames equal to `frame_stats.csv`.
6. Add `tools/reference/verify_export.py`: given a ZIP, it checks independently
   (numpy) that every frame has the same mean and RMS contrast within the 8-bit
   bounds and the same amplitude spectrum within 1 %, that the frame-to-frame
   similarity to each cycle's peak frame oscillates at the tag frequency of
   `parameters.json`, and that the frame count matches the schedule; it prints a
   JSON report and exits non-zero on failure.
7. Add `scripts/verify-export.sh`, which runs `ffprobe` on a downloaded video and
   checks the frame count (360 for the defaults), the frame rate (60/1), the
   duration (6.000 s ± one frame) and strictly increasing timestamps. It is for
   the owner and agents, not part of `npm run check`.
8. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- server-side encoding or ffmpeg.wasm;
- other image formats (TIFF, 16-bit);
- the explainer section (prompt 011).

## Acceptance criteria

The task is complete when:
- the PNG ZIP of the default sequence contains 360 greyscale PNGs that decode to
  exactly the built frames (the export test), and `verify_export.py` passes it;
- the MP4 downloaded in Chrome passes `scripts/verify-export.sh`; where headless
  Chromium lacks H.264, the WebM passes it, and the owner checks the MP4 in Chrome;
- `npm run check` passes.

## Checks

`npm run check`; `npm run deploy`; download both formats on the live page, run
`scripts/verify-export.sh` on the video and `verify_export.py` on the ZIP.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push. Then
run `npm run deploy`.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
