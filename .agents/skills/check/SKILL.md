---
name: check
allowed-tools: Bash, Read, Grep, Glob, Write, Agent
argument-hint: [verify | review]
description: "Confirm a change before merge. `/check verify` drives the real app to prove behavior against the spec (every acceptance criterion met, every surface built). `/check review` runs a senior code review on a fresh model, one that did not write the code. Verify after /develop, review before a PR. Writes to docs/reviews/, never edits code."
---

<!-- CODEX-COMPATIBILITY:START -->
## Codex compatibility

In Codex, these mappings override Claude-specific instructions in this skill and its supporting files. Everything else in the skill applies as written.
- Read SKILL.md and supporting files directly. Wherever the skill says to invoke a skill with the `Skill` tool, read that skill's installed SKILL.md and run it with the same arguments; there is no Skill tool in Codex.
- Wherever the skill says `AskUserQuestion` (or "your agent's interactive option picker"), use the exposed request_user_input_async tool, or request_user_input only in Plan mode, with the same question and options. Its immediate return, a preselected option, silence, or Skip is not the engineer's answer: end the turn with a short summary and act only on an actual selection. With no picker, put clickable `:codex-followup` controls in the final answer, one per option with the full command, e.g. `- :codex-followup[Develop lead intake (recommended)]{prompt="/develop lead intake form"}`; with neither, a short numbered list.
- Next step panel: build the same options. `Fresh session: …` → use create_thread if available, passing the exact command and the feature/spec background; otherwise say that /clear can only be typed by the engineer and give the command to run after it. Never call mcp__ccd_session__start_session or assume /clear works. `Continue here: …` → read and run that skill's SKILL.md now.
- "Claude Code", `CLAUDE.md` and `.claude/skills/` in this skill keep their meaning: they name Claude Code's files, which Codex leaves in place (`AGENTS.md` stays the canonical context file; never turn a `CLAUDE.md` pointer rule into an `AGENTS.md` rule).
- For explicitly prescribed subagent work, use collaboration tools. Scout and researcher describe tasks, not required agent types. Follow current model-inheritance rules. Never pass haiku, sonnet, opus, or fable as Codex model IDs; read "Claude Code `haiku`" as "the cheapest available model" and "Claude Code `sonnet`" as "a strong model". When overrides are supported and permitted, choose an available Luna for lightweight work or Sol/Astra for difficult work.
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
Whenever this skill ends a run by suggesting what to do next (any `Next:`, `What is next`, `Suggested next`, "advise `/clear`", or a recommended command in the report or summary), keep that line in the text, then make the **very last action of the turn** a clickable panel so the engineer can continue with the mouse alone. Never end on a typed command as the only way forward.

