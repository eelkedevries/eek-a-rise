# eek-a-rise

*Faces that emerge from noise: an in-browser implementation of the RISE compound-face stimuli of de Vries & Baldauf (2019).*

## What this is

A web page at <https://eelkedevries.com/eek-a-rise/> that scrambles an image into
noise and restores it again, while its overall brightness, contrast and amount of
coarse and fine detail stay the same. It also builds the compound face stimuli of
de Vries and Baldauf (2019): eyes and mouth fading in and out at their own rates
(2 Hz and 1.33 Hz) while the identity changes at 0.66 Hz, ready to download as
lossless frames or as video.

Everything runs in your browser. Images are never uploaded.

## Method

The images fade by Random Image Structure Evolution (RISE; Sadr & Sinha, 2004):
the Fourier phase is interpolated towards a random phase while the amplitude
spectrum is kept. The implementation follows the paper's Methods; parameters the
paper does not report were inferred from the published example clip and are marked
as such on the page. `tools/reference/` holds a Python reference implementation
and the test data the browser code is checked against.

- de Vries, E., & Baldauf, D. (2019). Attentional weighting in the face processing
  network. *Journal of Cognitive Neuroscience, 31*(10), 1573–1588.
  <https://doi.org/10.1162/jocn_a_01428>
- Sadr, J., & Sinha, P. (2004). Object recognition and Random Image Structure
  Evolution. *Cognitive Science, 28*, 259–287.
- Willenbockel, V., et al. (2010). Controlling low-level image properties: The
  SHINE toolbox. *Behavior Research Methods, 42*, 671–684.

## Development

Built with Vite and TypeScript. Prompt files live in `docs-dev/agent/prompts/`;
start with `docs-dev/agent/how_to_use.md`. Deployment is described in
`docs/deployment.md`.

## Licence

Released under the MIT Licence. See `LICENSE`.
