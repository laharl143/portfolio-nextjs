---
name: audit
allowed-tools: Bash, Read, Grep, Glob, Write, Edit, Agent, AskUserQuestion
description: "Run /audit on a greenfield project, an existing codebase with missing docs, or one area (/audit src/auth) to bootstrap the project's AI context, the AGENTS.md files every later skill reads. Writes tool agnostic AGENTS.md plus thin AGENTS.md pointers, adding only what is missing; never overwrites curated content."
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

The context bootstrapper: writes the `AGENTS.md` files every later skill and AI tool reads.

- Greenfield (no code yet): ask for coding standards, seed root `AGENTS.md` from the answers plus the build approach (name and one line principle) from the scope header if `/scope` set one. Runs after the project is scaffolded with its chosen stack (`/scope` → `/architect` decides the stack → scaffold → `/audit`); earlier is premature.
- Brownfield, undocumented (code, no `AGENTS.md`): scan the whole project, write root `AGENTS.md` and nested `<area>/AGENTS.md` files, judging what is global (root) vs area specific (nested).
- Brownfield, partially documented: check existing root and nested docs against the whole codebase; add only what is missing (new global facts, nested docs for undocumented areas); never clobber curated content.

Does not create specs (/architect owns those), maintain files after changes (/sync owns that), or write the feature scope (/scope owns `docs/scope/`).

## Context file convention (AGENTS.md is canonical)

Durable context lives in the tool agnostic `AGENTS.md` (root and nested); every agent (Codex, Cursor, Codex, and others) reads it. `AGENTS.md` is only a one line pointer whose entire body imports the sibling `AGENTS.md` via Codex's `@` import (exact pointer body in `agent-prompt.md`); content is never duplicated across the two.

- Write knowledge into `AGENTS.md`. Create it when missing. Never overwrite an existing `AGENTS.md` (it may be user or tool authored); gap fill conservatively, with permission.
- Migrate legacy content: a `AGENTS.md` with content but no `AGENTS.md` → ask permission, move its content into a new `AGENTS.md`, replace `AGENTS.md` with the pointer. Never silently discard curated content.
- Root stays short and global; nested `AGENTS.md` only for meaningful areas with real conventions (same root/nested rules as previously applied to `AGENTS.md`).

## Scope

An area path argument (e.g. `auth`, `src/payments`) triggers Phase 3. With no argument, the `Pre-flight` signals below route to Phase 0 (ambiguous: ask new vs existing), Phase 1 (greenfield: ask standards, seed root), Phase 2 (established, no root AGENTS.md: whole-repo scan), or Phase 4 (root AGENTS.md exists: gap-fill). A legacy `AGENTS.md` with content but no `AGENTS.md` is migrated, then treated as Phase 4.

## Acts vs asks

Phase 1 asks coding standards questions via MCQ before creating root AGENTS.md. Phase 2 acts immediately, no questions; it writes root and the nested docs it judges warranted. Phases 3 and 4 act to explore but ask permission before modifying an existing root AGENTS.md or migrating a legacy AGENTS.md; Phase 4 reports nested doc creation for undocumented areas first, then applies on confirmation.

## Artifact ownership

The `AGENTS.md` files hold the content: create root if missing (Phase 1, 2) and `<area>/AGENTS.md` if missing and warranted, by judgment (Phase 2, 3, 4); when one exists, gap-fill or propose additions with permission; never overwrite. The `AGENTS.md` files are pointers only (root and area), created if missing; a legacy one with content is migrated into `AGENTS.md` with permission. When creating a nested `AGENTS.md`, add exactly one pointer line to root `AGENTS.md` under `## Context files`: `- [<area>/AGENTS.md](<area>/AGENTS.md) (<one-line description>)`. Never one per subfolder, only where distinct conventions exist.

## Portability (any OS, any agent)

