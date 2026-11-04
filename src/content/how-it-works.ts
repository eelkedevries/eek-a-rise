/** "How it works", general text (explainer_texts.md, section 2, adapted for whole images). */

export const title = 'Faces from noise';

export const intro = [
  'A face that suddenly appears also introduces an abrupt visual change. To reduce this onset transient, the stimuli on this page gradually emerge from an already visible scrambled pattern and then dissolve back into it. The example faces are prepared within a phase-noise surround, so restoring the face fully at weight 1 also restores the surrounding texture.',
  'Images are first converted to greyscale. In Sequence mode, their Fourier amplitude spectra are matched, controlling whole-image brightness, contrast and the distribution of coarse and fine structure. An algorithm then scrambles the phase, changing where that structure appears. A chessboard on a grey background loses its arrangement of squares when scrambled, while retaining its Fourier amplitude spectrum. This does not preserve its exact numbers of dark and light pixels.',
];

export const afterChessboard = [
  'Scrambling disrupts the arrangement of the face. Gradually restoring its phase makes the face reappear. Before rounding and clipping, the whole-image mean, RMS contrast and Fourier amplitude spectrum stay constant. Local edges, local contrast and the brightness of individual pixels still change.',
];

export const afterRise = [
  'In a sequence, each image emerges and dissolves at a fixed pace, for example twice per second, and the next image follows in the next cycle. This technique is called frequency tagging. Neural responses can follow that rhythm and its harmonics. Holding global brightness and contrast constant reduces some low-level confounds, but the responses can still reflect changing local structure as well as recognisable content.',
  'In the original study, the eyes and the mouth of a face were tagged at different rates in one compound stimulus, and participants watched the same sequences while paying attention to the eyes, the mouth or the identity. Because the images did not differ between conditions, differences in their brain responses could be attributed to attention rather than to what was on the screen. This page makes the simpler case: sequences of whole images.',
];

export const figures = {
  chessboard: {
    src: 'figures/chessboard_on_grey.webp',
    width: 1036,
    height: 512,
    alt: 'A chessboard on a grey background, and its phase-scrambled counterpart.',
    caption: 'The same Fourier amplitude spectrum, with different phase: the regular arrangement of squares is lost. Pixel histograms need not match.',
  },
  rise: {
    src: 'figures/rise_methods.webp',
    width: 1400,
    height: 600,
    alt: 'Three rows of seven frames of a cat photograph, from noise on the left to the photograph on the right, made with RISE, the sign rule and plain interpolation.',
    caption: 'From noise (0) to the photograph (1). Top: the circular RISE adaptation used here. Middle: the sign rule, whose corners brighten early and darken late in this example. Bottom: plain phase interpolation, which brightens the corners halfway. The floating-point reconstructions have identical global statistics; mapping to display values can change them.',
  },
};
