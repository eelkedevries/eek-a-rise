# Specification

**Version:** 0.1 · **Last updated:** 2026-10-27

The authoritative design canon for this project. **Only filled sections are
binding.** An empty or stubbed section means "not yet decided", not a
constraint. When a decision is made or changed, update the relevant section and
bump the version above.

When the codebase and this document conflict, this document is correct.

Changes: 0.1 records the handoff of 2026-10-27 (see `docs-dev/plan.md`): scope,
architecture, the algorithm as implemented by `tools/reference/rise_reference.py`,
defaults, interface, exports, validation and hosting.

## Scope

eek-a-rise is a public web page at <https://eelkedevries.com/eek-a-rise/> that
makes faces emerge from, and dissolve into, phase noise with the RISE procedure,
and builds the compound frequency-tagged face stimuli of de Vries and Baldauf
(2019). Everything runs in the visitor's browser.

In v1:

- **One image:** a single image (upload or example) shown at any interpolation
  weight, or played as a smooth emerge–dissolve loop, with the whole-image mean
  luminance and RMS contrast shown as live readouts.
- **Compound trial:** the three-band stimulus of the paper (eyes 2.00 Hz, mask,
  mouth 1.33 Hz, identity 0.66 Hz) built from uploaded or example faces, previewed
  at 60 frames/s and downloaded.
- **Downloads:** a lossless PNG frame sequence (ZIP) and an H.264 video with
  exact frame timestamps, each with the parameters and the frame schedule.
- **How it works:** a plain-language explanation, figures, caveats and references.

Not in v1: running experiments (trial sequencing, cues per trial, responses),
eye tracking, any server, accounts, analytics, real face photographs among the
examples, publication of the original study's photographs.

## Architecture

- **Stack:** Vite + TypeScript, no UI framework, built as a static site under the
  base path `/eek-a-rise/`. Scaffolded with `eek-a-template` v0.3.0.
- **Modules:**
  - `src/core/fft.ts` — complex 1-D FFT for any length and 2-D `fft2`/`ifft2` on
    row-major `Float64Array` pairs (re, im). Numpy conventions: forward unscaled,
    inverse scaled by 1/N per dimension. Mixed radix for the factors 2, 3, 4 and 5;
    Bluestein for any other prime factor. No FFT dependency.
  - `src/core/spectrum.ts` — `neg`, `halfPlane`, `selfConjugate`, `antisymmetric`,
    `spectrum`, `fromSpectrum`.
  - `src/core/rise.ts` — `noisePhase`, `riseTarget`, `riseFrame`, `noisePath`,
    `maskStep`, `specMatch`.
  - `src/core/schedule.ts` — the frame schedule.
  - `src/core/prng.ts` — the seeded generator.
  - `src/core/preprocess.ts` — greyscale, crop, resize, face outline, background.
  - `src/worker/` — all spectral work runs in a Web Worker; the main thread only
    draws.
  - `src/ui/` — the page, the two modes, the player and the downloads.
- **Data flow:** decoded image → `preprocess` (400 × 400, values in [0, 1]) →
  `spectrum` → worker computes frames (`Float32Array`) → display mapping →
  `Uint8ClampedArray` frames → canvas, PNG or video encoder.
- **Performance:** a full trial (360 frames) must render in under 90 s on a
  mid-range laptop, with a progress bar and a cancel button. The ten mask frames
  are computed once and reused.
- **Golden checks:** `npm run check` runs Vitest tests that compare the port with
  the golden data in `tools/reference/golden/` (see *Validation*).

## Domain rules

The numerical reference is `tools/reference/rise_reference.py`; the port must
reproduce it exactly where the golden data say so. All arrays are row-major,
size H × W (400 × 400 for stimuli).

### Fourier conventions

- `neg(a)[y, x] = a[(-y) mod H, (-x) mod W]`.
- `halfPlane[y, x]` is true when the row-major index `y·W + x` is less than or
  equal to the index of `((-y) mod H, (-x) mod W)`.
- `selfConjugate[y, x]` is true when `(-y) mod H = y` and `(-x) mod W = x` (DC and
  the Nyquist bins).
