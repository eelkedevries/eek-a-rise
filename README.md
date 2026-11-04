# eek-a-rise

*Images that emerge from noise: a browser-based, whole-image adaptation of RISE, inspired by de Vries & Baldauf (2019).*

## What this is

A web page at <https://eelkedevries.com/eek-a-rise/> that scrambles an image into
noise and restores phase structure, holding the global pixel mean, standard deviation
and Fourier amplitude spectrum constant before 8-bit rounding and clipping. The
face examples are prepared within a phase-noise surround, so their background stays textured even at weight 1. Playback reaches the full prepared source. It also builds frequency-tagged sequences of
whole images, as in de Vries and Baldauf (2019): each image emerges from noise and
dissolves into it at a fixed rate (2 Hz by default), ready to download as lossless
frames or as video, with the measured statistics of every frame.

Everything runs in your browser. Images are never uploaded.

## Features

- **One image:** move a weight slider from noise to image, or play the cycle,
  with live readouts showing that the mean and RMS contrast do not change; compare
  RISE with the sign rule and plain phase interpolation.
- **Sequence:** an ordered list of whole images, emerging and dissolving at a tag
  frequency between noise segments, with every parameter's source marked, rules
  that keep periods and cycles to whole frames, a player, and per-frame
  measurements of mean, RMS contrast and similarity to the image.
- **Downloads:** lossless 8-bit PNG frames (ZIP) with `parameters.json`,
  `schedule.csv` and `frame_stats.csv`; H.264 MP4 (or VP9 WebM) with exact frame
  timestamps for viewing.
- **Verification:** golden-data tests against the Python reference, property
  tests, an export round trip, an independent Python checker for downloaded ZIPs
  and an end-to-end browser check. See `docs/validation.md`.

## Method

The images fade by Random Image Structure Evolution (RISE; Sadr & Sinha, 2004):
the Fourier phase is interpolated towards a random phase while the amplitude
spectrum is kept. This is a whole-image adaptation, with project choices distinguished from published
parameters. The exact generation code and peak weight of the original study are
not known from its Methods. Both halves of a cycle meet at one shared partially
scrambled peak, avoiding a discontinuity when the peak weight is below 1. Each phase travels
the shorter way round the circle, with one extra full turn in a random direction
for a random half, which keeps RISE's late emergence without the bright and dark
corners that interpolating raw phase values produces. `tools/reference/` holds a
Python reference implementation and the test data the browser code is checked
against.

- de Vries, E., & Baldauf, D. (2019). Attentional weighting in the face processing
  network. *Journal of Cognitive Neuroscience, 31*(10), 1573–1588.
  <https://doi.org/10.1162/jocn_a_01428>
- Sadr, J., & Sinha, P. (2004). Object recognition and Random Image Structure
  Evolution. *Cognitive Science, 28*(2), 259–287.
  <https://doi.org/10.1207/s15516709cog2802_7>
- Willenbockel, V., et al. (2010). Controlling low-level image properties: The
  SHINE toolbox. *Behavior Research Methods, 42*(3), 671–684.
  <https://doi.org/10.3758/BRM.42.3.671>
- Ales, J. M., Farzin, F., Rossion, B., & Norcia, A. M. (2012). An objective
  method for measuring face detection thresholds using the sweep steady-state
  visual evoked response. *Journal of Vision, 12*(10), 18.
  <https://doi.org/10.1167/12.10.18>

## Development

### Running locally

```bash
npm ci          # install the pinned dependencies
npm run dev     # serve at http://localhost:5173/eek-a-rise/
npm run check   # type check, tests, claim check, build and the repository checks
npm run e2e     # end-to-end check of the built page in Chromium
```

The original published video and its related blog post are linked and playable
under How it works. Scientific sources, corrections and numerical definitions:
[`docs/scientific-audit.md`](docs/scientific-audit.md).

How to use the page, and how to present the frames in an experiment:
`docs/usage.md`. What the checks show: `docs/validation.md`.

Built with Vite and TypeScript. Prompt files live in `docs-dev/agent/prompts/`;
start with `docs-dev/agent/how_to_use.md`. Deployment is described in
`docs/deployment.md`.

## Licence

Released under the MIT Licence. See `LICENSE`.
