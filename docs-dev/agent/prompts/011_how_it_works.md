# Task: How it works (explainer, figures, caveats, references)

## Goal

Fill the *How it works* section with the approved explanation, the figures, the
expert section with its caveats, and the references.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Wording: `docs-dev/reference/secondary_background/explainer_texts.md`:
  - section 2 is the general text;
  - section 3 is *For researchers*;
  - section 4 holds the captions;
  - section 5 holds the short texts;
  - *Claim rules* at the top bind any wording you add or shorten.
- Figures: `docs-dev/reference/secondary_background/figures/`
  (`rise_photo_sadr_sinha_vs_plain.png`, `chessboard_on_grey.png`,
  `demo_trial_first_identity.png`).
- The public-build check rejects any mention of `docs-dev` in built files.

## Required changes

1. Copy the three figures to `public/figures/` (converted to WebP or optimised
   PNG, each under 400 kB), with `alt` text derived from the captions.
2. Build *How it works* from section 2 verbatim (as a module in `src/content/`),
   with the chessboard figure after
   the chessboard sentence and the RISE figure after the paragraph on scrambling.
3. Add a collapsible *For researchers* block with section 3 verbatim, the
   demo-trial figure, and the *Published clip* note from section 5 with a link
   to the clip <https://figshare.com/s/f8a1e2760937ca35c4f0>.
4. Add *References* with the three references from `explainer_texts.md`,
   including the DOI link for de Vries and Baldauf (2019).
5. In the Compound trial parameters (prompt 008), make each *clip* or
   *assumption* label link to the paragraph of *For researchers* that explains
   it.
6. Keep all public prose in `src/content/` (one module per section). Add
   `scripts/check-claims.mjs` and include it in `npm run check`. It scans
   `src/content/**` and the text nodes of `index.html` (not other code, where
   words such as `static` are keywords) and fails on:
   - the contractions n't, it's, that's, there's, what's, let's, I'm, 're, 'll,
     've and 'd (possessives such as "brain's" are fine);
   - the phrases "the image stays the same", "pixels stay the same", "static" and
     "a computer".
7. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- new explanatory text beyond headings, captions and alt text. If more seems
  needed, propose it in the final report instead;
- a diagnostics panel (later).

## Acceptance criteria

The task is complete when:
- the live page shows the general text, the three figures with captions, the
  expert block and the references;
- `scripts/check-claims.mjs` passes and is part of `npm run check`;
- the public-build check passes (no `docs-dev` strings in `dist/`).

## Checks

`npm run check`; `npm run deploy`; read the section on the live page on a phone
and a desktop.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push. Then
run `npm run deploy`.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
