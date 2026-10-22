---
name: document
allowed-tools: Bash, Read, Grep, Glob, Write, Edit, Agent, AskUserQuestion
description: "Run /document `pr` | `changelog` | `release-note` | `postmortem` (or let it ask) to write the human facing prose about a change. Drafts from the real commits and diff, writing to the right place. Does not write code, tests, or specs."
---
<!-- CODEX-COMPATIBILITY:START -->
## Codex compatibility

In Codex, these mappings override Claude-specific instructions in this skill and its supporting files:
- Read SKILL.md and supporting files directly. To invoke another skill, read its installed SKILL.md; there is no Claude Skill tool.
- For questions in Codex, use the exposed request_user_input_async tool, or request_user_input only in Plan mode. For stage handoffs follow the Next step panel below: recommend the next ready action and present native clickable choices. An actual selection authorizes that named step; the immediate return or a preselected option does not. There is no AskUserQuestion or Skill tool in Codex.
- For an explicitly requested new chat, use create_thread if available. Never call mcp__ccd_session__start_session or assume /clear works. Otherwise continue in the current chat.
- For explicitly prescribed subagent work, use collaboration tools. Scout and researcher describe tasks, not required agent types. Follow current model-inheritance rules. Never pass haiku, sonnet, opus, or fable as Codex model IDs. When overrides are supported and permitted, choose an available Luna for lightweight work or Sol/Astra for difficult work.
- Cross-model review: confirm the actual author model with the user or reliable task metadata; Claude settings and ANTHROPIC_MODEL do not identify the Codex author. Use a different available strong model only if overrides are permitted. Otherwise use an available code-review tool or fresh-context reviewer and disclose that model independence is unverified. Never claim a different-model review without evidence.
- Resolve personal skills under ~/.agents/skills and project skills under .agents/skills. Claude settings.local.json, skillOverrides, and plugin enable flags do not configure Codex; use supported Codex configuration and plugin tools.
- Named dependent skills and plugins must actually be available. Report missing dependencies rather than inventing tools or claiming they ran.
<!-- CODEX-COMPATIBILITY:END -->

## Output style (plain words, no dashes, no hyphens)

<!-- OUTPUT-STYLE:START -->
Write everything this skill produces, files and messages alike, in plain simple language. Talk to the reader as `you`, warm and direct like a colleague, and present every step as a recommendation they may run or skip, never an order. Keep technical terms that carry real meaning; explain each in plain words. Never use a dash or a hyphen as punctuation: no em dash, no en dash, and no hyphenated compounds. Write `read only`, not `read-only`. Say it in simple words, or reword the sentence. Code, file paths, command flags, and values other skills match on keep their hyphens. Use short sentences, commas, or parentheses. Clear beats clever.
<!-- OUTPUT-STYLE:END -->

## Next step panel (clickable, no typing)

<!-- NEXT-STEP:START (identical in every workflow skill: architect, audit, check, debug, develop, document, log, scope, sync, test; edit all or none) -->
At the end of each completed, failed, or blocked stage, give a concrete recommendation and clickable choices. The user should be able to choose the next skill with a mouse, without typing a command or asking what comes next. This section overrides older handoff formatting elsewhere in this skill for Codex.

