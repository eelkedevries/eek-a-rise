# Task: Render the compound trial and play it

## Goal

Render the full trial in the worker exactly as specified, then preview it in a
player that shows frames by elapsed time at the trial's frame rate.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification: *Trial schedule*, *Composite frame*, *Randomness* (draw order),
  *Display mapping*, *Interface* (player timing), *Architecture* (performance).
- Reference: `tools/reference/rise_reference.py`, `Trial.render`, `_band`,
  `_mask` and `draw_fixation`. Its demo trial measured (see
  `docs-dev/reference/secondary_background/reference_verification.json`):
  - tags at 2.00 and 1.33 Hz;
  - pure noise at every minimum;
  - largest change at cycle and segment joins no larger than the median frame
    change;
  - about 0.005 % of pixels clipped.

## Required changes

1. Add `src/core/trial.ts` (pure functions, usable in the worker and in tests).
   Given the prepared images, the identities and the parameters, it:
   - runs `specMatch` over every distinct image in use;
   - draws the random arrays in the specification's order from one seeded
     generator;
   - builds the noise end-points, the onset and offset targets, and the baseline
     and post paths per band, plus the ten mask frames (computed once);
   - composes each frame (rows 0–159 eyes, 160–239 mask, 240–399 mouth), maps it
     to 8 bits, and draws the fixation cross and cue as specified;
   - yields frames one at a time, so nothing holds all floating-point frames.
2. Extend the worker with `buildTrial(setup)`, which streams progress every
   10 frames and returns a `Uint8Array` of all frames (transferred) plus the
   clipped share. Cancelling terminates and recreates the worker.
3. Enable *Build*: a progress bar with an estimated time left, and a *Cancel*
   button. Show a warning when the clipped share exceeds 0.1 %.
4. Player:
   - canvas 400 × 400 (responsive);
   - *Play* / *Pause*, step ± 1 frame, a scrubber and *Loop*;
   - time, frame and segment readouts;
   - frames shown by elapsed time (`frame = floor(t · fps)`);
   - a measured display refresh rate (median `requestAnimationFrame` interval over
     one second), with the specification's warning when it is not a whole
     multiple of the frame rate;
   - the player note from `explainer_texts.md` section 5 under the player.
5. Add `tests/core/trial.test.ts` on a shortened schedule (baseline 0.1 s,
   stimulus 1.5 s, post 0.1 s, at 400 × 400) with the demo images:
   - the largest frame-to-frame change at cycle and segment joins is no more than
     1.5 times the median change;
   - the eye band's visibility proxy at every minimum is below 0.3, using the
     excess kurtosis of a difference-of-Gaussians response (σ 1 and 4 px) as in
     `make_assets.py`;
   - mask rows of frame n and n + 10 are identical;
   - rows 0–159 of a frame equal the eye band's full frame mapped to 8 bits
     (fixation pixels excepted);
   - the same seed gives byte-identical frames.
6. Measure the full default trial's build time in Chrome on the owner's laptop
   class of machine (or in Node as a proxy) and report it. The target is under
   90 s.
7. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- downloads (prompt 010) or the explainer (prompt 011);
- several parallel workers (later);
- changes to `src/core/` definitions verified by the golden tests.

## Acceptance criteria

The task is complete when:
- the default trial builds on the live page and plays: eyes fading twice per
  second, the mouth four times every three seconds, three identities, cross and
  cue visible throughout;
- the tests above pass in `npm run check`;
- the build time is reported, and *Cancel* stops a build at once.

## Checks

`npm run check`; `npm run deploy`; build and play the default trial on the live
page in Chrome and Firefox.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push. Then
run `npm run deploy`.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