- **Tool**: `AskUserQuestion` on Claude Code (on another agent, its own options picker; with no picker, the same options as a short numbered list).
- **question**: "What do you want to do next?" · **header**: "Next step" · single select.
- **options** (built from this run's real suggestions, never generic; 2 to 4 options, the picker adds Other):
  1. The recommended next step, marked `(recommended)`. When the skill advises a fresh session first (`/clear` before the next unit), word it as a fresh session: `Fresh session: /<skill> <args>`.
  2. The same step in this session: `Continue here: /<skill> <args>` (one line on the tradeoff: quicker, but this long conversation keeps costing tokens).
  3. Up to one real alternative the run surfaced (e.g. `/architect <feature>: <the owed fix>`), only when it exists.
  4. `Mark <feature> done`, whenever the run concerns a scope feature whose build has landed and that is not `done` yet (one line naming any unticked boxes it skips, e.g. "skips Verify and Test"). Otherwise (no such feature, or nothing built yet) `Stop here`: end the turn, nothing runs. The picker's own Skip button always stops too.
- **Acting on the pick** (the click is the engineer's decision, so it overrides any "this skill does not run other skills, it points" line for this one step):
  - `Fresh session: …` → on Claude Desktop, start a new session with `mcp__ccd_session__start_session` (`initiation: "user_asked"`, `context: "fresh"`, `prompt` = the exact command such as `/develop studio login`, `background` = one or two lines naming the feature, the spec path, and that the state lives in the scope and spec files), then end the turn with its link. With no such tool, say plainly that `/clear` can only be typed by you, and that the command to run after it is the one shown.
  - `Continue here: …` → invoke that skill now with the `Skill` tool and its arguments.
  - An alternative → do it if it is this skill's own job, else invoke the named skill with the `Skill` tool.
  - `Mark <feature> done` → run the project's done flow, whichever skill this is: set the feature `done` in the scope (At a glance table and heading), record each skipped box as skipped with today's date, move the governing spec's `**Status**:` line `In Progress` → `Accepted` (an `Assumed` spec stays `Assumed`, flagged as owing ratification), mirror it to the tracker the project's `AGENTS.md` names (e.g. Jira), and follow the project's done rule (e.g. commit that feature's files and push). Then report what changed.
  - `Stop here` → end the turn.
- **Order**: show this panel after every other panel the run owns (confirm, save `verify.md`, and so on), never before them, and only once per run. When the run is blocked on something only the engineer can do outside the chat (a Vercel setting, a device step), say what to do first, and still show the panel with the step that follows once it is done, plus option 4 as above.
<!-- NEXT-STEP:END -->

## What this skill does

`/check` is the gate before merge. Two modes, separate jobs, usually both, verify first:

- **`verify`** (runtime proof): run the real app and watch the change behave. Proves it works and conforms to the spec (every acceptance criterion met, every specced surface built), which green tests never reveal. Read only on code, no durable files, main thread. Typically after `/develop`.
- **`review`** (fresh model code review): a senior read of the diff on a **different model than wrote the code** (a model reviewing its own output shares its blind spots). Writes findings ranked by severity to `docs/reviews/`. Read only. Typically before a PR.

Neither mode edits code. `verify` points failures at `/debug` or `/develop`; `review` reports findings to fix.

## Pick the mode (route before doing anything else)

First step, before reading any mode file or touching the repo. Look at what followed `/check`:

- **Starts with `verify` (or `run`)** → read `modes/verify.md`, follow it fully. Pass remaining arguments (feature name, scope) through.
- **Starts with `review`** → read `modes/review.md`, follow it fully. Pass the steering through unchanged (e.g. `/check review with opus`, `/check review uncommitted`).
- **No mode word, or ambiguous** (bare `/check`, or a feature name with no mode like `/check auth`) → do NOT guess, do NOT default. Show the two options as a plain text panel and **stop and wait** for the engineer's choice.

**How to present the choice (plain text, works on every agent, no interactive modal):**

Print exactly this, then stop and wait. Do not assume `verify` until they answer. Route on their typed word (`verify` / `review` / `both`).

```
Which check do you want to run? Type one:
  • verify  run the real app and prove the change works against its spec (usually right after /develop)
  • review  a fresh model senior read of the diff, ranked findings (usually right before a PR)
  • both    verify first, then review
```

No interactive picker or modal: a typed choice shown inline behaves the same in every AI tool. (The `argument-hint` frontmatter also surfaces `verify | review` in Claude Code autocomplete; other tools ignore it, which is why this inline panel is the portable path.)

If a feature name came with no mode (`/check auth`), carry it as the target once they pick; still ask the mode.

Do not mix modes in one run. On **both**, do `verify` first, then offer `review` next.

## Portability (any OS, any agent)

Any Agent Skills client on macOS, Linux, or Windows. `git` is the only required CLI. Other shell snippets are POSIX reference, not literal scripts: use your agent's own cross platform file, process, and browser tools. Each mode file adds its own portability notes. No subagent support falls back to inline, noted per mode.

Bundled files: `modes/verify.md`, `modes/review.md`, plus `review-agent-prompt.md` and `review-guide.md` for review. Read only the mode file you routed to; resolve the review bundled files to absolute paths when spawning the reviewer.
