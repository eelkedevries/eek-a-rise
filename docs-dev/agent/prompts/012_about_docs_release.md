# Task: About, documentation and v1 release checks

## Goal

Finish the About section and the user documentation, record the v1 state, and
verify the live page end to end.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification: *Scope*, *Privacy*, *Naming and voice*.
- Prompts 004–011 built the page. `docs/` holds the template's user documents and
  `deployment.md` (prompt 003).

## Required changes

1. *About*:
   - who made it (Eelke de Vries, first author of the paper), and why;
   - the privacy text;
   - the licence (MIT) with a link to the source;
   - the app version;
   - credits for the methods (RISE, SHINE) by reference;
   - one sentence that the example faces are synthetic.
2. `README.md`: keep it concise. Add a short *Features* list (One image, Compound
   trial, Downloads) and keep *Running locally*.
3. `docs/usage.md`: how to use both modes, the parameters and their provenance,
   the downloads, and research use (PNG frames, refresh-locked presentation, the
   identity period rule).
4. `docs/troubleshooting.md`: no WebCodecs, slow builds on phones, the
   refresh-rate warning, clipped pixels, large uploads.
5. Specification: bump to 1.0 and record any decision taken during prompts
   004–011 that is not yet in it.
6. `docs-dev/planning/current_state.md`: mark v1 live, list the systems, and add
   the prompts run.
7. End-to-end check of the live page in Chrome and Firefox, with Playwright if
   available, otherwise by hand:
   - the page loads without console errors;
   - no request leaves `/eek-a-rise/`;
   - One image works on a demo face and an uploaded photo;
   - the default trial builds, plays and downloads (PNG ZIP; MP4 or WebM).

## Do not implement

Do not implement:
- new features or new explanatory text beyond About and the documents above;
- the Projects card on eelkedevries.com (prompt 013).

## Acceptance criteria

The task is complete when:
- the About section and the documents are in place, in British English, house
  style;
- the end-to-end check passes, and its results are listed in the final report;
- the specification is at 1.0 and `current_state.md` marks v1 live;
- `npm run check` passes and the live page matches the last commit.

## Checks

`npm run check`; `npm run deploy`; the end-to-end check above.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push. Then
run `npm run deploy`.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
