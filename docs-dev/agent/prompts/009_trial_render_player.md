# Task: Render the sequence, play it and show its statistics

## Goal

Render the full sequence in the worker exactly as specified, preview it in a
player that shows frames by elapsed time at the sequence's frame rate, and show
the measured statistics of every frame.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification 0.2: *Sequence schedule*, *Frames*, *Randomness* (draw order),
  *Interface* (player timing), *Architecture* (performance), *Validation*.
- `src/core/sequence.ts` renders frames from a uniform-array source and is
  verified against `sequence_64` (prompt 006).
- Reference numbers for the default sequence:
  `docs-dev/reference/secondary_background/reference_verification.json`,
  `demo_sequence` (constant mean and RMS contrast, similarity 1 at every peak,
  similarity peaking at 2.00 Hz, about a third of each cycle recognisable,
  largest step at joins below the median step, about 1e-7 of pixels clipped).

## Required changes

1. Extend the worker with `buildSequence(setup)`: prepare the images, match the
   spectra (and normalise if asked), render with `sequence.ts` from one seeded
   generator, map each frame to 8 bits, draw the optional fixation cross, measure
   each frame (`stats.ts`), stream progress every 10 frames, and return a
   `Uint8Array` of all frames (transferred) plus the statistics and the clipped
   share. Cancelling terminates and recreates the worker.
2. Enable *Build*: a progress bar with an estimated time left, and a *Cancel*
   button. Show a warning when the clipped share exceeds 0.1 %.
3. Player:
   - canvas S × S (responsive);
   - *Play* / *Pause*, step ± 1 frame, a scrubber and *Loop*;
   - time, frame, segment, cycle, image and weight readouts;
   - frames shown by elapsed time (`frame = floor(t · fps)`);
   - a measured display refresh rate (median `requestAnimationFrame` interval over
     one second), with the specification's warning when it is not a whole
     multiple of the frame rate;
   - the player note from `explainer_texts.md` section 5 under the player.
4. *Measured*: a plot of the per-frame mean, RMS contrast and similarity to the
   source over the whole sequence, with the current frame marked, and a one-line
   summary (range of the mean and of the RMS contrast; similarity at the peaks;
   the tag frequency at which the similarity peaks).
5. Add `tests/core/sequence.test.ts` on a reduced default sequence (128 × 128,
   the demo faces, baseline 0.5 s, stimulus 1.5 s, post 0.5 s, 60 frames/s):
   - every float frame has the common amplitude spectrum, mean and RMS contrast
     (relative difference below 1e-9);
   - the 8-bit frames keep the mean within 2e-4 and the RMS contrast within 0.5 %;
   - the similarity is above 0.99 at every peak and below 0.5 in absolute value at
     every minimum, and its spectrum peaks at 2 Hz;
   - the largest frame-to-frame change at cycle and segment joins is no more than
     1.5 times the median change;
   - with the circular target, the corner pixels stay within 5 SD at every frame;
     with the sign rule they do not;
   - the same seed gives byte-identical frames, a different seed does not.
6. Measure the default sequence's build time in Node (as a proxy) and report it.
   The target is under 90 s.
7. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- downloads (prompt 010) or the explainer (prompt 011);
- several parallel workers (later);
- changes to `src/core/` definitions verified by the golden tests.

## Acceptance criteria

The task is complete when:
- the default sequence builds on the live page and plays: a new face emerging
  and dissolving twice per second, nine faces in 4.5 s between noise;
- the plot shows flat mean and RMS contrast and a similarity oscillating at 2 Hz;
- the tests above pass in `npm run check`;
- the build time is reported, and *Cancel* stops a build at once.

## Checks

`npm run check`; `npm run deploy`; build and play the default sequence on the
live page.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push. Then
run `npm run deploy`.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