- `antisymmetric(p) = where(halfPlane, p, -neg(p))`. Apply it to every phase field
  before an inverse transform, so the result is real; take the real part.
- `spectrum(img)` returns `|fft2(img)|` and `antisymmetric(angle(fft2(img)))`, with
  `angle` in (−π, π] as `Math.atan2(im, re)`.

### RISE (Sadr and Sinha, 2004, Section 2.1)

- `noisePhase(u) = antisymmetric(angle(fft2(u)))` for a uniform image `u` in [0, 1).
- `riseTarget(src, R, r)`, with `r` uniform in [0, 1):
  `pick = r + neg(r) < 1`; `target = R + pick · 2π · sign(src)`;
  `target[selfConjugate] = src[selfConjugate]`; return `antisymmetric(target)`.
  The 2π shifts leave the end-point image unchanged but stop plain linear
  interpolation from crowding phases near zero, which brightens the corners and
  lowers contrast elsewhere.
- `riseFrame(amp, src, target, a) = real(ifft2(amp · exp(i(a·src + (1 − a)·target))))`.
  `a = 1` gives the source image, `a = 0` noise with the same amplitude spectrum.
- `noisePath(R0, T1, w) = antisymmetric((1 − w)·R0 + w·T1)`, with
  `T1 = riseTarget(R0, R1, r)`, for drifting from one noise end-point to the next.
- `maskStep(us) = antisymmetric(sign(noisePhase(us)) · 2π / maskLoop)`; mask frame
  `j` has phase `Rmask + (j mod maskLoop) · step`.
- The "plain interpolation" option (One image mode only) uses `r = 1` everywhere,
  that is no 2π shifts.
- A monotonicity check (Sadr and Sinha recommend it) is optional and off by
  default. It is not reported for the study, often cannot be met with a fixed
  end-point, and is slow.

### Image preparation

- Decode, convert to grey with Rec. 601 luma (0.299 R + 0.587 G + 0.114 B),
  centre-crop to a square and resize to 400 × 400 with high-quality smoothing.
  Values in [0, 1]. The port need not match the Python resampling bit for bit.
- **Face outline:** an ellipse, by default centred at (200, 215) px with radii
  (125, 182) px, adjustable per image. Outside it, every pixel is set to the mean
  luminance inside it.
- **Spectrum matching:** across all images of a trial, every image receives the
  mean amplitude spectrum of the set and keeps its own phase (`specMatch`). This
  equates mean luminance and RMS contrast exactly. It stands in for SHINE's
  luminance and spectrum matching; SHINE's 0–255 clipping is not reproduced.

### Trial schedule (`schedule`)

Integer frame arithmetic only. With frame rate `fps` and tag frequency `f`, the
period `P = fps / f` must be a whole number of frames, or the page refuses the
setting.

- Segments: `baseline` for frames `n < nb`, `stimulus` for `nb ≤ n < nb + ns`,
  `post` after that, with `nb = baseline · fps`, `ns = stimulus · fps` and
  `npost = post · fps`.
- Stimulus frame `i = n − nb`. For each band (eyes, mouth) with period `P`:
  cycle `k = floor(i / P)`, position `p = i mod P`, half `on` when `2p < P`, else
  `off`, and weight `a = aMin + (aMax − aMin) · (0.5 − 0.5 · cos(2πp / P))`.
- Identity block `floor(i / Pidentity)`.
- Noise end-points per band, `R[0]` to `R[K + 2]` for `K` cycles: the baseline
  drifts from `R[0]` to `R[1]` with `w = n / nb`; cycle `k` uses
  `riseTarget(src_k, R[k + 1], ·)` while `on` and `riseTarget(src_k, R[k + 2], ·)`
  while `off`; the post period drifts from `R[K + 1]` to `R[K + 2]` with
  `w = (j + 1) / npost`. Consecutive frames therefore join without jumps.
- Mask step `n mod maskLoop` over all frames.
- The identity period must be a whole multiple of both band periods (true for
  the defaults: 90 = 3 × 30 = 2 × 45), so identity changes only when both bands
  are pure noise. The page refuses other settings.
