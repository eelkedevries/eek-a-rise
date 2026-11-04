/** "For researchers" (explainer_texts.md, section 3, adapted for whole images) and the short notes of section 5. */

export const title = 'Frequency tagging with controlled global image statistics';

export const method = [
  'Sequence mode replaces each image’s Fourier amplitude spectrum with the set average while keeping its phase, following the spectrum-matching principle described by Sadr and Sinha (2004) and implemented in SHINE (Willenbockel et al., 2010). This is not the full SHINE preprocessing pipeline: luminance histograms are not matched. RISE then changes phase with conjugate symmetry and the DC term preserved. Before display mapping, fixed amplitudes imply a fixed mean and population standard deviation by Parseval’s theorem. Here RMS contrast means the population standard deviation of grey values in [0, 1], rather than standard deviation divided by mean. Rounding and clipping can alter the exported statistics; the readouts and downloads report the actual 8-bit values.',
];

/** The paragraph the parameter tags "this project" link to. */
export const target =
  'The default circular target combines shortest-path phase interpolation, described by Ales et al. (2012), with an additional full turn for a random half of conjugate pairs. This combination is a project adaptation, not a verbatim implementation of either paper. The sign-rule option implements the extra-turn rule described by Sadr and Sinha (2004); plain raw-angle interpolation omits those turns. The comparisons show position-specific artefacts in these alternatives. Phase weight is not a percentage of perceptual visibility, and recognisability depends on the image and observer.';

/** The paragraph the parameter tags "clip" and "assumption" link to. */
export const inferredIntro =
  'De Vries and Baldauf (2019) report 400 × 400 px images, eye and mouth tags of 2.00 and 1.33 Hz, identity changes at 0.66 Hz, and trial segments of 1.0, 4.5 and 0.5 s. They describe sinusoidal emergence and disappearance, but do not report the exact phase trajectory or maximum interpolation weight. This page adapts the method to whole images. Additional choices are:';

export const inferred = [
  '60 frames/s, inferred from the published clip’s frame sequence and the reported experimental rates;',
  'a raised-cosine envelope, consistent with the reported sinusoidal modulation but not a measured visibility function;',
  'peak weight 1, restoring the prepared source. The synthetic examples are embedded in a phase-noise surround before whole-image RISE, with a soft transition at the face boundary. This example preparation is a project adaptation, not a recovered step of the paper;',
  'one shared partially scrambled peak for both halves of a cycle, with different noise end-points before and after it. The two paths meet continuously, including when the peak is below 1.',
];

export const caveats =
  'Local statistics and edges still change, and phase noise is not guaranteed to remove every recognisable cue from every input. The extra turns and the nonlinear relationship between phase and recognition can introduce harmonics and non-monotonic changes in similarity. Sadr and Sinha describe rejecting non-monotonic trajectories; that selection step is not implemented here. The original study combined separately modulated image bands, so global invariance of the full-image algorithm does not imply invariance of every band or of its compound display. Finally, pixel statistics describe physical luminance only when the display transfer function is linearised or measured. Use the measured PNG frames and validate timing and luminance on the experimental display.';

export const demoFigure = {
  src: 'figures/demo_sequence.webp',
  width: 2000,
  height: 600,
  alt: 'Thirty frames of the default sequence in three rows: three faces, each emerging from noise and dissolving into it.',
  caption: 'The first 1.5 s after the baseline (1.0–2.5 s), every third frame. Each face reaches full visibility at weight 1 while the prepared noise surround remains textured.',
};

export const publishedClip =
  'The published sequence contains 360 frames, encoded at 50 frames/s. Presenting those frames at the inferred experimental rate of 60 frames/s gives the reported 6 s trial. At its encoded rate the sequence runs at 5/6 of that speed; the experimental tag rates describe the experiment, rather than the video playback.';

export const clipUrl = 'https://figshare.com/s/f8a1e2760937ca35c4f0?file=9742972';
export const clipVideoUrl = 'https://eelkedevries.com/blog/frequency-tagged-face-stimuli/trento_stimulus.mp4';
export const blogUrl = 'https://eelkedevries.com/blog/frequency-tagged-face-stimuli/';
