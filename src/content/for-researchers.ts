/** "For researchers" (explainer_texts.md, section 3, adapted for whole images) and the short notes of section 5. */

export const title = 'Frequency tagging without luminance flicker';

export const method = [
  'Steady-state paradigms commonly drive their tags with luminance or contrast modulation, which evokes strong responses in early visual cortex. Here the tag is carried by image content. Images are converted to greyscale, optionally cropped to an elliptical outline on a mean-grey background, and given the set-average Fourier amplitude spectrum, which equates mean luminance and RMS contrast exactly. Their visibility is then modulated with Random Image Structure Evolution (RISE; Sadr &amp; Sinha, 2004). The Fourier phase moves linearly from a random phase spectrum to the image’s own, so every frame keeps the common amplitude spectrum and therefore the same mean luminance and RMS contrast, up to 8-bit rounding.',
];

/** The paragraph the parameter tags "this project" link to. */
export const target =
  'Each phase travels the shorter way round the circle, as in the minimum-distance interpolation of Ales et al. (2012), and a random half of the phases make one extra full turn in a random direction, so that the image stays hidden until about halfway and is recognisable for about a third of each cycle. Interpolating the raw phase values instead, with the extra turn following the sign of the image’s phase, avoids the bright corners of plain interpolation only at the halfway point: earlier the corners brighten, later they darken. The page offers that reading of Sadr and Sinha as an option; the example clip of the original study shows no such corners.';

/** The paragraph the parameter tags "clip" and "assumption" link to. */
export const inferredIntro =
  'The procedure follows de Vries and Baldauf (2019), who applied it to separate eye and mouth bands of a compound face; this page applies it to whole images only. Three parameters are not reported in the paper and were inferred from its published example clip:';

export const inferred = [
  'a 60 Hz frame rate (adjustable here);',
  'a raised-cosine interpolation weight from pure noise to the full image;',
  'a new noise end-point every half cycle.',
];

export const caveats =
  'Some caveats apply. Whole-image statistics are constant, but local statistics are not: a face concentrates its contrast in some regions, whereas noise spreads it evenly, so the contrast of any part of the image changes as the image emerges (by about 7–10 % for the upper and lower 160 rows of the demo faces). With the extra turns, the visibility waveform is narrower than a sinusoid and carries harmonics of the tag frequency. Emerging phase structure also forms local edges that early visual cortex encodes. Constant global statistics reduce low-level confounds; they do not remove them. Finally, the statistics are defined in pixel values: on the screen they hold for luminance only on a display that is linearised (gamma-corrected) or measured.';

export const demoFigure = {
  src: 'figures/demo_sequence.webp',
  width: 2000,
  height: 600,
  alt: 'Thirty frames of the default sequence in three rows: three faces, each emerging from noise and dissolving into it.',
  caption: 'The first 1.5 s of the default sequence after the baseline (1.0–2.5 s), every third frame: three faces, each emerging from and dissolving into noise.',
};

export const publishedClip =
  'The example clip published with the paper plays at 5/6 of the experiment’s speed, because frames made for a 60 Hz display were saved at 50 frames per second.';

export const clipUrl = 'https://figshare.com/s/f8a1e2760937ca35c4f0';
