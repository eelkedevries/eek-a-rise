# eek-a-rise: plan for v1

**Agreed:** 2026-10-27 (handoff; re-scoped the same day to full images) ·
**Target:** v1 live within two weeks of prompt 001

The binding detail is in
[`reference/primary_authoritative/specification.md`](reference/primary_authoritative/specification.md).
This file is the short overview. Background is in
[`reference/secondary_background/`](reference/secondary_background/):
`science_background.md` (the paper, RISE, what the clip shows),
`explainer_texts.md` (public wording) and the verification numbers.

## Goal

A public page at <https://eelkedevries.com/eek-a-rise/> where visitors watch an
image emerge from phase noise while its overall brightness and contrast stay the
same, and build frequency-tagged sequences of whole images, as in de Vries and
Baldauf (2019), to view, check and download for experiments. Everything runs in
the visitor's browser.

## Decisions

| Topic | Decision |
|---|---|
| Name | eek-a-rise: RISE, the method, and *arise*, what the images do |
| Repository | `eelkedevries/eek-a-rise`, public (created empty by the owner) |
| Hosting | SiteGround, as eek-a-look: `deploy-eek-a-rise.yml` in the eelkedevries.com repository builds this public repository and rsyncs it to `/eek-a-rise/`; started with `npm run deploy`. No secrets here, no GitHub Pages |
| Audience | General public first, researchers second: the tool comes first, with short explanations and an expert section |
| Scope | Full images only. The compound stimulus of the paper (eye, mask and mouth bands) is not built (owner, 2026-10-27) |
| Language | English (British) only |
| Stack | Vite + TypeScript, no UI framework, Web Worker; `eek-a-template` v0.3.0 |
| FFT | Own implementation (mixed radix 2/3/4/5 and Bluestein), checked against the golden data; no dependency |
| RISE target | Circular by default (no corner artefact); the sign rule of the handoff as an option |
| Reference | `tools/reference/rise_reference.py` (Python) is the numerical reference; the golden data come from `make_golden.py` |
| Examples | 15 synthetic faces (3 identities; 5 expressions each) and two chessboards; no photographs of real people |
| Visitors' images | Upload only; processed on the device, never sent |
| Downloads | Lossless PNG frames (ZIP) and H.264 MP4 with exact timestamps, each with `parameters.json`, `schedule.csv` and `frame_stats.csv` |
| Look | The same as eelkedevries.com (dark theme; Lexend, Spectral, JetBrains Mono) |
| Licence | MIT |
| Projects page on eelkedevries.com | A card after v1 (prompt 013), if the owner confirms |
| Prompt files | `docs-dev/agent/prompts/` (eek-a-template layout) |

## How v1 works

- **One image:** pick or upload an image, then move a weight slider from noise
  (0) to image (1), or press *Play*. Readouts show that the whole-image mean and
  RMS contrast do not change. A choice compares RISE with the sign rule and with
  plain phase interpolation, which brighten the corners.
- **Sequence:** an ordered list of images (the nine demo faces by default) is
  prepared (grey, S × S, optional outline on a mean-grey background, spectra
  matched, optional mean and contrast), and each image emerges from and
  dissolves into noise once per cycle at the tag rate (default 2 Hz at
  60 frames/s), between 1 s of baseline noise and 0.5 s of post noise. The
  sequence renders in a worker, plays by elapsed time, shows per-frame mean,
  RMS contrast and similarity to the source, and can be downloaded.
- **How it works:** the adapted text *Faces from noise*, the chessboard example,
  the RISE figure, the caveats and the references.

## Prompt sequence

The site is deployed early (prompts 002–003), so the SiteGround route is proven
first. From prompt 003 onwards, each prompt that changes the page ends with
`npm run deploy`.

| # | Prompt | Notes |
|---|---|---|
| 001 | `001_setup.md`: complete the template, Vite + TS, base path, reference tooling | |
| 002 | `002_website_deploy_workflow.md`: in eelkedevries.com, protect `/eek-a-rise/` and add `deploy-eek-a-rise.yml` | A push to eelkedevries.com `main` deploys the site |
| 003 | `003_deploy_command.md`: `npm run deploy`; first deploy of the placeholder | |
| 004 | `004_page_shell.md`: layout, site look, fonts, upload, example gallery | |
| 005 | `005_fft_core.md`: FFT, golden checks in `npm run check` | |
| 006 | `006_rise_core.md`: spectrum, both RISE targets, noise path, spectrum matching, normalisation, schedule, sequence renderer, PRNG | Golden and property checks |
| 007 | `007_one_image_mode.md`: worker, One image mode | |
| 008 | `008_trial_setup.md`: the Sequence tab: image list, preparation, parameters, schedule preview | |
| 009 | `009_trial_render_player.md`: render in the worker, player, per-frame statistics | |
| 010 | `010_downloads.md`: PNG ZIP, MP4, parameters, schedule, statistics; Python verifier | |
| 011 | `011_how_it_works.md`: explainer, figures, caveats, references | |
| 012 | `012_about_docs_release.md`: About, README, docs, end-to-end check | v1 done |
| 013 | `013_projects_card.md`: card on eelkedevries.com/projects | Owner confirms first |

## Later (not v1)

- Several workers in parallel to shorten rendering.
- Shuffled or counterbalanced image orders, and oddball designs (a different
  image category every n-th cycle).
- Non-square images.
- Optional strict monotonicity check, as Sadr and Sinha recommend.
