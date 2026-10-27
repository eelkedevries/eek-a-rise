# Task: Page shell, site look, upload and example gallery

## Goal

Give the page the eelkedevries.com look and its section structure, with local
image upload and a gallery of the 17 examples, without any image processing yet.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Specification: *Interface*, *Privacy*, *Naming and voice*.
- Model for the look and the upload: `eelkedevries/eek-a-look` (public),
  `src/style.css` (`:root` colour tokens, fonts, radius, gutter), the
  `@fontsource` imports at the top of `src/main.ts`, and `src/image-input.ts`
  (local decoding, size and type checks). Reuse those patterns; do not import from
  that repository.
- Example images: `tools/reference/demo-faces/*.png` (15 synthetic faces, 400 × 400,
  grey; file names `<identity>_<band>_<expression>.png`, identities `ida`, `ben`,
  `cas`).

## Required changes

1. Install `@fontsource/lexend`, `@fontsource/spectral` and
   `@fontsource/jetbrains-mono`; import the Latin subsets used by eek-a-look.
2. Add `src/style.css` with the same `:root` tokens and base typography as
   eek-a-look (dark theme), and a responsive single-column layout (max width
   about 1100 px; one column on phones).
3. Structure `index.html` and `src/main.ts` into:
   - a header: title "eek-a-rise" and the lede "Faces that emerge from noise, while
     overall brightness and contrast stay the same.";
   - *Try it*, with two tabs, *One image* and *Sequence*, each with a short
     placeholder line ("Arrives in a later version.");
   - *How it works* (placeholder heading);
   - *About*, with the privacy text from
     `docs-dev/reference/secondary_background/explainer_texts.md` section 5 and a
     link to the source repository.
4. Copy the 15 demo faces to `public/examples/faces/` and add
   `public/examples/manifest.json`: one entry per file with `file`, `identity`,
   `band` (`eyes` or `mouth`: the expression that differs, kept from the file
   names), `expression` and a readable `label`.
5. Add `src/examples/chessboards.ts`, which draws two 400 × 400 grey examples
   procedurally:
   - **chessboard:** 8 × 8 squares of 50 px, values 0.5 ± 0.5/3.8;
   - **chessboard on grey:** 8 × 8 squares of 40 px centred on a 0.5 background,
     same values.
6. Add `src/image-input.ts` (upload via file input and drag-and-drop, decoded
   locally with `createImageBitmap`, type check, a 25 MB limit, friendly errors)
   and `src/state.ts` holding the current image list and selection.
7. Add a gallery component used by both tabs, with the selected item
   highlighted. It shows thumbnails of the 15 faces (grouped by identity) and the
   visitor's uploads, plus the two chessboards in the One image tab only.
   Images are whole images throughout; there is no division into parts.
8. Update `docs-dev/planning/current_state.md` (*Systems*, *Prompts run*).

## Do not implement

Do not implement:
- any Fourier or RISE code, a worker, or canvas rendering beyond thumbnails;
- the sequence set-up, the player or the downloads;
- analytics, external fonts or any network request other than the page's own
  assets.

## Acceptance criteria

The task is complete when:
- the live page at `https://eelkedevries.com/eek-a-rise/` shows the site look,
  the three sections and both tabs;
- the gallery shows 15 faces in three identity groups and two chessboards;
  uploading a JPEG or PNG adds it to the gallery, and a non-image shows a clear
  error;
- the browser's network panel shows no request outside `/eek-a-rise/`;
- `npm run check` passes.

## Checks

`npm run check`; `npm run deploy`; open the live page, upload an image, and
confirm there are no console errors or external requests.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push. Then
run `npm run deploy`.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
