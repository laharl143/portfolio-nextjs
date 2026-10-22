---
name: check
allowed-tools: Bash, Read, Grep, Glob, Write, Agent
argument-hint: [verify | review]
description: "Confirm a change before merge. `/check verify` drives the real app to prove behavior against the spec (every acceptance criterion met, every surface built). `/check review` runs a senior code review on a fresh model, one that did not write the code. Verify after /develop, review before a PR. Writes to docs/reviews/, never edits code."
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

`/check` is the gate before merge. Two modes, separate jobs, usually both, verify first:

- **`verify`** (runtime proof): run the real app and watch the change behave. Proves it works and conforms to the spec (every acceptance criterion met, every specced surface built), which green tests never reveal. Read only on code, no durable files, main thread. Typically after `/develop`.
- **`review`** (fresh model code review): a senior read of the diff on a **different model than wrote the code** (a model reviewing its own output shares its blind spots). Writes findings ranked by severity to `docs/reviews/`. Read only. Typically before a PR.

Neither mode edits code. `verify` points failures at `/debug` or `/develop`; `review` reports findings to fix.

## Pick the mode (route before doing anything else)

Before reading a mode guide or inspecting the repo, look at what followed `/check`:

- **Starts with `verify` (or `run`)**: read `modes/verify.md` and follow it. Carry the feature and any steering through unchanged.
- **Starts with `review`**: read `modes/review.md` and follow it. Carry the feature and any steering through unchanged.
- **Starts with `both`**: run Verify first, then Review only if Verify passes. The user has authorized both modes, so do not ask for the same choice again between successful stages. If Verify fails or is blocked, stop the sequence, report why, and recommend the fix or prerequisite through the next step menu. Do not review an unverified failure as if verification passed.
- **No mode word, or ambiguous** (bare `/check`, or `/check auth`): present the clickable mode selector below and wait for an actual selection. A recommendation does not choose the mode for the user.

### Clickable mode selector

Use the native choice tool described in Codex compatibility and the Next step panel. In Codex Default mode, prefer the exposed `functions.request_user_input_async`. Ask one preference question, `Which check would you like to run for <feature>?`, or `Which check would you like to run?` when no feature is known. Use these four choices:

- `Verify: Run the real app against its spec.`
- `Review: Read the diff for code issues with a fresh reviewer.`
- `Both: Verify first, then review if verification passes.`
- `Stop here: Do not run a check yet.`

Put the recommended choice first, add `(Recommended)`, and briefly explain why in the summary. Use context already available: recommend Verify after a build or when no earlier verification is known; Review after verification passed and review remains; Both when both are due before merge. Do not inspect unrelated files just to choose a recommendation.

The asynchronous tool returns immediately. End with a short summary, keep the selection pending, and run no check until the user replies. Preselection, silence, Skip, or the immediate tool return is not a mode choice. Stop or Skip runs nothing.

When the user selects a mode, read its guide and continue immediately without requiring a typed command or another confirmation. Retain the supplied feature and steering, such as `auth` from `/check auth`. A Both selection follows the sequence above and gets one next step menu after the requested sequence ends.

When no permitted native picker exists, use supported Codex followup controls with the exact `/check verify <feature>`, `/check review <feature>`, or `/check both <feature>` prompt. The Stop control sends an explicit stop instruction. Use a plain numbered choice list only when no clickable interface exists. Never require a typed reply while a permitted clickable control is available.

## Portability (any OS, any agent)

Any Agent Skills client on macOS, Linux, or Windows. `git` is the only required CLI. Other shell snippets are POSIX reference, not literal scripts: use your agent's own cross platform file, process, and browser tools. Each mode file adds its own portability notes. No subagent support falls back to inline, noted per mode.

Bundled files: `modes/verify.md`, `modes/review.md`, plus `review-agent-prompt.md` and `review-guide.md` for review. Read only the mode file you routed to; resolve the review bundled files to absolute paths when spawning the reviewer.