1. Finish the authorized work and report its real result first. Read this feature's current scope, spec status, workflow tier, unchecked boxes, and any failure or prerequisite. Recommend the first useful action that is actually ready, with one short reason. A failed check routes to its fix, not to the next success stage. Do not repeat a completed stage or require the user to work out the sequence.
2. Offer 2 to 4 choices, including `Stop here`. Put the best next action first and mark it `(Recommended)`. Give each action a plain name, the feature, and a short explanation, for example `Develop lead intake (Recommended): Build the approved spec in this chat.` Add only alternatives that this result supports. The interface already provides free text, so do not add an `Other` option.
3. In Codex, prefer `functions.request_user_input_async` when exposed. This is a preference question about the next action. Use one question with `title` such as `What would you like to do next for lead intake?` and `options` as an array of those choice strings. Make it the last tool call after all work and reporting. It returns immediately, so follow it only with a brief, self contained final summary and the recommendation. Do not cancel or replace the pending question by starting another stage.
4. Wait for the user's actual reply. Preselection, the tool's immediate return, elapsed time, and Skip are not authorization to run the recommended choice. Stop or Skip means no further action. If the reply arrives later, use the pending question and feature context to interpret it without asking for the command again.
5. A clicked action authorizes that named next step. Read the selected skill's installed `SKILL.md` and run it with the feature, spec, and relevant failure carried forward. Do not ask the user to type the command, repeat the selection, or confirm the same step. The chosen skill's real prerequisites and existing external action permissions still apply.

Choose recommendations from evidence, not a fixed sequence:

| Result | Usual recommendation, if the project's recorded workflow supports it |
| --- | --- |
| Audit finished | Scope the next work if no scope exists, otherwise the matching feature's next ready step. |
| Scope finished with a decision owed | Architect that named feature. If already designed, offer its next unchecked execution step. |
| Architect finished with an approved buildable spec | Develop the same feature. If a decision is still open, recommend resolving or ratifying it first. |
| Develop finished | Check verify for the same feature when its Verify box exists. Otherwise follow its tier and next unchecked box. |
| Check verify passed | Test at Beta or GA when its Test box remains, otherwise the next recorded closing step. |
| Check verify failed | Debug the observed failure. For a confirmed unbuilt surface, Develop that surface instead. |
| Check blocked | Explain the exact missing prerequisite and offer the action that resolves it, or a recheck after the user completes the outside setup. Never offer to bypass the block silently. |
| Debug fixed the reported issue | Repeat the check that failed, then the remaining regression test stage if recorded. |
| Test passed | The next required review or documentation stage, or offer marking done if this feature's closing checks are complete. |
| Review found issues | Fix the concrete finding with Debug or Develop before another review. A clean review follows the recorded documentation or integration step. |
| Document, Sync, or Log finished | Recommend the next remaining recorded step, or the next scoped feature when this one is closed. If nothing remains, say so and offer Stop. |

Do not offer `Mark done` while a known failure or blocker remains. If the build is complete and the user may explicitly skip optional remaining stages, name exactly which checks that choice skips and never make it the recommendation over fixing a failure. Only a real user selection may invoke the existing done flow: surgical scope/spec updates, tracker mirroring, and the project's authorized commit and push rules. An Assumed spec stays Assumed and flagged for ratification.

Use the current chat by default. Offer `New chat: ...` only when a fresh context would materially help and a supported `create_thread` tool exists. Label it explicitly; selecting it authorizes a new chat, so use the available project/thread tools and include the exact task, feature, spec, and unresolved state. Never call `mcp__ccd_session__start_session`, never assume `/clear` can be run by a tool, and do not make a new chat mandatory for an ordinary next step.

If the asynchronous picker is unavailable, use `functions.request_user_input` only in Plan mode when exposed. On another runtime use its available native choice tool. In Codex Desktop, when no permitted picker exists but followup controls are supported, put clickable action items in the final answer using the app's exact unescaped syntax, with the full skill command and feature in each action prompt. For Stop, use an explicit instruction to stop rather than inventing a skill command:

`- :codex-followup[Develop lead intake (Recommended)]{prompt="/develop lead intake form"}`

Do not substitute a plain typed command list when a permitted clickable control exists. If no clickable interface is available, state that limitation and give the concrete recommendation with short numbered choices. Do not fabricate a tool, a radio panel, or an action that the client cannot render.

Show one next step menu per finished stage, after any required artifact or design decisions. Do not show it in the middle of work, duplicate it with another picker, or use a generic `What next?` without an evidence based recommendation.
<!-- NEXT-STEP:END -->

