# Task: One-command deploy and first deploy

## Goal

Add `npm run deploy`, which starts the eelkedevries.com `deploy-eek-a-rise`
workflow, waits for it, re-runs it on a connection time-out and checks the live
page; use it to deploy the placeholder page.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- Prompt 002 added `deploy-eek-a-rise.yml` to `eelkedevries/eelkedevries.com`. It
  runs on a `rise-updated` repository dispatch or on `workflow_dispatch`.
- The deploy is started from the machine that runs the prompt, with the local `gh`
  login (scope `repo`). No secret is stored in this repository.
- Model: `scripts/deploy.sh` and `docs/deployment.md` in `eelkedevries/eek-a-look`
  (public). They do exactly this for `/eek-a-look/`.

## Required changes

1. Add `scripts/deploy.sh`, a copy of eek-a-look's with only the names changed
   (`WORKFLOW="deploy-eek-a-rise.yml"`,
   `LIVE_URL="https://eelkedevries.com/eek-a-rise/"`, messages). It:
   - refuses to run unless `git status` is clean and `main` equals `origin/main`;
   - runs `gh workflow run deploy-eek-a-rise.yml -R eelkedevries/eelkedevries.com`;
   - finds that run, then `gh run watch --exit-status`;
   - if the run failed at *Test SSH connectivity*, runs
     `gh run rerun <id> --failed`, up to three times;
   - finally checks that `https://eelkedevries.com/eek-a-rise/` returns HTTP 200.
2. Add `"deploy": "bash scripts/deploy.sh"` to `package.json`.
3. Add `docs/deployment.md` (short, modelled on eek-a-look's), covering:
   - deploying with `npm run deploy`, or with *Run workflow* at
     <https://github.com/eelkedevries/eelkedevries.com/actions/workflows/deploy-eek-a-rise.yml>;
   - that a push alone does not deploy;
   - the time-out re-runs, with a pointer to the eelkedevries.com README,
     *Deploy reliability*.
4. Add `003_deploy_command.md` to *Prompts run* in
   `docs-dev/planning/current_state.md`.
5. Commit and push, then run `npm run deploy` so the live site matches this commit.

## Do not implement

Do not implement:
- secrets, tokens or a deploy workflow in this repository;
- GitHub Pages or a staging target;
- application features.

## Acceptance criteria

The task is complete when:
- `npm run deploy` finishes green;
- `https://eelkedevries.com/eek-a-rise/` returns the placeholder page with HTTP
  200, and its script and stylesheet load from `/eek-a-rise/assets/`;
- the repository contains no secret.

## Checks

`npm run check`; `npm run deploy`; open the live page and confirm there are no
console errors.

## Commit and push

If and only if the scope was followed and checks pass, create one commit on
`main` using this file's exact filename as the commit message, then push. Then
run `npm run deploy`.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
