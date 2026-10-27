# Task: Sequence set-up

## Goal

Let a visitor assemble a frequency-tagged sequence of whole images: an ordered
image list, the image preparation, and the parameters with their provenance.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification 0.2: *Image preparation*, *Sequence schedule*, *Defaults and
  their provenance*, *Interface* (Sequence). Full images only: no bands, no
  identities with separate eye and mouth images.
- `src/core/schedule.ts` validates the settings and assigns an image to every
  cycle (prompt 006). `src/core/preprocess.ts` exists (prompt 007).
- The default list mirrors the published clip's eye band, as whole faces: the
  nine `eyes` images of `public/examples/manifest.json` in manifest order.

## Required changes

1. Sequence tab, *Images*: an ordered list (at least 1, at most 64 images), filled
   from the gallery or uploads, with *add*, *remove* and *move up/down*; the
   default list loads on first visit, and *Reset to demo set* restores it.
2. *Preparation*: image size (256, 400, 512, 600, 800; default 400), the outline
   toggle (default off) with sliders for the ellipse centre (x, y) and radii
   (horizontal, vertical) as fractions of the size, applied to every image, and a
   prepared preview of the selected image.
3. *Parameters*: the defaults table of the specification as form fields, each
   labelled *paper*, *clip*, *assumption* or *this project*:
   - frame rate (30–240 frames/s) and tag frequency in Hz, with the period in
     frames shown;
   - cycles per image;
   - baseline, stimulus and post durations, with frame counts;
   - peak weight;
   - RISE method (*RISE* or *Sign rule*);
   - normalisation (off, or a mean and an RMS contrast);
   - fixation cross (off or on);
   - seed.

   Validate with `src/core/schedule.ts` and the 400 MB limit, and show the
   messages inline. *Build* stays disabled while anything is invalid. Note when
   some images are never shown (fewer cycles than images × cycles per image).
4. *Schedule preview*: a compact timeline for the current settings, with the
   segments and every cycle coloured by its image, drawn from `schedule.ts`.
5. Keep the sequence set-up in `src/state.ts`; store parameters, but not images,
   in `localStorage` (preferences only, inside try/catch).
6. Add a *Build* button that is present but disabled, with the note "Rendering
   arrives in the next version."
7. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- rendering, the player or downloads (prompts 009–010);
- spectrum matching in the interface (it happens at render time);
- storing images anywhere;
- compound stimuli, bands or identities with separate part images.

## Acceptance criteria

The task is complete when, on the live page:
- the default list shows the nine demo faces;
- a tag frequency of 7 Hz at 60 frames/s shows a clear message (the period is
  not a whole number of frames) and disables *Build*; so does a stimulus of 4.4 s
  at 2 Hz (not a whole number of cycles);
- the schedule preview shows, for the defaults, nine cycles, one per image;
- an uploaded image can be added to the list and the outline adjusted;
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
