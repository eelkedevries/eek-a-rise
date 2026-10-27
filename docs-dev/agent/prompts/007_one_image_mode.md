# Task: Worker and the One image mode

## Goal

Let a visitor pick or upload an image and watch it emerge from noise, with a
weight slider, a play loop and live readouts showing that overall brightness and
contrast stay the same.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification: *Image preparation*, *RISE*, *Display mapping*, *Interface*
  (One image), *Randomness*, *Privacy*.
- `src/core/` holds the verified FFT, spectrum, RISE and PRNG code (prompts
  005–006). The gallery and upload exist (prompt 004).
- Expected behaviour (reference figure
  `docs-dev/reference/secondary_background/figures/rise_photo_sadr_sinha_vs_plain.png`):
  with the 2π step the image stays noise-like until the weight passes about 0.5,
  then appears quickly. Plain interpolation shows the image earlier, with bright
  corners near 0.5.

## Required changes

1. Add `src/core/preprocess.ts`: decoded `ImageBitmap` → grey (Rec. 601) → centre
   square crop → 400 × 400 with high-quality smoothing → `Float64Array` in [0, 1];
   and `applyOutline(image, ellipse)`, which sets everything outside the ellipse to
   the mean inside it. The default ellipse is from the specification.
2. Add `src/worker/rise.worker.ts` and a typed client `src/worker/client.ts` with
   these messages:
   - `prepare(image, seed, mode)`: store the amplitude and the source phase, draw
     `u` and `r` from the seeded PRNG, and build the target (mode `rise`) or the
     plain target (`r = 1`);
   - `frame(a)`: return a `Float32Array` (transferred);
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
   - a toggle *RISE (Sadr & Sinha)* / *Plain interpolation*;
   - a *Face outline* toggle (default off) with the default ellipse drawn as a
     thin overlay while it is on;
   - readouts for the source and the current frame: mean, RMS contrast, and the
     clipped share from the display mapping.
4. Use the specification's display mapping (`round(clamp(v, 0, 1) · 255)`), shared
   in `src/render/display.ts` for later use by the trial.
5. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- the compound trial, downloads or the explainer text;
- editable ellipse handles (prompt 008);
- any change to `src/core/` behaviour.

## Acceptance criteria

The task is complete when, on the live page:
- picking a demo face and moving the slider shows it emerging; at 0 it is noise,
  at 1 it is the prepared image;
- the mean and RMS contrast readouts of the frame equal the source's to four
  decimals at every slider position;
- with *Plain interpolation* on a face, the corners are visibly bright near 0.5,
  and with *RISE* they are not;
- *Play* loops smoothly at one cycle per second, and the slider never blocks the
  page (the work is in the worker);
- `npm run check` passes.

## Checks

`npm run check`; `npm run deploy`; check the behaviour above on the live page in
Chrome and Firefox.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push. Then
run `npm run deploy`.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
