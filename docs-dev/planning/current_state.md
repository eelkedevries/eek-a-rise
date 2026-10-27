# Current state

Living, high-level orientation for the project: what exists now, key architectural decisions, and what is in progress. Read it at the start of a session to orient quickly.

Update it only for genuinely useful orientation — a new system, an architectural decision — not after routine commits. A stale or bloated state file is worse than none.

This file records what *is* (current reality). The binding design canon is `docs-dev/reference/primary_authoritative/`; when the two conflict, the canon wins and the gap is work still to be done.

## Systems

- Handoff seed (2026-10-27): the documentation, the specification and the
  Python reference in `tools/reference/` (`rise_reference.py`, golden data, 15
  synthetic demo faces). No web application yet.
- Re-scope (2026-10-27, specification 0.2): full images only; the second mode is
  *Sequence* (frequency-tagged sequences of whole images), not the compound
  trial. The reference gained `Sequence`, the circular RISE target (now the
  default; the sign rule of 0.1 brightens and darkens the corners) and golden
  cases `rise_circular_200` and `sequence_64`.
- Deploy: `npm run deploy` starts `deploy-eek-a-rise.yml` in eelkedevries.com
  (prompts 002–003); the page is live at <https://eelkedevries.com/eek-a-rise/>.
- Page shell (004): site look and self-hosted fonts (`src/style.css`), tabs
  *One image* and *Sequence*, local upload and drag-and-drop
  (`src/image-input.ts`), image list (`src/state.ts`), gallery
  (`src/ui/gallery.ts`) with the 15 faces (`public/examples/`) and two
  procedural chessboards (`src/examples/chessboards.ts`).
- FFT (005): `src/core/fft.ts`, Stockham mixed radix (4, 2, 3, 5) and Bluestein,
  checked against the golden data by Vitest in `npm run check`
  (`tests/golden/`); 400 × 400 `fft2` + `ifft2` takes about 16 ms in Node.
- RISE core (006): `src/core/spectrum.ts`, `rise.ts` (circular and sign-rule
  targets, plain interpolation, noise path, spectrum matching, normalisation),
  `schedule.ts` (sequence schedule and `schedule.csv`), `sequence.ts` (streaming
  renderer that holds only the current cycle's arrays; random arrays by index),
  `stats.ts` (display mapping, fixation cross, per-frame measurements) and
  `prng.ts` (sfc32 with random access to the arrays of a stream). Golden tests
  for every ported case, including the full `sequence_64`; invariant tests in
  `tests/core/`.
- One image (007): `src/core/preprocess.ts` (grey, crop, resize, outline),
  the worker (`src/worker/`: `rise.worker.ts`, typed `client.ts`, `protocol.ts`;
  the page never runs an FFT), and `src/ui/one-image.ts` (slider, Play at one
  cycle per second by elapsed time, New noise with the seed shown, method
  *RISE* / *Sign rule* / *Plain interpolation*, outline, readouts of mean and RMS
  contrast before and after the display mapping, clipped share).
- Sequence set-up (008): `src/ui/sequence-setup.ts` (ordered image list, the
  demo set of nine faces, size and outline with a prepared preview, parameters
  with provenance tags, inline validation from `src/core/plan.ts` and
  `schedule.ts`, schedule timeline and legend); settings (not images) kept in
  `localStorage` by `src/state.ts`.
- Build and player (009): `src/core/build.ts` (8-bit frames, fixation cross and
  per-frame mean, RMS contrast, similarity and clipped share; `peakFrequency`),
  the worker's `build` message with progress and cancel (worker restart), and
  `src/ui/sequence-player.ts` (player by elapsed time, frame step, scrubber,
  loop, measured refresh rate, plot and summary of the measurements). The
  default sequence builds in about 7 s in Node and 9 s in headless Chromium.
  Property tests in `tests/core/sequence.test.ts`.
- Downloads (010): `src/export/params.ts` (`parameters.json`, `frame_stats.csv`,
  `README.txt`), `src/export/zip.ts` (fast-png 8.0.0 and fflate 0.8.3, made in
  the worker with the frames lent and returned), `src/export/video.ts`
  (Mediabunny 1.61.3: H.264 MP4 or VP9 WebM, 8 Mbit/s, key frame every second,
  timestamps snapped to n / fps, grey mapped to the video range 16–235), and
  `src/ui/downloads.ts`. `tests/core/export.test.ts` decodes a ZIP back to the
  built frames; `tools/reference/verify_export.py` checks a ZIP independently in
  Python; `scripts/verify-export.sh` checks a video with ffprobe.
- How it works (011): prose in `src/content/` (general text, *For researchers*,
  references, rendered by `render.ts`), three WebP figures in `public/figures/`,
  parameter tags linked to the explaining paragraphs, and
  `scripts/check-claims.mjs` in `npm run check`. Ales et al. (2012) added as the
  precedent for shortest-way interpolation.
- Release (012): About (`src/content/about.ts`), version 1.0.0, user documents
  in `docs/` (usage with presentation loops, validation, troubleshooting,
  installation), `npm run e2e` (`tests/e2e/sequence.e2e.mjs`, Playwright).

## Key decisions

See `docs-dev/plan.md` (decisions table) and the specification. In short:
SiteGround deploy via the eelkedevries.com repository as for eek-a-look; Vite +
TypeScript; own FFT checked against golden data; everything in the browser.

## In progress / next

**v1 is live** at <https://eelkedevries.com/eek-a-rise/> (version 1.0.0,
specification 1.0). Next: prompt 013 (Projects card), only once the owner has
confirmed it; the owner's review of the adapted explainer texts (sections 2–4)
and of the circular target as the default.

## Prompts run

_A running list of completed prompts, newest last. Add the prompt filename as each is run._

- `001_setup.md`
- `002_website_deploy_workflow.md` (eelkedevries.com commit `916e040`; *Render & Deploy* green)
- `003_deploy_command.md`
- `004_page_shell.md`
- `005_fft_core.md`
- `006_rise_core.md`
- `007_one_image_mode.md`
- `008_trial_setup.md`
- `009_trial_render_player.md`
- `010_downloads.md`
- `011_how_it_works.md`
- `012_about_docs_release.md`
