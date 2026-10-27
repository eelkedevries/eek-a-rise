# Validation

What the checks show: that the frames are what the method defines, that their
global statistics are constant (constant visual stimulation), and that their
content changes at the tag frequency (dynamic content). Numbers are for the
default sequence (nine demo faces, 400 × 400 px, 2 Hz at 60 frames/s, 1 s of
noise, 4.5 s of images, 0.5 s of noise; 360 frames; seed 1) unless stated.

## 1. The algorithm matches the reference (`npm run check`)

`tools/reference/rise_reference.py` is the numerical reference. The golden data
in `tools/reference/golden/` pass the reference's random arrays to the browser
code, which must reproduce the reference's output:

| Case | What | Tolerance |
|---|---|---|
| `fft_400`, `fft_45x60`, `fft_13x17` | FFT, including lengths with factor 3 and primes (Bluestein) | 1e-6, 1e-10 of the largest value |
| `rise_200` | frames at weights 0–1 (sign rule), plain interpolation, amplitude | 1e-9 |
| `rise_circular_200` | frames with the circular target (the default) | 1e-9 |
| `spec_match_64` | spectrum matching of three images | 1e-9 |
| `noise_and_mask_64` (path) | the noise path between two noise end-points | 1e-9 |
| `schedule_default` | the paper's schedule; its eye columns equal the full-image schedule | weights 1e-12, rest exact |
| `sequence_64` | a whole sequence: all frames, with peak weight 0.9 and normalisation | 1e-9 |

All pass. The seeded generator reproduces the specification's test vectors.

## 2. Constant visual stimulation

- **Before the display mapping** (`tests/core/`): every frame has the common
  amplitude spectrum, and therefore the same mean and RMS contrast, to a relative
  error below 1e-9, for both targets and at every weight.
- **In the 8-bit frames of the default sequence:** mean 0.627575 to 0.627595
  (a range of 2e-5, from rounding); RMS contrast 0.081893 to 0.081909 (0.02 %);
  amplitude spectrum within 0.13 % of the median frame's; 4.7e-7 of the pixel
  values clipped.
- **No position-specific artefact:** in the reference's default sequence, the
  largest deviation of the 3 × 3 corner pixels from their frame is 3.9 SD with the
  circular target, as for any other pixels, and 24 SD with the sign rule (bright
  near weight 0.3, dark near 0.75), which is why the circular target is the
  default (see *How it works*, *For researchers*). The tests require below 5 SD
  and above 8 SD respectively. The published clip of the original study shows no
  such corners.

What is not constant: local statistics. The RMS contrast of the upper and lower
160 rows of the demo faces changes by about 10 % and 7 % at the tag rate, and
emerging structure forms local edges.

## 3. Dynamic content

- The similarity of each frame to the image of its cycle (Pearson correlation)
  is 0.9999 at every peak and at most 0.25 in absolute value at every minimum,
  where the frame is noise that does not depend on the image.
- Its spectrum peaks at 2.00 Hz (1.999 Hz in the independent check), the tag
  frequency.
- The image is recognisable (similarity above 0.5) for about 31–34 % of each
  cycle, as in the published clip (about a third).
- Consecutive frames join without jumps: the largest frame-to-frame change at a
  cycle or segment boundary is below the median change.

## 4. The downloads are the frames

- `tests/core/export.test.ts` builds a sequence, makes the ZIP with the page's
  code, unzips it and decodes every PNG: each is byte-identical to the built
  frame; `schedule.csv` and `frame_stats.csv` match, and the statistics can be
  recomputed from the decoded frames.
- `tools/reference/verify_export.py` checks a downloaded ZIP independently, in
  Python, from the PNGs alone: frame count, constant mean, RMS contrast and
  amplitude spectrum, frames near each peak resembling the peak, frames at each
  minimum not resembling it, and content changing at the tag frequency.
- `scripts/verify-export.sh` checks a downloaded video with ffprobe. The default
  MP4 made in Chromium: 360 frames, 60/1 frames/s, 6.000 s, strictly increasing
  timestamps, each step within 1 µs of 1/60 s; its decoded grey levels match the
  PNG frames (mean 160.2 against 160.0, with compression differences of about
  1.3 grey levels).

## 5. End to end (`npm run e2e`)

Playwright opens the built page (or a URL given after `--`) in Chromium and
checks: no console errors and no request outside `/eek-a-rise/`; One image keeps
mean and RMS contrast at every weight; the default sequence builds (about 9 s)
and plays at about 60 frames per second; the downloaded ZIP passes
`verify_export.py`; the downloaded video passes `verify-export.sh`.

## Running the checks

```bash
npm run check                               # golden data, properties, export round trip, build
npm run e2e                                 # end to end in Chromium
cd tools/reference && uv run verify_export.py path/to/eek-a-rise_<seed>.zip
bash scripts/verify-export.sh path/to/eek-a-rise_<seed>.mp4 360 60
```

## Limits

- The checks concern pixel values. Luminance on a screen also depends on the
  display's gamma and timing; measure both for an experiment.
- Firefox and Safari were not tested automatically; the end-to-end check uses
  Chromium.
