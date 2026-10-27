/** "How it works", general text (explainer_texts.md, section 2, adapted for whole images). */

export const title = 'Faces from noise';

export const intro = [
  'A face that suddenly appears on a screen triggers a strong response in the brain’s early visual areas. That response can drown out the weaker signals from the areas that process faces. The stimuli on this page avoid that problem: the images gradually emerge from noise and then dissolve back into it.',
  'All images are first converted to black and white and matched in brightness, contrast and level of detail. An algorithm then scrambles each image, shuffling where the detail sits without changing how much detail there is. Take a chessboard as an example. Scrambled this way, it loses its neat squares. It still shows about as many dark as light spots, however, on average roughly the size of a chess square.',
];

export const afterChessboard = [
  'Fully scrambled, a face is reduced to unrecognisable noise. Gradually unscrambling it makes the face reappear. The image’s overall brightness, contrast and level of detail stay the same throughout; only the amount of recognisable content changes.',
];

export const afterRise = [
  'In a sequence, each image fades in and out at a fixed pace, for example twice per second, and the next image follows in the next cycle. This technique is called frequency tagging. The rhythm acts as a label: a brain area that responds to the content of the images shows activity at that rhythm. Because the overall brightness and contrast do not change, such a response is much more likely to reflect the content than a flicker of light.',
  'In the original study, the eyes and the mouth of a face were tagged at different rates in one compound stimulus, and participants watched the same sequences while paying attention to the eyes, the mouth or the identity. Because the images did not differ between conditions, differences in their brain responses could be attributed to attention rather than to what was on the screen. This page makes the simpler case: sequences of whole images.',
];

export const figures = {
  chessboard: {
    src: 'figures/chessboard_on_grey.webp',
    width: 1036,
    height: 512,
    alt: 'A grey chessboard on a grey background, and the same image scrambled into irregular dark and light spots.',
    caption: 'A chessboard on a grey background, and the same image scrambled: no neat squares, but about as many dark as light spots of roughly square size.',
  },
  rise: {
    src: 'figures/rise_methods.webp',
    width: 1400,
    height: 600,
    alt: 'Three rows of seven frames of a cat photograph, from noise on the left to the photograph on the right, made with RISE, the sign rule and plain interpolation.',
    caption: 'RISE on a photograph, from noise (0) to the photograph (1). Top: RISE as made on this page. Middle: the sign rule, whose corners brighten early and darken late. Bottom: plain phase interpolation, which brightens the corners halfway. Overall brightness and contrast are the same in every frame.',
  },
};
