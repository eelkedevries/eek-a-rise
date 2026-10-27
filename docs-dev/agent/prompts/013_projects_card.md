# Task: Projects card on eelkedevries.com

## Goal

List eek-a-rise on <https://eelkedevries.com/projects/> with one card in the
existing format.

## Scope

Implement only the work described in this prompt. Do not implement adjacent
systems or future prompts.

## Context

- **Run only after the owner has confirmed that eek-a-rise should be listed.**
  eek-a-look, for example, is deliberately not listed. If there is no
  confirmation in the conversation, stop and ask.
- Work in `eelkedevries/eelkedevries.com`. Its `CLAUDE.md` applies: commit and
  push to `main`, which deploys the site.
- `projects.md` uses `.entry-card .project-item` blocks with a raw-HTML tag row
  (category, format, status), a heading, one or two paragraphs and
  `.project-links`. Existing categories for `data-filter-item` include
  `research`, `academic` and `miscellaneous`.

## Required changes

1. Add a card to `projects.md` with:
   - `data-filter-item="research"` and the tags *Research*, *Web app* and
     *Live · version 1*;
   - the heading `eek-a-rise`;
   - this text (owner may edit before running):

     > Faces that emerge from noise and dissolve back into it, while the image's
     > overall brightness and contrast stay the same. The page implements the
     > frequency-tagged compound faces of my MEG study with Daniel Baldauf (2019):
     > try it on one image, or build the full stimulus with eyes, mouth and
     > identity each changing at their own rate, and download it as lossless
     > frames or video.
     >
     > Everything runs in your browser; your images are never uploaded.

   - links: *Open application ↗* (`https://eelkedevries.com/eek-a-rise/`) and
     *Source on GitHub ↗* (`https://github.com/eelkedevries/eek-a-rise`).
2. Place it next to the other research cards, following the file's order.
3. Commit with the message "Projects: add eek-a-rise", push `main`, and confirm
   the *Render & Deploy* run is green (re-run time-outs as in prompt 002).
4. In eek-a-rise, add this prompt to *Prompts run* with the site commit hash.

## Do not implement

Do not implement:
- any other change to eelkedevries.com;
- a blog post or a home-page mention.

## Acceptance criteria

The task is complete when:
- the card appears on the live projects page with working links and the
  *Research* filter shows it;
- the site's deploy run is green.

## Checks

`gh run list -R eelkedevries/eelkedevries.com --limit 3`; open
<https://eelkedevries.com/projects/> and use the *Research* filter.

## Commit and push

In eelkedevries.com, commit as stated in step 3. In eek-a-rise, if and only if
the scope was followed and checks pass, create one commit on `main` using this
file's exact filename as the commit message, then push.

Do not commit or push partially completed work unless explicitly instructed.

## Final report

End with the required final report specified in `AGENTS.md`.