## What this skill does

**Your role:** the technical writer who writes from the record, not from imagination, and for the reader, not the author. Every sentence traces to something that actually happened (a commit, a diff, an incident fact you were given), and every document is pitched at whoever has to act on it (audience column below). You never invent a timeline entry, a cause, or a change that isn't in the source.

Generates one of four document types from the real change history. The main thread writes the document itself; the only thing it may offload is reading, and only for a very large diff, to a read only `scout` subagent on the cheapest model (Codex: `haiku`):

| Type | Source | Audience | Output |
|---|---|---|---|
| `pr` | branch commits + diff vs base | reviewers | PR title + body (chat; optionally `gh pr` create/edit) |
| `changelog` | merged change | developers | entry appended to `CHANGELOG.md` (Keep a Changelog) |
| `release-note` | a tag/version range | end users | `docs/releases/<version>.md` (or chat) |
| `postmortem` | an incident (described by the engineer, plus any /debug record) | team | `docs/postmortems/<date>-<slug>.md` |

Acts. Asks at most one question (which type) when it can't be inferred, and (for postmortems) asks for the incident facts it can't read from git.

## Artifact ownership

PR text, `CHANGELOG.md`, `docs/releases/`, `docs/postmortems/` (owned by this skill). It writes nothing else.

---

## Portability (any OS, any agent)

Written for any Agent Skills client on macOS, Linux, or Windows:
- **Commands**: `git` (and optionally `gh`) are the only CLIs, and behave the same on every OS, run the `git` lines as shown. Other shell snippets are POSIX **reference**, not literal scripts: don't assume `find`, `grep`, `sed`, `cat`, `test`/`[ ]`, `command -v`, or `node -e` exist. Use your agent's own cross platform file tools (read, search/glob, write) for those, and apply branching logic yourself rather than via shell `if`/variables/redirects.
- **Bundled files**: referenced by paths relative to this skill's folder. The main thread resolves this skill's folder to an **absolute path** (it already resolves these relative paths, so it knows the folder) and reads them itself at write time (Step 3): `agent-prompt.md` and the one template for the chosen type.
- **No interactive question support?** The doc type pick uses an interactive picker where the agent has one; without it, ask the doc type question as plain text with the same options.

## Execution

### 1. Determine the document type

- If passed as an argument (`pr`, `changelog`, `release-note`, `postmortem`): use it.
- Otherwise infer from context where obvious (on a feature branch ahead of base → `pr`; just tagged a version → `release-note`), then **confirm or ask** with one question. Mark the inferred type `(recommended)`; the picker adds a free text custom slot last automatically. Present these as your agent's interactive option picker (`AskUserQuestion` on Codex), or as plain text options with the same choices (custom option last) if it has none:

```
"What should I write?"
  header: "Doc type"
  options:
    - label: "PR description"        → pr           # mark (recommended) if inferred
    - label: "Changelog entry"      → changelog
    - label: "Release notes"        → release-note
    - label: "Postmortem"           → postmortem
```

### 2. Gather the source material

Collect the lightweight history below, then read the diff and files yourself at write time (a `scout` subagent may do the reading for a very large diff).

Run these `git`/`gh` commands as shown; do the steps that are not commands with your agent's own file tools and your own branching logic.

```bash
# base branch: use `main` if it exists, otherwise `master`
git rev-parse --verify main
# current branch
git rev-parse --abbrev-ref HEAD

# pr / changelog: the branch change set (BASE = the base branch above)
git log --oneline "BASE..HEAD"
git diff --name-only "BASE...HEAD"

# release-note: needs tags. List them; if there are none, fall back gracefully (treat as NO_TAGS).
git tag --sort=-creatordate
```

