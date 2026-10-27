# Science background

Non-binding background for eek-a-rise: what the paper reports, how RISE works,
what the published clip shows, and how the reference implementation was checked.
The binding algorithm is in `../primary_authoritative/specification.md`.
Statements are marked as **reported** (in a paper), **measured** (on the clip or
the reference output) or **inferred** (our interpretation).

## 1. The study

de Vries, E., & Baldauf, D. (2019). Attentional weighting in the face processing
network: A magnetic response image-guided magnetoencephalography study using
multiple cyclic entrainments. *Journal of Cognitive Neuroscience, 31*(10),
1573–1588. <https://doi.org/10.1162/jocn_a_01428>

MEG with frequency tagging: each aspect of one compound face (eyes, mouth,
identity) changed at its own rate, so responses to each could be separated in
the MEG spectrum. Participants covertly attended to the eyes, the mouth or the
identity (cue letters E, M, P; 75 % valid) and pressed a button on a target
(gaze to the right, tongue out, or one specific person). Responses were
source-localised in individually defined OFA, FFA and STS.

### Stimulus procedure (reported)

| Step | Reported |
|---|---|
| Database | 128 photos created for the study (available on request): 8 people (2 women, 6 men) × 16 expressions, 8 for the eyes and 8 for the mouth (Table 1) |
| Eye expressions | neutral, look right, look left, wide open, left eye closed, right eye closed, both eyes closed, both eyes squeezed shut |
| Mouth expressions | stick out tongue, stick out lips, say "fa", mouth open, mouth open wide, suck in lips, smile (no teeth), smile (with teeth) |
| Preparation | face outline cropped; greyscale; placed on a solid grey background "corresponding to the mean overall luminance of the image"; resized to 400 × 400 px |
| Equalisation | luminance and spatial frequencies equated with the SHINE toolbox (Willenbockel et al., 2010) |
| Visibility | RISE (Sadr & Sinha, 2004): partial randomisation of the Fourier phase, keeping the power spectrum, luminance and contrast; the face "gradually emerges and disappears (i.e., sinusoidally oscillating)" |
| Mask | "a phase-scrambled RISE mask by applying the same procedure to a randomly selected image at minimum visibility" |
| Composite | upper 160 px: eye sequence at 2.00 Hz; middle 80 px: RISE mask with fixation cross and cue; lower 160 px: mouth sequence at 1.33 Hz; identity changed at 0.66 Hz; "not simply flicker on and off" |
| Trial | 1 s masked baseline, 4.5 s stimuli, 0.5 s masked; Psychtoolbox in MATLAB |
| Limitation stated | tag frequencies were not counterbalanced across face components |

Not reported: display refresh rate, the range of the interpolation weight, how the
noise changes between cycles, the order of expressions, how the mask changes, and
which SHINE functions were used.

## 2. RISE (Sadr & Sinha, 2004)

Sadr, J., & Sinha, P. (2004). Object recognition and Random Image Structure
Evolution. *Cognitive Science, 28*, 259–287. Section 2.1, *Stimulus image
processing*. Read from an online copy:
<https://www.academia.edu/91312649/Object_recognition_and_Random_Image_Structure_Evolution>.
An earlier MIT version: <https://www.ftp.ai.mit.edu/pub/sadr/rise.pdf>.

Reported points (short quotations; the rest paraphrased):

- Frames are made by an inverse FFT of the source's amplitude spectrum with a
  progressively modified phase spectrum, so every frame has the same luminance
  and frequency content.
- The source phase is moved towards a random phase spectrum "consisting of a
  similar distribution of phase values"; "a simple linear interpolation may be
  used".
- Plain interpolation causes "an increase in the number of near-zero phase values
  toward the middle of the interpolation sequence", so "the resulting images
  develop bright corners and lose contrast elsewhere". The remedy: "randomly
  select half of the target phase values" and "either add or subtract 2π", to
  "yield a target value that is of the same sign as the corresponding element in
  the original phase spectrum". The worked example also says "we essentially flip
  a coin", so whether the sign is random or follows the rule is ambiguous; we
  follow the sign rule.
- The DC phase "is not changed"; the modified spectra keep their symmetry.
- Out-of-range values: "a simple linear shift and rescaling", applied identically
  to the whole set.
- Recommended: check that the evolution is monotonic (L1 or L2 distance from the
  source) and, if not, choose a different random spectrum or reassign the ±2π
  choices. Sequences may share one random end-point.

