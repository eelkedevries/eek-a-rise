# Current state

Living, high-level orientation for the project: what exists now, key architectural decisions, and what is in progress. Read it at the start of a session to orient quickly.

Update it only for genuinely useful orientation — a new system, an architectural decision — not after routine commits. A stale or bloated state file is worse than none.

This file records what *is* (current reality). The binding design canon is `docs-dev/reference/primary_authoritative/`; when the two conflict, the canon wins and the gap is work still to be done.

## Systems

- Handoff seed (2026-10-27): the documentation, the specification v0.1 and the
  Python reference in `tools/reference/` (`rise_reference.py`, golden data, 15
  synthetic demo faces). No web application yet.

## Key decisions

See `docs-dev/plan.md` (decisions table) and the specification. In short:
SiteGround deploy via the eelkedevries.com repository as for eek-a-look; Vite +
TypeScript; own FFT checked against golden data; everything in the browser.

## In progress / next

Prompt 001 (`001_setup.md`).

## Prompts run

_A running list of completed prompts, newest last. Add the prompt filename as each is run._