- **context for the "why"**: list the spec files under `docs/specs/` (names starting with a digit) and take the 3 most recently modified (paths only) using your file/glob tools.
- **pr only: three checks** (record each result for step 2's edge handling):
  - Is `gh` available on this system? (GH_INSTALLED)
  - Does the repo have a git remote? Run `git remote`; a result that is not empty means HAS_REMOTE.
  - Does a PR already exist? Run `gh pr view --json number -q .number`. If it prints a PR number, treat that as PR_EXISTS; if it errors/prints nothing, no PR exists.

**Per type edge handling the main thread resolves before writing:**
- **`release-note` range**: if tags exist, the range is `<previous-tag>..<latest-tag>` (or a range the engineer named). **If `NO_TAGS`**, don't guess, ask: "No version tags found. Give me a version name and range (e.g. `v1.0.0`, covering `<commit>..HEAD`), or I'll cover all commits since the first one." Pass the resolved range/version to the subagent.
- **pr + gh**: only offer to create/update the PR via `gh` when **`GH_INSTALLED` and `HAS_REMOTE`**. If `PR_EXISTS`, the action is `gh pr edit` (update the body), **not** `gh pr create`. If gh isn't usable or no remote, the PR text is chat only, don't attempt `gh`. **Always confirm before running `gh` and before any push** (opening/updating a PR is an outward action): show the body, then ask. This holds regardless of the `AGENTS.md` `## Git` setting; the setting decides whether the workflow drives PRs at all (`integration: off` → produce the text, never push or open a PR unless the engineer asks here).
- **postmortem**: git won't contain the incident narrative. Ask the engineer for the essentials if not already provided: what broke, when (with timezone), user impact, how it was detected, and the root cause/fix (point them to any `/debug` output if it exists). Pass their account as the incident facts. The subagent must not invent timeline entries or causes beyond what they give.

### 3. Write the document (main thread)

Resolve this skill's folder to an absolute path (you already resolve these relative paths, so you know the folder) and Read `agent-prompt.md` and the **one** template for the chosen type, `templates/<type>.md`, now (only now, at write time). Follow `agent-prompt.md` and write the document yourself. Do not spawn a writer; for a postmortem, the root cause synthesis is yours to reason through carefully on the main thread.

The inputs to apply:
  1. Document type + its template (the chosen one only; read it)
  2. Source: commit list, diff command, and (postmortem) the incident facts. Read the diff yourself; for a very large diff (e.g. >25 files), offload the reading to a `scout` subagent (haiku) that returns a compact summary by file group/feature, and write from that
  3. Project context contents (project name, conventions), read `AGENTS.md`, or `AGENTS.md` fallback, + recent spec paths for the "why"
  4. Output target for the type and today's date
  5. **pr**: the gh action, `none (chat-only)` | `gh pr create` | `gh pr edit` (from the `GH_INSTALLED`/`HAS_REMOTE`/`PR_EXISTS` checks)
  6. **changelog**: **match the existing `CHANGELOG.md` format** if the file exists (don't impose Keep a Changelog over a different established style)
  7. **`release-note`**: the resolved version + range

### 4. Relay the result

Lead with the type and where it landed; for `pr` the body IS the deliverable, so show it in full (per `docs/conventions.md`). Template:

```
## /document <pr | changelog | release-note | postmortem> Â· <PR body below | CHANGELOG.md | docs/releases/<v>.md | docs/postmortems/<file> | PR #N updated>

<for pr: the title + full body, ready to paste Â· always shown in chat so it works without gh>
<for the others: a 2 to 3 line preview>
Scope: ticked `Document it`   (or "no scope row matched"; omit if not on the scope)
```

This skill does not commit, push, or merge; it produces the prose (and ticks the `Document it` box per the closing gate above, the only scope edit it makes).

---

## Reference files

- `agent-prompt.md`: the writing guide the main thread reads and follows at write time (Step 3)
- `templates/`: one structure file per type (`pr.md`, `changelog.md`, `release-note.md`, `postmortem.md`); the main thread reads only the chosen one at write time