- Image choice: band cycle `k` starts at stimulus frame `s = k · P`; its identity
  is `j = floor(s / Pidentity) mod nIdentities`, and its slot within the block is
  `q = k mod (Pidentity / P)`. It shows image `q mod (number of that identity's
  images for the band)`, so an identity with fewer images reuses them in order.

### Composite frame

- Rows 0–159 come from the eye band's full-size RISE frame, rows 160–239 from
  the mask, rows 240–399 from the mouth band's full-size frame. Bands are cropped
  after RISE, as in the paper.
- **Display mapping** (trials and One image alike): `round(clamp(v, 0, 1) · 255)`.
  The page reports the fraction of clipped pixels. For the demo trial it is about
  0.005 %; above 0.1 % it shows a warning. A fixed map lets frames stream into
  8-bit storage and keeps absolute luminance, where Sadr and Sinha rescaled the
  whole set instead.
- **Fixation and cue:** a black cross at (200, 200), arms 6 px from the centre,
  2 px wide; the cue letter (`P`, `E`, `M` or none), black, centred at
  (200, 220), 14 px. They are drawn on every frame, the baseline included.

### Defaults and their provenance

| Parameter | Default | Source |
|---|---|---|
| Image size | 400 × 400 px | paper |
| Eye band, mask band, mouth band rows | 0–159, 160–239, 240–399 | paper |
| Eye tag | 2.00 Hz (30 frames) | paper |
| Mouth tag | 4/3 Hz (45 frames), reported as 1.33 Hz | paper |
| Identity rate | 2/3 Hz (90 frames), reported as 0.66 Hz | paper |
| Baseline, stimulus, post | 1.0 s, 4.5 s, 0.5 s | paper |
| Frame rate | 60 frames/s | inferred from the published clip |
| Weight range | 0 to 1 | assumption, supported by the clip |
| New noise end-point per half cycle | yes | inferred from the clip |
| Mask loop | 10 frames (6 Hz) | inferred from the clip |
| Expressions per identity block | 3 eye, 2 mouth | follows from the rates; the clip confirms it |
| Monotonicity check | off | assumption |
| Cue | `E` | paper's letters P/E/M |

### Randomness

- `src/core/prng.ts` implements sfc32, seeded from one 32-bit integer through
  splitmix32 (four outputs become a, b, c, d), after which the first 12 outputs
  are discarded. Uniform values are `uint32 / 2³²`. The seed is a visible parameter.

  ```js
  function splitmix32(a){return function(){a|=0;a=a+0x9e3779b9|0;let t=a^a>>>16;t=Math.imul(t,0x21f0aaad);t=t^t>>>15;t=Math.imul(t,0x735a2d97);return ((t=t^t>>>15)>>>0);}}
  function sfc32(a,b,c,d){return function(){a|=0;b|=0;c|=0;d|=0;let t=(a+b|0)+d|0;d=d+1|0;a=b^b>>>9;b=c+(c<<3)|0;c=(c<<21|c>>>11);c=c+t|0;return t>>>0;}}
  ```

  Test vectors (first five outputs after the discard): seed 1 →
  1130556604, 2591592147, 3014952990, 960850752, 2734082507; seed 20191001 →
  1003360215, 1765151852, 1754808311, 2067470915, 1903539223.
- Draw order in a trial, so that one seed gives one trial: for the eye band, then
  the mouth band: the `K + 3` noise images `u` for `R[0..K+2]`; then the `r`
  arrays of the onset targets for `k = 0..K−1`, then those of the offset targets;
  then the `r` arrays for the baseline and post targets. Last, for the
  mask, `u` for `Rmask` and then `us` for the step. Each array is drawn in
  row-major order.
- The same inputs and seed give identical frames in the browser. Python and the
  browser do not share random streams; the golden data pass the random arrays in
  explicitly.

## Interface

- **Layout and look:** the same as eelkedevries.com: dark theme; Lexend,
  Spectral and JetBrains Mono, self-hosted (`@fontsource`); the site's colours.
  One page with three sections: *Try it* (tabs: *One image*, *Compound trial*),
  *How it works*, *About*.
