# eek-a-rise: plan for v1

**Agreed:** 2026-10-27 (handoff) · **Target:** v1 live within two weeks of prompt 001

The binding detail is in
[`reference/primary_authoritative/specification.md`](reference/primary_authoritative/specification.md).
This file is the short overview. Background is in
[`reference/secondary_background/`](reference/secondary_background/):
`science_background.md` (the paper, RISE, what the clip shows),
`explainer_texts.md` (approved public wording) and the verification numbers.

## Goal

A public page at <https://eelkedevries.com/eek-a-rise/> where visitors watch an
image emerge from phase noise while its overall brightness and contrast stay the
same, and build the compound frequency-tagged face stimuli of de Vries and
Baldauf (2019), to view and to download. Everything runs in the visitor's browser.

## Decisions (handoff of 2026-10-27)

| Topic | Decision |
|---|---|
| Name | eek-a-rise: RISE, the method, and *arise*, what the faces do |
| Repository | `eelkedevries/eek-a-rise`, public (created empty by the owner) |
| Hosting | SiteGround, as eek-a-look: `deploy-eek-a-rise.yml` in the eelkedevries.com repository builds this public repository and rsyncs it to `/eek-a-rise/`; started with `npm run deploy`. No secrets here, no GitHub Pages |
| Audience | General public first, researchers second: the tool comes first, with short explanations and an expert section |
| Language | English (British) only |
| Stack | Vite + TypeScript, no UI framework, Web Worker; `eek-a-template` v0.3.0 |
| FFT | Own implementation (mixed radix 2/3/4/5 and Bluestein), checked against the golden data; no dependency |
| Reference | `tools/reference/rise_reference.py` (Python) is the numerical reference; the golden data come from `make_golden.py` |
| Examples | 15 synthetic faces (3 identities; 3 eye and 2 mouth expressions each) and two chessboards; no photographs of real people |
| Visitors' images | Upload only; processed on the device, never sent |
| Downloads | Lossless PNG frames (ZIP) and H.264 MP4 with exact timestamps, each with `parameters.json` and `schedule.csv` |
| Look | The same as eelkedevries.com (dark theme; Lexend, Spectral, JetBrains Mono) |
| Licence | MIT |
| Projects page on eelkedevries.com | A card after v1 (prompt 013), if the owner confirms |
| Prompt files | `docs-dev/agent/prompts/` (eek-a-template layout) |

## How v1 works

- **One image:** pick or upload an image, then move a weight slider from noise
  (0) to image (1), or press *Play*. Readouts show that the whole-image mean and
  RMS contrast do not change. A toggle compares RISE with plain phase
  interpolation, which brightens the corners.
- **Compound trial:** the demo faces, or the visitor's own, are prepared (grey,
  400 × 400, face outline on a mean-grey background, spectra matched), turned into
  RISE sequences and assembled into eye, mask and mouth bands. A 6-s trial
  (1 s baseline, 4.5 s stimulus, 0.5 s mask) renders in a worker, plays at
  60 frames/s and can be downloaded.
- **How it works:** the approved text *Faces from noise*, the chessboard example,
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
| 006 | `006_rise_core.md`: spectrum, RISE, noise path, mask, spectrum matching, schedule, PRNG | Golden checks |
| 007 | `007_one_image_mode.md`: worker, One image mode | |
| 008 | `008_trial_setup.md`: preparation, face outline, identities, parameters | |
| 009 | `009_trial_render_player.md`: render in the worker, player | |
| 010 | `010_downloads.md`: PNG ZIP, MP4, parameters and schedule | |
| 011 | `011_how_it_works.md`: explainer, figures, caveats, references | |
| 012 | `012_about_docs_release.md`: About, README, docs, final checks | v1 done |
| 013 | `013_projects_card.md`: card on eelkedevries.com/projects | Owner confirms first |

## Later (not v1)

- Several workers in parallel to shorten rendering.
- A diagnostics panel: weight, visibility proxy and band contrast per frame.
- Different band layouts, sizes and frame rates (120 Hz).
- Optional strict monotonicity check, as Sadr and Sinha recommend.
