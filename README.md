# eek-a-rise

*Images that emerge from noise: an in-browser implementation of the RISE stimuli of de Vries & Baldauf (2019), for whole images.*

## What this is

A web page at <https://eelkedevries.com/eek-a-rise/> that scrambles an image into
noise and restores it again, while its overall brightness, contrast and amount of
coarse and fine detail stay the same. It also builds frequency-tagged sequences of
whole images, as in de Vries and Baldauf (2019): each image emerges from noise and
dissolves into it at a fixed rate (2 Hz by default), ready to download as lossless
frames or as video, with the measured statistics of every frame.

Everything runs in your browser. Images are never uploaded.

## Method

The images fade by Random Image Structure Evolution (RISE; Sadr & Sinha, 2004):
the Fourier phase is interpolated towards a random phase while the amplitude
spectrum is kept. The implementation follows the paper's Methods, for whole
images only; parameters the paper does not report were inferred from the
published example clip and are marked as such on the page. `tools/reference/` holds a Python reference implementation
and the test data the browser code is checked against.

- de Vries, E., & Baldauf, D. (2019). Attentional weighting in the face processing
  network. *Journal of Cognitive Neuroscience, 31*(10), 1573–1588.
  <https://doi.org/10.1162/jocn_a_01428>
- Sadr, J., & Sinha, P. (2004). Object recognition and Random Image Structure
  Evolution. *Cognitive Science, 28*, 259–287.
- Willenbockel, V., et al. (2010). Controlling low-level image properties: The
  SHINE toolbox. *Behavior Research Methods, 42*, 671–684.

## Development

### Running locally

```bash
npm ci          # install the pinned dependencies
npm run dev     # serve at http://localhost:5173/eek-a-rise/
npm run check   # type check, build and the repository checks
```

Built with Vite and TypeScript. Prompt files live in `docs-dev/agent/prompts/`;
start with `docs-dev/agent/how_to_use.md`. Deployment is described in
`docs/deployment.md`.

## Licence

Released under the MIT Licence. See `LICENSE`.