**Measured (reference):** at weight 0.5 with plain interpolation the image
corners were 4.6 SD brighter than the mean, against −0.8 SD with the 2π step.

## 3. SHINE

Willenbockel, V., Sadr, J., Fiset, D., Horne, G. O., Gosselin, F., & Tanaka, J. W.
(2010). Controlling low-level image properties: The SHINE toolbox. *Behavior
Research Methods, 42*, 671–684.

`specMatch` imposes an average amplitude spectrum, and `lumMatch` matches the mean
and standard deviation. SHINE clips to 0–255 after each step and therefore
iterates. eek-a-rise imposes the set-average amplitude spectrum once, which
equates the mean (DC term) and the RMS contrast (Parseval) exactly. Any rescaling
is one linear map for the whole trial.

## 4. What the published clip shows (measured)

Clip: `StimuliExample2.avi` (figshare link in the paper). It is not committed
here. The script `clip_analysis.py` and its output `clip_analysis_results.json`
travelled with the handoff; the results are copied in this folder.

| Finding | Evidence |
|---|---|
| Frames were rendered for a 60 Hz display; the clip is stored at 50 frames/s, so it plays at 5/6 speed | 360 distinct frames = 6.0 s at 60 Hz = exactly one trial; visibility peaks at 2.003 Hz and 1.340 Hz when frames are timed at 60 Hz |
| Bands at rows 160 and 240 | largest row-to-row discontinuities |
| Faces visible from frame 66 to 324 | stimulus from frame 60 to 330 |
| Weight starts at pure noise | eye peaks at frames 76, 106, 135, …, 315 (expected 75 + 30k); visibility proxy near 0 at the minima |
| Each identity lasts 90 frames, with 3 eye and 2 mouth expressions, all different; identity changes when both bands are pure noise (frames 150 and 240) | peak frames inspected visually |
| New noise at every minimum; fade-in and fade-out are not mirror images | correlation between consecutive eye minima −0.20 to 0.32; frames symmetric around a peak correlate 0.39–0.68 |
| The mask band loops every 10 frames (6 Hz) | correlation 0.98 at lags 10 and 20 |
| The face is visible for about a third of each cycle | eye band 33 %, mouth band 27 % of each cycle above half of the peak visibility |
| Band contrast is not constant | RMS contrast within the eye band varies by 9.1 % at 2 Hz and within the mouth band by 7.1 % at 1.33 Hz; band mean luminance by 0.3–0.5 % |

The clip is heavily compressed H.264 (about 3 KB per frame), so fine noise
dynamics are unreliable; the timing and band statistics are robust.

### Inferred from these findings

- The interpolation weight was a raised cosine from 0 (pure noise) to, probably,
  1. The short visibility (about a third of each cycle) is what the 2π step
  produces: a frame stays unrelated to the source until the weight passes about
  0.5 (reference: correlation with the source −0.06 at 0.5, 0.41 at 0.7, 0.92 at
  0.9; plain interpolation 0.37 at 0.5).
- "Sinusoidal visibility" in the paper therefore refers to the weight, not to
  perceived visibility. The visibility waveform is narrower than a sinusoid and
  carries harmonics.
- Band contrast varies because a face concentrates contrast in some regions (eyes,
  brows) and less in others (lower cheeks), whereas noise spreads it evenly. The
  whole image stays exactly constant; each 160-px band does not. The sign differs
  between bands (clip: eyes +0.51, mouth −0.55 correlation between band contrast
  and visibility).

## 5. Reference implementation and its verification (measured)

`tools/reference/rise_reference.py` implements the specification;
`make_assets.py` builds a demo trial from the synthetic faces and measures it
(`reference_verification.json`).

| Measure | Demo trial | Clip |
|---|---|---|
| Tag frequencies | 1.996 Hz, 1.329 Hz | 2.003 Hz, 1.340 Hz |
| Visibility at minima (proxy) | ≤ 0.08 | about 0.1–0.45 (compression) |
| Whole-image mean and RMS contrast over the weight | constant to 6 decimals | — |
| Share of cycle visible, eyes / mouth | 35 % / 27 % | 33 % / 27 % |
| Band contrast modulation, eyes / mouth | 9.5 % / 7.1 % | 9.1 % / 7.1 % |
| Band mean modulation, eyes / mouth | 0.3 % / 1.7 % | 0.3 % / 0.5 % |
| Largest frame-to-frame change at cycle and segment joins | 0.016 (median step 0.018) | — |

The *visibility proxy* is the excess kurtosis of a band-pass (difference of
Gaussians, σ 1 and 4 px) response: about 0 for phase noise, high for image
structure.

