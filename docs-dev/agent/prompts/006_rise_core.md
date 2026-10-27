# Task: RISE core, schedule, sequence renderer and PRNG with golden checks

## Goal

Port the reference algorithm (spectrum, both RISE targets, noise path, spectrum
matching, normalisation, sequence schedule, sequence renderer, per-frame
statistics, seeded generator) to TypeScript and verify it against the golden
data and the properties of the specification.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification 0.2: *Domain rules* (all of it), *Randomness* and *Validation*.
  These definitions are binding. Full images only: the compound stimulus and its
  mask are not ported.
- Reference: `tools/reference/rise_reference.py` (`neg`, `half_plane`,
  `self_conjugate`, `antisymmetric`, `spectrum`, `from_spectrum`, `spec_match`,
  `wrap`, `noise_phase`, `rise_target`, `circular_target`, `rise_frame`,
  `noise_path`, `normalise_amplitude`, `sequence_schedule`, `Sequence`).
- Golden cases: `rise_200`, `rise_circular_200`, `spec_match_64`, the `path`
  part of `noise_and_mask_64`, `schedule_default` (a CSV) and `sequence_64`
  (inputs, uniform arrays in draw order, frames and schedule), each with its
  tolerance in `manifest.json`. Uniform arrays are stored as `uint32`; use
  `x / 2**32`.
- `src/core/fft.ts` and `tests/golden/load.ts` exist (prompt 005).
- Porting note: `angle` is `Math.atan2(im, re)`, as in numpy, including the sign
  of zero. If a golden case fails only at isolated bins whose phase is ±π, check
  for a signed-zero difference in the FFT output before anything else.

## Required changes

1. Add `src/core/spectrum.ts`: `neg`, `halfPlane`, `selfConjugate`,
   `antisymmetric`, `spectrum` (amplitude and antisymmetric phase) and
   `fromSpectrum` (real part of `ifft2`), on `Float64Array` row-major data.
2. Add `src/core/rise.ts`: `wrap`, `noisePhase(u)`, `circularTarget(src, R, r)`,
   `riseTarget(src, R, r)` (sign rule), `riseFrame(amp, src, target, a)`,
   `noisePath(R0, T1, w)`, `specMatch(images)` and
   `normaliseAmplitude(amp, mean, rms)`. Randomness is always passed in as arrays.
3. Add `src/core/schedule.ts`, which returns the rows of the specification's
   sequence schedule from the parameters (fps, tag frequency, three durations,
   cycles per image, number of images, peak weight) with integer frame
   arithmetic, and rejects invalid settings with readable messages. Add
   `scheduleCsv(rows)` with the golden CSV's columns and number format.
4. Add `src/core/sequence.ts`: a generator that, given the prepared images, the
   parameters (including the method and the optional normalisation) and a
   uniform-array source, yields the frames (`Float64Array`) one at a time in
   schedule order, drawing the random arrays in the specification's order.
5. Add `src/core/stats.ts`: mean, RMS contrast, Pearson correlation and the
   clipped share, and the display mapping `toUint8`.
6. Add `src/core/prng.ts`: splitmix32 and sfc32 exactly as in the specification,
   the 12-output discard, `nextUint32()`, and `uniformArray(n)` (`uint32 / 2**32`).
7. Add these tests:
   - `tests/golden/rise.test.ts`: `rise_200` (all frames, the plain frame at 0.5,
     the amplitude), `rise_circular_200`, `spec_match_64`, and the path of
     `noise_and_mask_64`;
   - `tests/golden/schedule.test.ts`: the full-image schedule at 2 Hz with 3 cycles
     per image and 3 images against every eye column of `schedule_default.csv`
     (weights to 1e-12, all else exact), the `sequence_64` schedule against its CSV
     byte for byte, and the refusals (period not whole, stimulus not whole cycles);
   - `tests/golden/sequence.test.ts`: `sequence_64` frames from the golden uniform
     arrays, within tolerance;
   - `tests/core/invariants.test.ts`: on a random 64 × 64 image, the mean and RMS
     contrast of `riseFrame` constant over `a` for both targets (relative
     difference below 1e-9), `a = 1` reproducing the source to 1e-12, the circular
     target free of corner artefacts while the sign rule shows them, and the PRNG
     test vectors for seeds 1 and 20191001.
8. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- the worker, preprocessing of decoded images, or any user interface;
- the compound stimulus or its mask;
- changes to the definitions in the specification. If a golden test cannot pass
  without a change, stop and report the case and the difference.

## Acceptance criteria

The task is complete when:
- all golden and invariant tests pass in `npm run check`;
- no tolerance in `manifest.json` was loosened.

## Checks

`npm run check`.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