- **Images:** upload (`<input type="file">` and drag-and-drop) or choose from the
  examples. The examples are the 15 synthetic faces in `public/examples/` and,
  for One image only, two chessboards. Uploads never leave the device.
- **One image:** weight slider (0–1), *Play* (one emerge–dissolve cycle per
  second, looping), *New noise*, a toggle *Sadr & Sinha* / *plain interpolation*,
  a face-outline toggle (default ellipse), and readouts of the mean and RMS
  contrast.
- **Compound trial:** identities 1–8, each with eye and mouth image slots filled
  from the gallery or uploads (the demo set by default); the parameters of
  *Defaults*, with each assumption marked; *Build*, which shows progress and can
  be cancelled; then a player (play, pause, frame step, scrubber, loop) and the
  downloads.
- **Player timing:** frames are shown by elapsed time (`frame = floor(t · fps)`).
  The page measures the display refresh rate and warns when it is not a whole
  multiple of the trial's frame rate. The preview is for viewing, not for
  experiments.
- **Safety:** nothing plays until the visitor presses *Play*. The content changes
  at no more than 2 Hz, without luminance flicker.

## Exports

- **PNG frames (lossless):** `eek-a-rise_<seed>/frame_0000.png …`, 8-bit grey,
  plus `parameters.json` (every parameter, the seed, the app version and the
  image names) and `schedule.csv` (the columns of `schedule_default.csv`), in one
  ZIP (fflate).
- **Video:** H.264 MP4 encoded frame by frame with WebCodecs, each frame
  timestamped exactly at `n / fps` (Mediabunny or an equivalent maintained muxer,
  pinned and vendored or installed via npm). WebM/VP9 is the fallback where
  H.264 encoding is unavailable. Without WebCodecs the video button is disabled
  with an explanation; the PNG ZIP remains.
- The download section states that lossy video changes pixel values and can undo
  the matched statistics, so research use should take the PNG frames and present
  them with Psychtoolbox or PsychoPy on a display locked to the frame rate.

## Validation

- **Golden data:** `tools/reference/golden/manifest.json` lists every case with
  its files, shapes and tolerances (FFT at 400 × 400, 45 × 60 and 13 × 17; RISE
  frames at 200 × 200; spectrum matching; noise path and mask; the default
  schedule). `npm run check` fails when a case is outside its tolerance.
- **Invariants,** tested on a 64 × 64 random case: the mean and RMS contrast of
  `riseFrame` are constant over `a` (relative difference below 1e-9); a weight of
  1 reproduces the source; consecutive frames of a trial join without jumps.
- Reference numbers for comparison are in
  `docs-dev/reference/secondary_background/reference_verification.json` and
  `clip_analysis_results.json`.

## Naming and voice

- British English everywhere, in the owner's house writing style (eek-a-style):
  plain, precise, restrained, no contractions, no hype.
- Public text uses the wording in
  `docs-dev/reference/secondary_background/explainer_texts.md` and obeys its
  claim rules. Overall brightness and contrast are constant, not every region:
  each band's contrast varies by roughly 7–9 % at its tag rate. The pixels change
  continuously. Make no claim that the method proves face-specific processing.
- Built files never mention `docs-dev` (the public-build check refuses them).

## Privacy

No network requests after load, no analytics, no cookies, no third-party
requests. Images are processed in the browser and never stored or sent.
`localStorage` may keep interface preferences only.

## Hosting and deploy

Served at `https://eelkedevries.com/eek-a-rise/` on SiteGround, deployed by
`deploy-eek-a-rise.yml` in `eelkedevries/eelkedevries.com`, which holds the SSH
secrets; it builds this public repository and rsyncs `dist/` into
`/eek-a-rise/`. Started with `npm run deploy` (workflow dispatch) or a
`rise-updated` repository dispatch. Not GitHub Pages. This repository stores no
secrets.

## Locked decisions

- The repository is public; the licence is MIT.
- The browser computes everything; there is no server component.
- The algorithm follows *Domain rules*, verified against the golden data.
- The original study's photographs, the published clip and the paper's PDF are
  not committed to this repository.
