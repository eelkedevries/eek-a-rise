# Task: Initial project scaffold

## Goal

Complete the `eek-a-template` scaffold over the committed handoff seed and add a
minimal Vite + TypeScript page served under `/eek-a-rise/`.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- The handoff seed is already committed: `AGENTS.md`, `CLAUDE.md`, `README.md`,
  `docs-dev/**` (from `eek-a-template` v0.3.0, then filled in) and
  `tools/reference/**`. The rest of the template (scripts, CI, `.gitignore`,
  `.pre-commit-config.yaml`, `.copier-answers.yml`, `docs/`, `LICENSE`) is not
  there yet. A dry run of the copier command below on the seed added only new
  files.
- Read `docs-dev/plan.md` and the *Architecture* section of
  `docs-dev/reference/primary_authoritative/specification.md`.
- The repository `eelkedevries/eek-a-rise` was created public by the owner.
- eek-a-look (`eelkedevries/eek-a-look`, public) went through the same steps in
  its prompt 001 and is the model for anything unclear.

## Required changes

1. Confirm the repository is public:
   `gh repo view eelkedevries/eek-a-rise --json visibility` must report `PUBLIC`.
   If it does not, stop and report it: the site deploy checks out the repository
   without a token.
2. Complete the template over the existing tree, keeping the committed files:

   ```bash
   copier copy --trust --defaults --vcs-ref v0.3.0 \
     --skip AGENTS.md --skip CLAUDE.md --skip README.md --skip 'docs-dev/**' \
     --data project_name=eek-a-rise --data project_title=eek-a-rise \
     --data description="Images that emerge from noise: an in-browser implementation of the RISE stimuli of de Vries & Baldauf (2019), for whole images." \
     --data stack_kind=node --data "stack=node-vite + typescript" \
     --data visibility=public --data static_site=true \
     --data license=MIT --data author="Eelke de Vries" --data year=2026 \
     --data "workflow_policy=commit and push directly to \`main\`; no feature branches or pull requests unless explicitly requested." \
     gh:eelkedevries/eek-a-template .
   ```

   Then confirm with `git status` that no committed file changed (only new files
   appear).
3. Delete `.github/workflows/deploy-pages.yml`. This project does not use GitHub
   Pages.
4. Create a Vite `vanilla-ts` scaffold:
   - generate it in a scratch directory with
     `npm create vite@latest <scratch> -- --template vanilla-ts`;
   - move `index.html`, `src/`, `public/`, `tsconfig.json` and `package.json`
     into the repository root;
   - remove the demo content (counter, logos, demo CSS), leaving a page that shows
     only the heading "eek-a-rise" and the line "Coming soon".
5. Add `vite.config.ts` with `base: '/eek-a-rise/'`, `build.sourcemap: false` and
   `worker: { format: 'es' }`.
6. In `package.json`, set `"name": "eek-a-rise"`, `"private": true` and these
   scripts:
   - `dev`, `build` and `preview` (Vite defaults);
   - `check`: `tsc --noEmit && vite build && bash scripts/check-public-build.sh dist && bash scripts/validate-prompts.sh`.
7. Run `npm install` and commit `package-lock.json`.
8. Add a short "Running locally" block to `README.md` (`npm ci`, `npm run dev`,
   `npm run check`) under *Development*. Change nothing else in the README.
9. Add to `.gitignore`: `.claude/worktrees/`, `tools/reference/out/`,
   `tools/reference/.venv/` and `__pycache__/`.
10. Add `001_setup.md` to *Prompts run* in `docs-dev/planning/current_state.md`.

## Do not implement

Do not implement:
- styling, fonts, layout or any application feature;
- the SiteGround deploy workflow (prompt 002) or `npm run deploy` (prompt 003);
- tests, a UI framework or state management;
- any change to `tools/reference/`.

## Acceptance criteria

The task is complete when:
- `gh repo view eelkedevries/eek-a-rise --json visibility` reports `PUBLIC`;
- `npm ci && npm run check` passes locally;
- `npm run dev` serves the placeholder page at `http://localhost:5173/eek-a-rise/`;
- `.copier-answers.yml` exists with `_commit: v0.3.0`, `LICENSE` is the MIT
  licence, and `deploy-pages.yml` is absent;
- `dist/` contains nothing from `docs-dev/` or `tools/`;
- after pushing, the *Check build* workflow on GitHub is green.

## Checks

Run `npm ci`, `npm run check`, then confirm the *Check build* run with
`gh run watch`. If the Gitleaks step flags the binary golden data in
`tools/reference/golden/`, add a path allowlist for that folder only
(`.gitleaks.toml`) and say so in the final report.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
