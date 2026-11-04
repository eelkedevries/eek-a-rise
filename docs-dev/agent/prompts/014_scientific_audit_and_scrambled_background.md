# Task: Scientific audit and continuously scrambled demonstration

## Goal

Verify the published method and calculations, retain scrambled texture throughout the demonstration, and show the original stimulus video with its related blog post.

## Scope

Implement the owner's requests of 2026-11-04 as one reviewable correction.

## Required changes

1. Check the scientific claims against de Vries and Baldauf (2019), Sadr and Sinha (2004), Willenbockel et al. (2010), and Ales et al. (2012). Record sources, findings and limits in `docs/scientific-audit.md`.
2. Change demonstration playback and sequence defaults to peak weight 0.85, a project choice that retains residual phase noise. Preserve weight 1 for inspecting the source. Make both halves of a sequence meet at one shared peak phase, including partial peaks and odd frame periods; update the Python reference and only the affected golden sequence output.
3. Add focused checks for background texture, continuity at partial peaks, constant spectra, normalisation and export metadata. Do not relax existing tolerances.
4. Correct public claims about pixel statistics, clipping, local contrast, phase interpolation, recognisability and the distinction between this adaptation and the published compound stimulus. Update relevant user documentation and the specification version.
5. Embed the browser-compatible copy of the original video already hosted with the owner's blog, with native controls, no autoplay, no preload, its Figshare source and the relevant blog link. Do not duplicate original photographs or video in this repository.
6. Regenerate the demonstration figure for the new default and record measured validation results. Bump the app version to 1.1.0.

## Do not implement

- Compound stimulus generation or experiments.
- New frameworks, hosting arrangements or unrelated features.

## Acceptance criteria

- Default playback remains textured around the face at every frame, including maximum visibility.
- Partial peaks have no phase discontinuity between onset and offset.
- The numerical implementation preserves its stated Fourier invariants, and the Python reference agrees within existing golden tolerances.
- The original video is playable on the page and links to its Figshare record and blog post.
- Scientific assumptions and display limitations are described accurately.

## Checks

Run `npm run check`, independent Python checks of the partial-peak path and exported frames, and visual browser QA of both modes, the video and the blog link. Use the managed preview and supported browser controls in this environment.

## Commit and push

If all applicable checks pass, commit to `main` with this exact filename and push. Run the existing deployment workflow and verify the live result if deployment credentials are available; report any access limitation.

## Final report

Use the report required by `AGENTS.md`, including the commit and checks.
