# Validation

Checks concern the algorithm and pixel values, not perceptual recognition or
calibrated screen luminance. The scientific audit and sources are in
[`scientific-audit.md`](scientific-audit.md).

## Numerical reference

`npm run check` compares the browser code with the independent NumPy reference.

| Case | What is checked | Tolerance |
|---|---|---|
| `fft_400`, `fft_45x60`, `fft_13x17` | FFT, including mixed and prime factors | 1e-6 or 1e-10 relative |
| `rise_200`, `rise_circular_200` | Sign, plain and circular phase rules | 1e-9 absolute |
| `spec_match_64` | Set-average amplitudes, original phases | 1e-9 absolute |
| `noise_and_mask_64` (path) | Interpolation between noise endpoints | 1e-9 absolute |
| `schedule_default` | Schedule arithmetic | Weights 1e-12; other fields exact |
| `sequence_64` | A complete sequence, partial peak 0.9 and normalisation | 1e-9 absolute |

For 1.1, only the sequence fixture's output was regenerated to encode the
shared-peak correction. Existing input images, uniform arrays and tolerances
were retained. This is a reference check, not validation against unavailable
original experiment code.

## Constant global statistics and retained texture

Property checks verify fixed amplitudes, mean and population SD before display
mapping, plus agreement within rounding bounds after mapping. Partial-peak
checks verify the same spectrum at the peak and texture in strips outside the
demo face throughout every cycle. Separate checks approach the common apex
from both directions, including periods with odd and even frame counts.

The independent Python demo (`python tools/reference/audit_demo.py`) uses all
360 frames at 400 × 400 px, nine committed faces and peak 0.85. Its random
stream differs from the browser's. Measured results:

| Quantity | Result |
|---|---|
| Mean before display mapping | 0.6275837608932463–0.6275837608932465 |
| SD before display mapping | 0.08189288958792865–0.08189288958792866 |
| Maximum relative amplitude-spectrum error | 2.88e-16 |
| Minimum background SD, across all frames | 0.0421 |
| Source correlation at peaks | 0.682–0.825 |
| 8-bit mean | 0.6275749–0.6275916 |
| 8-bit SD | 0.0818924–0.0819082 |
| Clipped pixel share | 6.42e-7 |

The full-restoration option (peak 1) is still checked against source similarity
above 0.99. With partial peaks, source similarity remains below 1. Neither
threshold measures recognisability. Local image statistics need not remain
constant. Similarity need not be monotonic for every seed or input.

## Calculations and downloads

- Contrast normalisation sums non-DC energy directly and rejects zero-contrast
  spectra. A low-contrast case checks against subtractive cancellation.
- The seeded generator retains its test vectors.
- ZIP export is decoded again: each PNG must be byte-identical to the built
  frame, and its reported statistics are recomputed from its pixels.
- Exports describe the shared peak and report the actual sampled maximum,
  including odd-length periods.
- `verify_export.py` independently measures a downloaded ZIP in Python, checking
  image statistics and similarity to the peak of each cycle at the tag rate.
  A high peak-to-peak correlation alone does not validate face recognition.
- `scripts/verify-export.sh` checks a video with ffprobe. Lossy video can change
  pixel values; use lossless PNGs for experiments.

## Browser checks

The existing `npm run e2e` script uses Playwright to exercise the built page.
In managed environments, use the supported managed preview and browser controls
for UI checks; do not start another browser or preview server. Verify the One
image loop, default sequence, peak/background appearance, downloads, original
video playback and blog link. The original video is a same-site media request
under `/blog/`, initiated only when played; image processing remains local.

## Commands

```bash
npm run check
python tools/reference/audit_demo.py
python tools/reference/verify_export.py path/to/eek-a-rise_1.zip
bash scripts/verify-export.sh path/to/eek-a-rise_1.mp4 360 60
```

Timing and luminance on an experimental display require separate measurement.
