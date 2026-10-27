# Task: Worker and the One image mode

## Goal

Let a visitor pick or upload an image and watch it emerge from noise, with a
weight slider, a play loop and live readouts showing that overall brightness and
contrast stay the same.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification: *Image preparation*, *RISE*, *Frames* (display mapping),
  *Interface* (One image), *Randomness*, *Privacy*.
- `src/core/` holds the verified FFT, spectrum, RISE, statistics and PRNG code
  (prompts 005–006). The gallery and upload exist (prompt 004).
- Expected behaviour (reference figure
  `docs-dev/reference/secondary_background/figures/rise_methods.png`): with RISE
  the image stays noise-like until the weight passes about 0.5, then appears
  quickly. Plain interpolation shows the image earlier, with bright corners near
  0.5; the sign rule brightens the corners near 0.3 and darkens them near 0.75.

## Required changes

1. Add `src/core/preprocess.ts`: decoded `ImageBitmap` → grey (Rec. 601) → centre
   square crop → S × S with high-quality smoothing → `Float64Array` in [0, 1];
   and `applyOutline(image, size, ellipse)`, which sets everything outside the
   ellipse to the mean inside it. The default ellipse is from the specification.
2. Add `src/worker/rise.worker.ts` and a typed client `src/worker/client.ts` with
   these messages:
   - `prepare(image, seed, method)`: store the amplitude and the source phase, draw
     `u` and `r` from the seeded PRNG, and build the target of the method
     (`circular`, `sign` or `plain`);
   - `frame(a)`: return a `Float32Array` (transferred) and its statistics;
   - `cycle(n)`: return n frames of one raised-cosine cycle (for *Play*);
   - `stats`: the mean and RMS contrast of the source.
   The main thread never runs an FFT.
3. Build the One image tab:
   - the gallery selection or an upload feeds the worker;
   - a 400 × 400 canvas, scaled responsively with `image-rendering: auto`;
   - a weight slider from 0 to 1 (step 0.01), throttled to one request in flight;
   - *Play* / *Pause*: one emerge–dissolve cycle per second, 60 precomputed frames
     shown by elapsed time;
   - *New noise* (new random seed, shown);
   - a method choice: *RISE*, *Sign rule*, *Plain interpolation*;
   - an *Outline* toggle (default off) with the default ellipse drawn as a thin
     overlay while it is on;
   - readouts for the source and the current frame: mean, RMS contrast, and the
     clipped share from the display mapping.
4. Use the specification's display mapping (`round(clamp(v, 0, 1) · 255)`) from
   `src/core/stats.ts`, shared with the sequence.
5. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- the sequence, downloads or the explainer text;
- editable ellipse handles (prompt 008);
- any change to `src/core/` behaviour verified by the golden tests.

## Acceptance criteria

The task is complete when, on the live page:
- picking a demo face and moving the slider shows it emerging; at 0 it is noise,
  at 1 it is the prepared image;
- the mean and RMS contrast readouts of the frame equal the source's to three
  decimals at every slider position (before the display mapping they are equal
  to many more);
- with *Plain interpolation* on a face, the corners are visibly bright near 0.5,
  and with *RISE* they are not;
- *Play* loops smoothly at one cycle per second, and the slider never blocks the
  page (the work is in the worker);
- `npm run check` passes.

## Checks

`npm run check`; `npm run deploy`; check the behaviour above on the live page.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push. Then
run `npm run deploy`.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
