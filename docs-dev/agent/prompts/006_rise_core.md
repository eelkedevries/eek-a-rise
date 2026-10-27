# Task: RISE core, schedule and PRNG with golden checks

## Goal

Port the reference algorithm (spectrum, RISE, noise path, mask, spectrum
matching, schedule, seeded generator) to TypeScript and verify it against the
golden data.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification: *Domain rules* (all of it) and *Randomness*, including the sfc32
  and splitmix32 code and the test vectors. These definitions are binding.
- Reference: `tools/reference/rise_reference.py` (`neg`, `half_plane`,
  `self_conjugate`, `antisymmetric`, `spectrum`, `from_spectrum`, `spec_match`,
  `noise_phase`, `rise_target`, `rise_frame`, `noise_path`, `schedule`, and the
  mask step in `Trial._mask`).
- Golden cases: `rise_200`, `spec_match_64`, `noise_and_mask_64` and
  `schedule_default` (a CSV), each with its tolerance in `manifest.json`.
  Uniform arrays are stored as `uint32`; use `x / 2**32`.
- `src/core/fft.ts` and `tests/golden/load.ts` exist (prompt 005).
- Porting note: `angle` is `Math.atan2(im, re)`, as in numpy, including the sign
  of zero. If a golden case fails only at isolated bins whose phase is ±π, check
  for a signed-zero difference in the FFT output before anything else.

## Required changes

1. Add `src/core/spectrum.ts`: `neg`, `halfPlane`, `selfConjugate`,
   `antisymmetric`, `spectrum` (amplitude and antisymmetric phase) and
   `fromSpectrum` (real part of `ifft2`), on `Float64Array` row-major data.
2. Add `src/core/rise.ts`: `noisePhase(u)`, `riseTarget(src, R, r)`,
   `riseFrame(amp, src, target, a)`, `noisePath(R0, T1, w)`,
   `maskStep(us, maskLoop)` and `specMatch(images)`. Randomness is always passed
   in as arrays.
3. Add `src/core/schedule.ts`, which returns the frame rows of the specification
   from the parameters (fps, three frequencies, three durations, mask loop) with
   integer frame arithmetic. It rejects periods that are not whole frames, and
   identity periods that are not whole multiples of both band periods, with
   readable messages. Also add the image-choice rule (identity and slot per band
   cycle).
4. Add `src/core/prng.ts`: splitmix32 and sfc32 exactly as in the specification,
   the 12-output discard, `nextUint32()`, and `uniformArray(n)` (`uint32 / 2**32`).
5. Add these tests:
   - `tests/golden/rise.test.ts`: `rise_200` (all frames, the plain frame at 0.5,
     the amplitude), `spec_match_64` and `noise_and_mask_64` (path and mask;
     mask frame 10 equals frame 0);
   - `tests/golden/schedule.test.ts`: every column of `schedule_default.csv`
     (weights to 1e-12, all else exact) and the image choice for the default
     three identities (3 eye and 2 mouth images each);
   - `tests/core/invariants.test.ts`: on a random 64 × 64 image, the mean and RMS
     contrast of `riseFrame` constant over `a` (relative difference below 1e-9),
     `a = 1` reproducing the source to 1e-12, and the PRNG test vectors for seeds
     1 and 20191001.
6. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- the worker, preprocessing of decoded images, or any user interface;
- the composite trial (prompt 009);
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
