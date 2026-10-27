# Specification

**Version:** 0.2 · **Last updated:** 2026-10-27

The authoritative design canon for this project. **Only filled sections are
binding.** An empty or stubbed section means "not yet decided", not a
constraint. When a decision is made or changed, update the relevant section and
bump the version above.

When the codebase and this document conflict, this document is correct.

Changes:

- 0.1 records the handoff of 2026-10-27 (see `docs-dev/plan.md`).
- 0.2 (owner's instruction of 2026-10-27): **full images only.** The compound
  stimulus of the paper (eye, mask and mouth bands) is not built; the second
  mode makes frequency-tagged sequences of whole images. The default RISE target
  becomes the *circular* target, because the target of 0.1 (the *sign rule*)
  brightens and then darkens the image corners at intermediate weights, which
  the published clip does not show (see *RISE*). The sign rule stays available
  and verified.

## Scope

eek-a-rise is a public web page at <https://eelkedevries.com/eek-a-rise/> that
makes whole images emerge from, and dissolve into, phase noise with the RISE
procedure, while the whole-image mean luminance, RMS contrast and amplitude
spectrum stay constant, and builds frequency-tagged sequences of such images for
experiments. Everything runs in the visitor's browser.

In v1:

- **One image:** a single image (upload or example) shown at any interpolation
  weight, or played as a smooth emerge–dissolve loop, with the whole-image mean
  luminance and RMS contrast shown as live readouts.
- **Sequence:** a frequency-tagged sequence of whole images (baseline noise,
  each cycle one image emerging and dissolving at the tag rate, post noise),
  built from uploaded or example images, previewed at its frame rate, measured
  frame by frame, and downloaded.
- **Downloads:** a lossless PNG frame sequence (ZIP) and an H.264 video with
  exact frame timestamps, each with the parameters, the frame schedule and the
  measured statistics of every frame.
- **How it works:** a plain-language explanation, figures, caveats and references.

Not in v1: the compound (banded) stimulus of de Vries and Baldauf (2019) or any
other division of an image into parts (excluded by the owner on 2026-10-27);
running experiments (trial sequencing, cues, responses); eye tracking; any
server, accounts or analytics; real face photographs among the examples;
publication of the original study's photographs.

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
  - `src/core/rise.ts` — `wrap`, `noisePhase`, `circularTarget`, `riseTarget`
    (sign rule), `riseFrame`, `noisePath`, `specMatch`, `normaliseAmplitude`.
  - `src/core/schedule.ts` — the frame schedule of a sequence.
  - `src/core/sequence.ts` — renders a sequence frame by frame (pure; used by the
    worker and the tests).
  - `src/core/stats.ts` — per-frame measurements (mean, RMS contrast, similarity
    to the source, clipped share).
  - `src/core/prng.ts` — the seeded generator.
  - `src/core/preprocess.ts` — greyscale, crop, resize, outline, background.
  - `src/worker/` — all spectral work runs in a Web Worker; the main thread only
    draws.
  - `src/ui/` — the page, the two modes, the player and the downloads.
- **Data flow:** decoded image → `preprocess` (S × S, values in [0, 1]) →
  `spectrum` → worker computes frames (`Float64Array`) → display mapping →
  `Uint8Array` frames → canvas, PNG or video encoder.
- **Performance:** the default sequence (360 frames at 400 × 400) must render in
  under 90 s on a mid-range laptop, with a progress bar and a cancel button. A
  sequence may hold at most 400 MB of 8-bit frames; the page refuses larger ones.
- **Checks:** `npm run check` runs Vitest tests that compare the port with the
  golden data in `tools/reference/golden/` and test the properties in
  *Validation*.

## Domain rules

The numerical reference is `tools/reference/rise_reference.py`; the port must
reproduce it exactly where the golden data say so. All arrays are row-major,
size S × S (400 × 400 by default).

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
- `wrap(x) = x − 2π · floor((x + π) / 2π)`, in [−π, π). Written with `floor`, so
  that every IEEE implementation agrees bit for bit.

### RISE (Sadr and Sinha, 2004, Section 2.1)

- `noisePhase(u) = antisymmetric(angle(fft2(u)))` for a uniform image `u` in [0, 1).
- `riseFrame(amp, src, target, a) = real(ifft2(amp · exp(i(a·src + (1 − a)·target))))`.
  `a = 1` gives the source image, `a = 0` noise with the same amplitude spectrum.
  Every frame has the amplitude spectrum `amp`, hence the same mean luminance
  (DC term) and RMS contrast (Parseval).
- Both targets below use `r` uniform in [0, 1) and pick a random half of the
  conjugate pairs, `pick = r + neg(r) < 1`; both keep the source phase at the
  self-conjugate bins and end with `antisymmetric`. At `a = 0` both give the
  noise image of `R` (they differ from `R` only by whole turns).
- **Circular target (default):** `turn = +1` where `r < neg(r)`, else `−1`;
  `target = src + wrap(R − src) + pick · turn · 2π`. Each component travels from
  the noise phase to the source phase the shorter way round the circle; a random
  half make one extra full turn, in a random direction independent of the source.
  The expected frame at weight `a` is then the source's deviation from its mean
  times `sinc(1 − a) · cos²(π(1 − a))`, the same at every position; the image
  stays noise-like until about `a = 0.5` and is recognisable for about a third
  of a raised-cosine cycle, as in the published clip.
- **Sign rule (option, the reading of 0.1):**
  `target = R + pick · 2π · sign(src)`. Raw phase values in (−π, π] are
  interpolated and the extra turn follows the sign of the source phase. Both
  depend on where the angle wraps, so at weights other than 0.5 the phases are
  biased: the DFT origin, that is the four image corners, turns bright near
  `a = 0.3` and dark near `a = 0.75` (about 20 SD for the demo faces and
  photographs). The published clip shows no such corners (the mean of the corner
  pixels stays within 1.8 SD of the frame mean in every frame). Kept for comparison and verified against
  the golden data.
- **Plain interpolation** (One image mode only, for demonstration): the sign
  rule with `r = 1` everywhere, that is no extra turns. It brightens the corners
  most (about 45 SD at `a = 0.5`), as Sadr and Sinha describe.
- `noisePath(R0, T1, w) = antisymmetric((1 − w)·R0 + w·T1)`, with `T1` the target
  of the chosen method from `R0` (as source) to `R1`, for drifting from one
  noise end-point to the next.
- A monotonicity check (Sadr and Sinha recommend it) is not implemented. It is
  not reported for the study and often cannot be met with a shared end-point.

### Image preparation

- Decode, convert to grey with Rec. 601 luma (0.299 R + 0.587 G + 0.114 B),
  centre-crop to a square and resize to S × S with high-quality smoothing
  (S = 400 by default; 256, 400, 512, 600 or 800). Values in [0, 1]. The port
  need not match the Python resampling bit for bit.
- **Outline (optional):** an ellipse, by default centred at (0.5 S, 0.5375 S)
  with radii (0.3125 S, 0.455 S) (at 400 px: centre (200, 215), radii (125, 182)),
  adjustable. Outside it, every pixel is set to the mean luminance inside it.
  Off by default for the sequence (the demo faces are already on a mean
  background).
- **Spectrum matching:** every image of a sequence receives the mean amplitude
  spectrum of the set and keeps its own phase (`specMatch`). This equates mean
  luminance and RMS contrast exactly. It stands in for SHINE's luminance and
  spectrum matching; SHINE's 0–255 clipping is not reproduced.
- **Normalisation (optional):** `normaliseAmplitude(amp, mean, rms)` sets the DC
  term to `mean · S²` and scales every other amplitude so that the RMS contrast
  (population standard deviation) is `rms`. It is one linear map for every frame,
  so all invariants hold. Off by default (the set's own mean and contrast).

### Sequence schedule (`schedule`)

Integer frame arithmetic only. Parameters: frame rate `fps` (whole number,
30–240), tag frequency `f`, baseline, stimulus and post durations, cycles per
image `c ≥ 1`, the number of images `nI`, and the peak weight `peak` in (0, 1].

- The period `P = fps / f` must be a whole number of frames, at least 2; each
  duration times `fps` must be a whole number of frames; the stimulus must hold
  a whole number of cycles `K = ns / P ≥ 1`, so it starts and ends in pure
  noise. The page refuses other settings with a readable message.
- Segments: `baseline` for frames `n < nb`, `stimulus` for `nb ≤ n < nb + ns`,
  `post` after that.
- Stimulus frame `i = n − nb`: cycle `k = floor(i / P)`, position `p = i mod P`,
  half `on` when `2p < P`, else `off`, weight
  `a = peak · (0.5 − 0.5 · cos(2πp / P))`, and image `floor(k / c) mod nI`.
- Noise end-points `R[0]` to `R[K + 2]`: the baseline drifts from `R[0]` to `R[1]`
  with `w = n / nb`; cycle `k` uses the target from its image to `R[k + 1]` while
  `on` and to `R[k + 2]` while `off`; the post period drifts from `R[K + 1]` to
  `R[K + 2]` with `w = (j + 1) / npost`. Consecutive frames therefore join without
  jumps, and every cycle starts and ends in noise that does not depend on the
  image.
- Columns of `schedule.csv`: `frame, time_s, segment, stim_frame, cycle, half,
  weight, image, noise_w`, numbers as in `tools/reference/golden/`. With
  `f = 2`, `c = 3` and `nI = 3`, the rows equal the eye columns of the paper's
  `schedule_default.csv` (the golden check).

### Frames

- **Display mapping:** `round(clamp(v, 0, 1) · 255)`. The page reports the
  fraction of clipped pixels and warns above 0.1 %; normalisation lowers it. A
  fixed map lets frames stream into 8-bit storage and keeps absolute luminance,
  where Sadr and Sinha rescaled the whole set instead.
- **Fixation cross (optional, off by default):** black, at the centre, arms
  `round(0.015 S)` px from the centre, 2 px wide, drawn identically on every
  frame. It is excluded from the measured statistics.
- **Measured statistics,** per 8-bit frame (values / 255): mean, RMS contrast
  (population SD), the Pearson correlation with the prepared source image of the
  frame's cycle (baseline: the first image; post: the last), and the clipped
  share. Shown as a plot after a build and exported as `frame_stats.csv`.

### Defaults and their provenance

| Parameter | Default | Source |
|---|---|---|
| Image size | 400 × 400 px | paper |
| Tag frequency | 2.00 Hz (30 frames) | paper (eye band) |
| Cycles per image | 1 | paper (a new expression every eye cycle) |
| Baseline, stimulus, post | 1.0 s, 4.5 s, 0.5 s | paper |
| Frame rate | 60 frames/s | inferred from the published clip |
| Peak weight | 1 | assumption, supported by the clip |
| New noise end-point per half cycle | yes | inferred from the clip |
| RISE target | circular | this project (see *RISE*) |
| Normalisation | off | assumption |
| Fixation cross | off | this project |
| Default images | the nine eye-expression demo faces, in the clip's order | follows the clip's eye band |

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
- Draw order in a sequence, so that one seed gives one sequence: the `K + 3`
  noise images `u` for `R[0..K+2]`; then the `r` arrays of the onset targets for
  `k = 0..K−1`, then those of the offset targets; then the `r` arrays of the
  baseline and post targets. Each array is drawn in row-major order. The renderer
  takes the uniform arrays from a source function, so the golden test can feed
  the reference's arrays in the same order.
- The same inputs and seed give identical frames in the browser. Python and the
  browser do not share random streams.

## Interface

- **Layout and look:** the same as eelkedevries.com: dark theme; Lexend,
  Spectral and JetBrains Mono, self-hosted (`@fontsource`); the site's colours.
  One page with three sections: *Try it* (tabs: *One image*, *Sequence*),
  *How it works*, *About*.
- **Images:** upload (`<input type="file">` and drag-and-drop) or choose from the
  examples: the 15 synthetic faces in `public/examples/` and, for One image only,
  two chessboards. Uploads never leave the device.
- **One image:** weight slider (0–1), *Play* (one emerge–dissolve cycle per
  second, looping), *New noise*, a method choice (*RISE*, *Sign rule*, *Plain
  interpolation*), an outline toggle (default ellipse), and readouts of the
  mean and RMS contrast.
- **Sequence:** an ordered image list (add from the gallery or uploads, remove,
  move up and down; the demo set by default); the parameters of *Defaults*, with
  each one's provenance marked; a schedule preview; *Build*, which shows progress
  and can be cancelled; then a player (play, pause, frame step, scrubber, loop),
  the plot of the measured statistics, and the downloads.
- **Player timing:** frames are shown by elapsed time (`frame = floor(t · fps)`).
  The page measures the display refresh rate and warns when it is not a whole
  multiple of the sequence's frame rate. The preview is for viewing, not for
  experiments.
- **Safety:** nothing plays until the visitor presses *Play*. With the defaults
  the content changes at 2 Hz, without luminance flicker; the page notes that
  higher tag rates are possible and that visitors sensitive to flicker should
  keep to low rates.

## Exports

- **PNG frames (lossless):** `eek-a-rise_<seed>/frame_0000.png …`, 8-bit grey,
  plus `parameters.json` (every parameter, the seed, the app version and the
  image names), `schedule.csv`, `frame_stats.csv` and `README.txt`, in one ZIP
  (fflate).
- **Video:** H.264 MP4 encoded frame by frame with WebCodecs, each frame
  timestamped exactly at `n / fps` (Mediabunny, pinned). WebM/VP9 is the
  fallback where H.264 encoding is unavailable. Without WebCodecs the video
  button is disabled with an explanation; the PNG ZIP remains.
- The download section states that lossy video changes pixel values and can undo
  the matched statistics, so research use should take the PNG frames and present
  them with Psychtoolbox or PsychoPy on a display locked to the frame rate, and
  that the statistics are in pixel values: luminance on the screen depends on the
  display's gamma.

## Validation

- **Golden data:** `tools/reference/golden/manifest.json` lists every case with
  its files, shapes and tolerances (FFT at 400 × 400, 45 × 60 and 13 × 17; RISE
  frames at 200 × 200 for the sign rule, plain interpolation and the circular
  target; spectrum matching; the noise path; the paper's default schedule; a
  full 64 × 64 sequence with its uniform arrays, frames and schedule). The mask
  frames of `noise_and_mask_64` belong to the compound stimulus and are not
  ported. `npm run check` fails when a case is outside its tolerance.
- **Properties** (`npm run check`), on rendered sequences:
  - every frame has the common amplitude spectrum, mean and RMS contrast
    (relative difference below 1e-9 before the display mapping; within the
    rounding bounds after it);
  - the similarity to the source rises to 1 at every peak of weight 1, is
    noise-like at every minimum, and its spectrum peaks at the tag frequency;
  - frames join without jumps at cycle and segment boundaries;
  - with the circular target, no position-specific artefact: corner pixels stay
    within the range of the other pixels at every weight; the sign rule is
    tested to show the corner artefact;
  - the same seed gives byte-identical frames;
  - a PNG ZIP, decoded again, returns exactly the built frames.
- **End to end** (`npm run e2e`, not part of `check`): Playwright builds the
  default sequence in the built page, downloads the ZIP, and
  `tools/reference/verify_export.py` checks it independently in Python.
- Reference numbers are in
  `docs-dev/reference/secondary_background/reference_verification.json` and
  `clip_analysis_results.json`.

## Naming and voice

- British English everywhere, in the owner's house writing style (eek-a-style):
  plain, precise, restrained, no contractions, no hype.
- Public text follows the claim rules in
  `docs-dev/reference/secondary_background/explainer_texts.md`. Overall
  brightness, contrast and amount of detail are constant, not every region: the
  contrast of a region changes as the image emerges (about 7–10 % for 160-row
  bands of the demo faces). The pixels change continuously. Make no claim that
  the method proves face-specific or content-specific processing.
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
- Full images only; no compound or banded stimuli.
- The original study's photographs, the published clip and the paper's PDF are
  not committed to this repository.
