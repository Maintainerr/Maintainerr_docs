# Agent instructions

This repo is the Docusaurus site for Maintainerr. The code it documents lives in
[Maintainerr/Maintainerr](https://github.com/Maintainerr/Maintainerr).

## Repo layout

| Path                   | What it holds                                                      |
| ---------------------- | ------------------------------------------------------------------ |
| `docs/`                | The Next (unreleased) docs. Edits for an unreleased change go here |
| `versioned_docs/`      | Frozen snapshots of released versions. Do not edit by hand         |
| `static/openapi-spec/` | The bundled OpenAPI YAML                                           |
| `blog/`, `src/`        | Blog posts and site theme                                          |

Run `npm run format` before committing, and `npm run build` to check the site
still builds and no link broke.

## Docs drift PRs

A bot opens a "Docs drift report" issue that compares the last release to
Maintainerr's `HEAD`. These rules are hard rules when you open the PR for one.

- **Work from local clones, never from github.com web views.** Web views can be
  cached or truncated. Clone `Maintainerr/Maintainerr` and
  `Maintainerr/Maintainerr_docs` before anything else.
- **Read complete files, not excerpts.** Coverage you would otherwise miss often
  sits past the first screenful. Read each doc file and each commit diff end to
  end.
- **The upstream commits and diffs are the source of truth.** Use the issue's
  prose summary as guidance, but confirm every claim against the local clone
  with `git show <sha>` before editing.
- **Skip what is already documented.** Read the current `main` of this repo and
  the most recent merged docs PRs first. If something is already covered, do not
  document it again.
- **Minimal edits only.** Make only the doc updates still missing for the Next
  release. No speculative additions and no broad rewrites.
- **Doc-only changes.** Restrict edits to `docs/` and `static/openapi-spec/`. Do
  not touch sidebars, config, or unrelated assets unless a doc edit strictly
  requires it.
- **Keep the PR tied to the code diff**, not to the issue summary alone.
- **Structure the PR description** in two parts:
  1. **What was added**, one short bullet per doc edit, citing the upstream
     commit or PR.
  2. **Already covered by prior PRs**, listing anything in this drift that an
     earlier merged docs PR already documented, so reviewers can confirm it was
     skipped on purpose.

## Writing style

- Plain English, kept short. Describe how things work today, not what changed
  since some version.
- Plain hyphens only. No em dashes or en dashes.
- Always "Seerr", never Overseerr or Jellyseerr.
- No real media titles in examples.