## 6. Caveats for any public or expert text

- Overall brightness, contrast and spatial-frequency content are constant; local
  regions are not. Each band's contrast varies by about 7–9 % at its tag rate.
  The tags are therefore not free of low-level change within the bands.
- Constant global statistics reduce low-level confounds but do not remove them:
  emerging phase structure forms local edges that early visual cortex encodes.
- The tags are harmonically related: 1.33 and 2.00 Hz are the second and third
  harmonics of 0.66 Hz. They were not counterbalanced across components (stated
  in the paper).
- The published clip plays at 5/6 speed (50 instead of 60 frames/s).
- Lossy video changes pixel values; research use should take lossless frames and
  present them with refresh-locked software.

## 7. Analogy used in public text (checked)

A chessboard scrambled this way loses its neat squares but keeps about as many
dark as light spots, on average roughly the size of a square. Tested over 20
scramblings:

- a board filling the image stays periodic and gives exactly 32 light and
  32 dark spots, because a perfectly repeating image only contains detail at
  sizes that fit its repeat;
- a board on a grey background (as the faces were) gives irregular spots of
  roughly square size, about as many dark as light (80–92 each), spread over the
  whole image.

Figures: `figures/chessboard_full.png` and `figures/chessboard_on_grey.png` (same
grey scale, no rescaling). A full black-and-white board cannot be scrambled at the
same contrast without about a third of its pixels leaving the displayable range,
which is why the figures use a grey board.

## 8. Corner artefacts of the sign rule, and the circular target (2026-10-27)

Found while re-scoping to full images (specification 0.2).

**Derived.** For a component with source phase `s` and a uniform random phase
`R`, interpolated as `φ = a·s + (1 − a)·T`, the expected value of `e^{iφ}`
decides what the expected frame looks like. With `b = 1 − a`:

- plain interpolation (`T = R`): `E[e^{iφ}] = e^{ias} · sinc(b)`;
- sign rule (`T = R + 2π·sign(s)` for a random half):
  `E[e^{iφ}] = sinc(b) · cos(πb) · e^{i(as + πb·sign(s))}`;
- circular target (`T = s + wrap(R − s) + 2π·m` for a random half, `m = ±1` at
  random): `E[e^{iφ}] = sinc(b) · cos²(πb) · e^{is}`.

Only the last is the source phase times a real factor, so only there is the
expected frame the source scaled towards its mean, the same at every position.
Averaged over source phases spread evenly over the circle, the mean of `cos φ` is
`sin²(πa) / (π²ab)` for plain interpolation (0.41 at `a = 0.5`) and
`−sin²(πb) · cos(πb) / (π²ab)` for the sign rule (+0.19 at `a = 0.3`, 0 at 0.5,
−0.19 at `a = 0.75`). A positive mean of `cos φ` brightens the DFT origin, that
is the four corners of the image (they wrap onto one another); a negative one
darkens it.

**Measured (reference).** Largest |z| (relative to the frame) among the 3 × 3
pixels at the origin corner, signed as the corner pixel, mean over six noise
draws:

| Weight | 0.1 | 0.3 | 0.5 | 0.7 | 0.75 | 0.9 |
|---|---|---|---|---|---|---|
| Sign rule, demo face | 11 | 21 | −0.5 | −22 | −22.5 | −12 |
| Circular, demo face | 0.0 | −0.2 | 0.0 | 0.0 | 0.1 | 0.1 |
| Plain, demo face | 12.5 | 37 | 47 | 37 | 31.5 | 12.5 |

Photographs gave the same pattern (sign rule up to 19 SD; circular below 1.3).
In the default sequence (`reference_verification.json`, `demo_sequence`), the
largest corner |z| over all frames is 24 for the sign rule and 3.9 for the
circular target, and the clipped share falls from 4.5e-5 to 1.4e-7.

**Measured (published clip).** The mean of the 4 × 4 pixels at the four corners
stays within 1.8 SD of the frame mean in all 384 frames, and the corner pixels
vary over time about as much as the rest of the image (temporal SD 12–13
against a median of 14.6 grey levels). The original stimuli therefore did not have the
corner artefact; how they avoided it is not reported.

**Decision.** The circular target is the default; the sign rule remains as an
option, verified against the golden data (`rise_200`), and is shown on the page
for comparison. The circular target keeps the late emergence of RISE: in the
default sequence the similarity to the source exceeds 0.5 for 34 % of each
cycle (clip: about a third).