- Commands: `git` is the only required CLI, same on every OS. Other shell snippets (file counts, `find`, `[ -f ]`) are POSIX reference, not literal scripts; use your agent's cross platform file tools (search/glob, read, write) to list, count, and check existence.
- Bundled files live in this skill's folder: `agent-prompt.md`, the phase mode files (`modes/*.md`), and the pattern presets (`patterns/*.md`). Resolve the folder to an absolute path. Read the matching phase mode file when routing, then `agent-prompt.md` plus the SELECTED pattern preset at write time. Its ALL_CAPS placeholders (PHASE, AREA, ADDITIONAL_STANDARDS, MONOREPO_OR_NO, INSTALLED_SKILLS, DECLINED_TOOLS, and so on) are the inputs you gathered in pre-flight and the question rounds; apply each as you read.
- No interactive question support? Ask any multiple choice question as plain text with the same options.

## Execution

The main thread does the writing in every phase; it never hands `AGENTS.md` writing to a subagent. The only subagent is a read only `scout` (cheapest model, Codex: `haiku`, never the session model), spawned only for a large scan; it returns a compact map the main thread writes from. A small scaffold or single area needs no scout; read it directly. Right before writing, read `agent-prompt.md` (persona, per phase instructions, templates) plus, in Phase 1, the selected pattern preset; then write following it. Read `agent-prompt.md` only at write time, not during `pre-flight`.

### `Pre-flight` (main thread does this before anything else)

Gather several signals (a file count alone misleads: a scaffold inflates it, an unfamiliar language zeroes it):

1. Context files: root AGENTS.md present → `ROOT_EXISTS`; a AGENTS.md with content only → `ROOT_LEGACY`; neither → `ROOT_MISSING`.
2. Source count across common ecosystems (extensions like `.ts/.tsx/.js/.jsx/.py/.go/.rs/.java/.rb/.swift/.kt/.php/.cs/.dart/.ex/.exs/.scala/.c/.cpp/.h/.lua/.clj`), excluding vendored/generated dirs (`node_modules`, `.git`, `dist`, `build`) and config files (`*.config.*`).
3. Established signals: `git log --oneline` for commit history depth; a real manifest (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `composer.json`, `*.csproj`, `pubspec.yaml`, `mix.exs`, `Gemfile`).
4. Monorepo signal: workspace markers (`pnpm-workspace.yaml`, `turbo.json`, a `"workspaces"` field in `package.json`) or any `apps/*/package.json` / `packages/*/package.json` near the root.
5. **Workflow setup signal (`WORKFLOW_SETUP`)**: root AGENTS.md is MISSING while the workflow has already decided the stack, i.e. a `docs/specs/` architecture spec exists (a `## Proposed stack` section), and/or `docs/scope/` has a "Stack and architecture" (or similar foundational scaffold) feature. This is the intended greenfield order (`/scope` → `/architect` decides the stack → `/develop` scaffolds it → `/audit`): freshly scaffolded, still needs coding standards captured. When it fires, the manifest and scaffold source that now exist are the scaffold, not a existing codebase.

Pick the phase. The order of checks matters: the workflow setup signal outranks the raw code count, because a fresh scaffold has a manifest and source files yet is still greenfield.

| Condition | Phase |
|---|---|
| Area path given as argument | Phase 3 |
| `ROOT_EXISTS` (or `ROOT_LEGACY` after migration) | Phase 4 |
| `ROOT_MISSING` and `WORKFLOW_SETUP` (stack spec and/or scope stack feature) | **Phase 1**, even though a manifest and scaffold source now exist. Ask the coding standards; seed root from the spec's stack. Never treat a just scaffolded workflow project as brownfield. |
| `ROOT_MISSING`, no `WORKFLOW_SETUP`, no source files AND no manifest | Phase 1 |
| `ROOT_MISSING`, no `WORKFLOW_SETUP`, has code (source ≥ 10 or a manifest), ≥ 2 commits and clearly real feature code (not just scaffold) | Phase 2, any language |
| `ROOT_MISSING`, no `WORKFLOW_SETUP`, has code but it looks like untouched scaffold, or ≤ 1 commit, or you can't tell greenfield from brownfield | Phase 0, ask |

