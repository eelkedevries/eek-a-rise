# Scientific audit: RISE and the continuously scrambled demonstration

Checked on 4 November 2026. Applies to eek-a-rise 1.1.0 and specification 1.1.

## Sources checked

| Primary source | What was checked |
|---|---|
| [de Vries and Baldauf (2019), published Methods, pp. 1574–1575](https://research.vu.nl/files/104493958/DeVries_Baldauf_jocn2019_Attentional_Weighting_in_the_Face_Processing_Network.pdf) | Image preparation, band layout, temporal modulation and trial timing. The journal article is from 2019; related conference work was presented in 2018. |
| [Sadr and Sinha (2004), Section 2.1, pp. 267–269](https://web.mit.edu/sinhalab/Papers/sadr_sinha2004.pdf) | Fixed Fourier amplitudes, phase interpolation, extra turns, conjugate symmetry, common scaling and monotonicity selection. |
| [Willenbockel et al. (2010), SHINE](https://link.springer.com/article/10.3758/BRM.42.3.671) | Spectrum, intensity and histogram matching are distinct operations. |
| [Ales et al. (2012)](https://doi.org/10.1167/12.10.18) and [the author's method description and MATLAB implementation](https://www.st-andrews.ac.uk/~jma23/code.html) | Shortest-path interpolation accounts for circular phase; the project's additional random turns are a separate adaptation. |
| [Published stimulus video](https://figshare.com/s/f8a1e2760937ca35c4f0?file=9742972) and [the author's related blog](https://eelkedevries.com/blog/frequency-tagged-face-stimuli/) | Appearance of the original compound stimulus and the existing browser-compatible video. |

## Findings and corrections

The published study used greyscale, 400 × 400 px images, SHINE preprocessing,
and separately modulated eye and mouth bands. The reported rates are 2.00 Hz
for eyes, 1.33 Hz for the mouth, and 0.66 Hz for identity; trial segments last
1.0, 4.5 and 0.5 s. The Methods describe sinusoidal modulation but do not give
the exact phase trajectory or its peak weight. Whole-image generation, the
circular target with extra turns, and peak 0.85 are therefore labelled as
adaptations, rather than exact reproduction of the study.

The grey background was caused by restoring the source completely at each
playback peak. The demonstration now stops at a partially scrambled source,
retaining texture throughout the frame. Weight 1 remains available for
inspecting the source. The numerical value 0.85 is a demonstration choice,
not a recovered experimental parameter or 85% perceptual visibility.

Merely lowering the previous peak setting exposed another error: onset and
offset used independently scrambled frames, which only meet when weight is 1.
Both halves now meet at one shared peak phase. Each half still approaches its
own noise endpoint, preserving changing noise between cycles. The schedule
uses a raised-cosine envelope; for an odd number of frames, the actual sampled
maximum is below the continuous maximum and is recorded separately in exports.

The scientific text now distinguishes the following:

- Fixed global amplitudes preserve the floating-point pixel mean and standard
  deviation. Rounding and clipping can change the exported statistics.
- Fixed amplitudes do not preserve pixel histograms, local contrast, local
  edges or every low-level visual response. A response at a tag frequency does
  not establish exclusively semantic or face-specific processing.
- Sequence mode implements spectrum matching, not SHINE's complete workflow.
- Similarity to the source is an image correlation, not a recognition score.
  Sadr and Sinha's rejection of non-monotonic paths is not implemented.
- Pixel statistics are not calibrated screen luminance. Display calibration
  and presentation timing require separate measurement.

## Numerical definitions

For an unscaled forward DFT of N pixels, with amplitude A and a fixed, positive
DC coefficient:

```
mean = A[0] / N
SD = sqrt(sum(A[k]^2, k != 0)) / N
```

The page calls SD of grey values in [0, 1] “RMS contrast”; it does not divide
by the mean. The definition is now explicit. Normalisation sums non-DC energy
directly, avoiding cancellation from subtracting the DC energy from a nearly
equal total. Uniform image sets are rejected, since they contain no phase
structure to reveal; a flat spectrum cannot be scaled to positive contrast.

Let T be the original target from source phase S to the onset noise. For peak
p below 1, the common peak is `Q = wrap(p*S + (1-p)*T)`, with conjugate symmetry
enforced. Onset and offset targets are constructed from Q to their respective
noise endpoints. Both paths use envelope weight divided by p, so at the apex
they both equal Q. For p = 1, Q = S and the full-restoration path is retained.
Fourier amplitudes and DC remain fixed throughout.

## Verification

`npm run check` covers the FFT, phase rules, golden comparison, partial-peak
continuity, retained background texture, low-contrast normalisation, export
round trip, and metadata for odd frame periods. Only the affected
`sequence_64_frames.float64` fixture was regenerated; its existing inputs,
random arrays and 1e-9 tolerance were retained.

An independent NumPy run of all 360 default frames with the committed demo
images found relative amplitude-spectrum error below 3e-16, constant
floating-point mean and SD to numerical precision, and minimum background SD
0.0421. Peak source correlations ranged from 0.682 to 0.825. These are numerical
properties of this demo, not human recognition results. Reproduce the check
and the updated figure with `python tools/reference/audit_demo.py`.

The 360-frame PNG ZIP exported by the TypeScript core also passed the independent
Python verifier: mean 0.627576–0.627591, SD 0.081892–0.081909, maximum
relative amplitude-spectrum deviation 0.00127 after quantisation, and a
content-correlation spectral peak at 2.001 Hz for the requested 2 Hz.

The embedded example uses the MP4 already hosted with the blog, with native
controls, no autoplay and no preload. Its sequence contains 360 frames encoded
at 50 frames/s; a 60 frames/s presentation gives the reported 6 s trial.
That experimental presentation rate is inferred, rather than explicitly
reported in the Methods. The original Figshare record remains linked.
