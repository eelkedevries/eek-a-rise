# Task: FFT core with golden checks

## Goal

Add a dependency-free FFT for any image size, checked against the golden data on
every `npm run check`.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification: *Architecture* (`src/core/fft.ts`, golden checks) and
  *Validation*.
- Golden data: `tools/reference/golden/manifest.json`, cases `fft_400`,
  `fft_45x60` and `fft_13x17`. Inputs are `uint8`; expected outputs are
  `float32` (`fft_400`) or `float64`. All little-endian, row-major. The tolerance
  is `max |port − expected| / max |expected|`.
- Conventions as in `numpy.fft`: `fft2` unscaled, `ifft2` scaled by 1/N per
  dimension.

## Required changes

1. Add `src/core/fft.ts`:
   - an in-place complex 1-D FFT on separate `Float64Array` real and imaginary
     arrays for any length N ≥ 1: mixed radix for the factors 2, 3, 4 and 5, and
     Bluestein (via a power-of-two FFT) for any other prime factor;
   - plans (twiddles, permutations, Bluestein chirps) cached per length;
   - `fft2(re, im, height, width)` and `ifft2(...)` on row-major arrays, done
     row-wise and then column-wise, without allocating per row.
2. Add Vitest as a dev dependency, and `tests/golden/load.ts`, which reads
   `manifest.json` and returns typed arrays (`uint8`, `uint32`, `float32`,
   `float64`) for a case.
3. Add `tests/golden/fft.test.ts`, covering:
   - the three golden cases, within the manifest's tolerance;
   - `ifft2(fft2(x))` reproducing `x` to 1e-12 on a random 400 × 400 input.
4. Insert `vitest run` into `check` after `tsc --noEmit`. Make sure `tsc` covers
   `tests/` without `dist/` picking anything up.
5. Measure the time of one `fft2` plus one `ifft2` at 400 × 400 in Node and report
   it. The target is under 60 ms on a laptop; report it if this is missed, but do
   not micro-optimise beyond that.
6. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- spectra, RISE, the worker or any user interface;
- a third-party FFT library;
- changes to `tools/reference/` or its golden data.

## Acceptance criteria

The task is complete when:
- `npm run check` runs the golden tests and all of them pass;
- the measured 400 × 400 round trip time is reported;
- nothing in `dist/` changed in behaviour (no page change, so no deploy).

## Checks

`npm run check`.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