Why this order: a fresh scaffold has a manifest and starter files but is still greenfield, so a raw code count alone would misread it as brownfield and skip the standards questions; the workflow setup signal catches that and routes to greenfield. Truly brownfield (Phase 2) means real feature code, real history, and no workflow setup in progress. Anything ambiguous falls to Phase 0; never default a maybe greenfield project to brownfield.

Monorepo (`MONOREPO=yes`): root plus a light stub per workspace, deepen on demand. Each workspace (`apps/*`, `packages/*`) is a first class area; its primary doc lives at the workspace root (`packages/api/AGENTS.md`), never buried deeper. A whole-repo run does not deep scan every workspace; write the repo root `AGENTS.md` (monorepo wide tooling, shared conventions) plus a light stub per workspace from its manifest, no code scan, with root pointers. The full conventions/gotchas/key files scan happens when the engineer runs `/audit packages/api` (Phase 3) or first builds there. A spot inside a workspace that warrants its own doc (`packages/ui/src/mdx/`) gets one in addition to the workspace root doc, linked from it. A doc already buried in a workspace with no workspace root doc: ask: "`packages/ui` has a context file at `src/mdx/` but none at its root. Move it up to `packages/ui/AGENTS.md`, or keep it as a nested doc under a new `packages/ui/AGENTS.md`?" On move: relocate it to the workspace root. On keep nested: create the workspace root `AGENTS.md` AND keep the deep one, linked from root. Migrate legacy `AGENTS.md` content per the convention above. Apply `MONOREPO=yes` plus the workspace list as you write.

Legacy migration (any phase): on `ROOT_LEGACY`, before proceeding ask permission: "I found a `AGENTS.md` with project context but no `AGENTS.md`. I'll move its content into a new `AGENTS.md` (so all tools read it) and replace `AGENTS.md` with a pointer. Proceed?" On yes: copy the content verbatim into `AGENTS.md`, then replace `AGENTS.md` with the pointer; `AGENTS.md` now exists, so continue as Phase 4 (gap-fill). On no: leave both untouched and continue without migrating. Same for any nested `<area>/AGENTS.md`.

### Route to the selected phase

Phase 0 (ambiguous) is handled inline below. For Phases 1 to 4, read only the matching mode file, then follow it:

- Phase 1 (greenfield setup) → `modes/greenfield.md`
- Phase 2 (whole-repo scan) → `modes/whole-repo.md`
- Phase 3 (area scan) → `modes/area.md`
- Phase 4 (gap-fill) → `modes/gapfill.md`

Do not read the other mode files. The greenfield and whole-repo modes additionally read `modes/tool-skills.md` for the Agent Skills / MCP sweep (skip it for area and gap-fill runs).

### Phase 0: Classify (only when `pre-flight` is ambiguous)

Don't guess. Ask once via your agent's interactive option picker (`AskUserQuestion` on Codex), or plain text with the same options. Mark one option `(recommended)` by whichever signal is stronger (a scaffold like tree with a manifest but little history leans New; real feature code and deep history leans Existing), and the picker adds a free text custom slot last:
- question: "I can't tell if this is a new project or an existing codebase (<state why: e.g. 'a manifest exists but I see no source in a language I recognise', or 'files look like untouched scaffolding'>). Which is it?"
- header: "Project state"
- options: 1. `New project`, "I'll ask for your coding standards and seed the context." → Phase 1 (read the manifest/scaffold for the stack; still ask standards). 2. `Existing codebase`, "I'll scan what's here and document it." → Phase 2.

### After all phases

If no `AGENTS.md` was written when it should have been (the file is missing/empty), report the failure and do it again; don't relay success it didn't produce. Otherwise relay the report: what was discovered (2 to 4 bullets), what was written (file paths), what was proposed or skipped (if existing files were found).

## Pattern presets

See `patterns/` for the four coding style presets used in Phase 1 (greenfield mode).

## Writing guide

See `agent-prompt.md` (the main thread reads it at write time; its per phase instructions and `AGENTS.md` templates).
