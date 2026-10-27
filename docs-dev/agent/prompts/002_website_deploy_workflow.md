# Task: Deploy workflow for /eek-a-rise/ in the eelkedevries.com repository

## Goal

Add a workflow to `eelkedevries/eelkedevries.com` that builds the public
eek-a-rise repository and rsyncs it to `/eek-a-rise/`, reusing the site's
existing deploy secrets, and protect that folder from the site's own deploy.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- **Why this route:** the site repository already holds the SiteGround secrets,
  and eek-a-rise is public, so it can be checked out without a token. No secret is
  added anywhere. eek-a-look and the Department of Human Verification are deployed
  this way already.
- **Model:** `.github/workflows/deploy-eek-a-look.yml` in eelkedevries.com, as it
  stands on `main`. It has its own concurrency group (`eek-a-look-deploy`), SSH
  preparation, the connectivity gate with retries, document-root resolution by
  canary, the rsync into one folder, a live check for the fingerprinted script
  (made from the origin), and credential removal. Its header explains why it does
  not share `eelkedevries-site-deploy`.
- That repository's `CLAUDE.md` applies while you work in it: commit and push to
  `main`. A push to its `main` renders and deploys the live site, which is
  intended.
- Use a fresh clone of eelkedevries.com, or pull first.

## Required changes

1. In `eelkedevries/eelkedevries.com`, read `CLAUDE.md` and follow it.
2. In `scripts/deploy.sh`, add `--filter='protect /eek-a-rise/***'` directly after
   the `/department-of-human-verification/` protect line, with a one-line comment
   in the style of its neighbours ("eek-a-rise is deployed separately by
   deploy-eek-a-rise.yml, which writes only into this folder.").
3. Add `.github/workflows/deploy-eek-a-rise.yml`, a copy of
   `deploy-eek-a-look.yml` with only these changes:
   - `name: Deploy eek-a-rise`;
   - `repository_dispatch` types `[rise-updated]` (plus `workflow_dispatch`);
   - concurrency group `eek-a-rise-deploy` with `cancel-in-progress: false`;
   - check out `eelkedevries/eek-a-rise` into `eek-a-rise`, with the npm cache
     keyed on `eek-a-rise/package-lock.json`;
   - build step: `npm ci`, `npm run build`,
     `bash scripts/check-public-build.sh dist`, and the summary line;
   - rsync `eek-a-rise/dist/` to `<verified document root>/eek-a-rise/`;
   - live check against `https://eelkedevries.com/eek-a-rise/` for the built
     `assets/index-*.js` name;
   - the header comment adapted, pointing to eek-a-rise's `docs/deployment.md`
     (added in prompt 003).
   Keep the shared steps character for character identical to
   `deploy-eek-a-look.yml`.
4. In the site's `README.md`, *Deployment* section, add eek-a-rise in one sentence
   next to eek-a-look and the Department of Human Verification.
5. Commit there with the message "Deploy eek-a-rise to /eek-a-rise/ on a
   rise-updated dispatch", push `main`, and confirm the site's *Render & Deploy*
   run is green. If it fails at *Test SSH connectivity* with
   `Connection timed out`, re-run it with
   `gh run rerun <id> --failed -R eelkedevries/eelkedevries.com` (up to three
   times) before reporting a failure.
6. Back in eek-a-rise, add `002_website_deploy_workflow.md` to *Prompts run* in
   `docs-dev/planning/current_state.md`, with the site commit hash.

## Do not implement

Do not implement:
- any other change to eelkedevries.com (no Projects card, link or blog post);
- changes to `deploy.yml` or `deploy-eek-a-look.yml`;
- new secrets or tokens anywhere;
- the first eek-a-rise deploy (prompt 003).

## Acceptance criteria

The task is complete when:
- the protect line and `deploy-eek-a-rise.yml` are on eelkedevries.com `main`;
- `deploy-eek-a-rise.yml` differs from `deploy-eek-a-look.yml` only in the
  listed places (show the `diff` in the final report);
- the site's *Render & Deploy* run for that commit is green;
- `https://eelkedevries.com/` still loads normally.

## Checks

`diff .github/workflows/deploy-eek-a-look.yml .github/workflows/deploy-eek-a-rise.yml`;
`gh run list -R eelkedevries/eelkedevries.com --limit 3`;
`curl -sI https://eelkedevries.com/`.

## Commit and push

In eelkedevries.com, commit as stated in step 5. In eek-a-rise, if and only if
the scope was followed and checks pass, create one commit on `main` using this
file's exact filename as the commit message, then push.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
