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

## Key decisions

See `docs-dev/plan.md` (decisions table) and the specification. In short:
SiteGround deploy via the eelkedevries.com repository as for eek-a-look; Vite +
TypeScript; own FFT checked against golden data; everything in the browser.

## In progress / next

Prompt 006 (`006_rise_core.md`).

## Prompts run

_A running list of completed prompts, newest last. Add the prompt filename as each is run._

- `001_setup.md`
- `002_website_deploy_workflow.md` (eelkedevries.com commit `916e040`; *Render & Deploy* green)
- `003_deploy_command.md`
- `004_page_shell.md`
- `005_fft_core.md`
