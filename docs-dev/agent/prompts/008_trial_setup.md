# Task: Compound trial set-up

## Goal

Let a visitor assemble a compound trial: identities with their eye and mouth
images, a face outline per image, and the parameters with their provenance.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification: *Image preparation*, *Trial schedule* (period rules and image
  choice), *Defaults and their provenance*, *Interface* (Compound trial).
- `src/core/schedule.ts` validates periods and implements the image choice
  (prompt 006). `src/core/preprocess.ts` exists (prompt 007).
- The default set mirrors the published clip: identities `ida`, `ben`, `cas` from
  `public/examples/manifest.json`, each with its three eye and two mouth images in
  manifest order.

## Required changes

1. Compound trial tab, *Faces*:
   - a list of identities (1–8). Each has a name, an ordered list of eye images and
     an ordered list of mouth images, filled from the gallery or uploads, with
     *add*, *remove* and *move up/down*;
   - the default set loads on first visit, and *Reset to demo set* restores it.
2. Face outline editor: for a selected image, its prepared preview (grey,
   400 × 400, outline applied on the mean background) and sliders for the ellipse
   centre (x, y) and radii (horizontal, vertical), starting from the
   specification's default. Store the ellipse per image.
3. Compound trial tab, *Parameters*: the defaults table of the specification as
   form fields, each labelled *paper*, *clip* or *assumption*:
   - eye, mouth and identity rates in Hz, with the frame counts shown;
   - baseline, stimulus and post durations;
   - frame rate (60, shown read-only in v1);
   - weight range (a min, a max);
   - seed;
   - cue (P, E, M, none);
   - mask loop.

   Validate with `src/core/schedule.ts` and show its messages inline. *Build*
   stays disabled while anything is invalid.
4. *Schedule preview*: a compact timeline for the current settings, with the
   segments, eye and mouth cycles coloured by identity, and identity changes
   marked. It is drawn from `schedule.ts`, so it shows exactly which image each
   cycle uses.
5. Keep the trial set-up in `src/state.ts`; store parameters, but not images, in
   `localStorage` (preferences only, inside try/catch).
6. Add a *Build* button that is present but disabled, with the note "Rendering
   arrives in the next version."
7. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- rendering, the player or downloads (prompts 009–010);
- spectrum matching in the interface (it happens at render time);
- storing images anywhere.

## Acceptance criteria

The task is complete when, on the live page:
- the demo set shows three identities with three eye and two mouth images each;
- changing the mouth rate to 1.5 Hz shows a clear message, because the identity
  period is then not a multiple of the mouth period, and disables *Build*;
- the schedule preview shows, for the defaults, nine eye cycles and six mouth
  cycles in three identity blocks, matching the image choice rule;
- an uploaded image can be added to an identity and its outline adjusted;
- `npm run check` passes.

## Checks

`npm run check`; `npm run deploy`; check the behaviour above on the live page.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push. Then
run `npm run deploy`.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
