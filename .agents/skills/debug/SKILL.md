---
name: debug
allowed-tools: Bash, Read, Grep, Glob, Write, Edit, Agent
description: "Run /debug to find and fix a bug's root cause: a test failing for an unclear reason, /check verify finding a failure, or behavior being wrong. Runs a reproduce, localize, hypothesize, test, fix, verify loop, makes the minimal fix, and hands a regression test to /test. No features, no extra refactors."
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

**Your role:** the investigator who trusts evidence over intuition. Treat a bug as a case to be proven: reproduce it on demand, narrow it to the smallest failing surface, and change one thing at a time so every result *means* something. Resist patching what you see (the null, the crash) before you understand *why* it's there; a fix you can't explain is a bug you haven't caught.

A structured root cause investigation, not a guess and check. Bugs are found by a **loop**: reproduce → localize → hypothesize → test the hypothesis → fix the root cause → verify. This skill runs that loop with discipline (**one hypothesis at a time**, each confirmed or rejected by evidence) until the cause is proven, then applies the smallest fix.

> This is an *internal investigation loop within a single run*, not the `/loop` skill (which runs a command again on a time interval). Reach for `/loop` only when you need to watch something over time, e.g. poll a flaky test across many runs.

## Asks vs acts

**Acts.** It reproduces, investigates, and fixes. It **asks only** when it cannot reproduce the bug from what it's given, then it asks for exact steps, inputs, environment, and the observed vs expected behavior. It does not ask permission to investigate.

## Artifact ownership

Writes the **minimal code fix** for the root cause. Recommends `/test` for the regression test (or writes a failing then passing test inline if that's the fastest proof). Does **not** add features, refactor unrelated code, or rewrite the spec. If the bug reveals a flawed decision (not just a coding mistake), it says so and points to `/architect` rather than papering over it.

---

## Portability (any OS, any agent)

Written for any Agent Skills client on macOS, Linux, or Windows. Commands are **reference**, use the project's real test/run commands and your agent's own tools. The investigation can run in a subagent (below) or inline if your tool has no subagent.

## Execution

### Step 0: Capture the symptom

Pin down precisely, before touching code:
- **Observed** behavior (the exact error, stack trace, wrong output, or screenshot).
- **Expected** behavior.
- **Repro**: the steps, inputs, and environment that trigger it.

If any of these is unclear and you can't derive it, **ask**, you cannot debug what you can't reproduce.

### Step 1: Reproduce reliably

Get a **deterministic reproduction** (a failing test, a command, a request) that triggers the bug on demand. If it's intermittent, find what makes it deterministic (timing, ordering, data, concurrency). A bug you can't reproduce on command, you can't prove you've fixed. If you truly can't reproduce it, add instrumentation to catch it and say so, do not "fix" blind.

### Step 2: Localize

Narrow the failure to the smallest possible surface before theorizing:
- **Bisect the code path**: binary search where good input becomes bad output (logging/print at midpoints, breakpoints, or commenting out).
- **Bisect history**: if it's a regression, `git bisect` (or `git log -p` on the suspect files) to find the introducing change.
- **Read the actual values**: instrument inputs/outputs at the boundary; don't assume what they are.

### Step 3: Hypothesize (one at a time)

State a single, specific, falsifiable hypothesis for the root cause, e.g. "the date is parsed as local time, so the cutoff is off by the timezone offset." Root cause, not symptom: "the value is null here" is a symptom; *why* it's null is the cause. Resist shotgun changing several things at once.

### Step 4: Test the hypothesis

Design the smallest experiment that confirms or refutes it (a targeted log, an assertion, a one line change, a unit test). Run it.
- **Refuted** → discard it, return to Step 2/3 with what you learned. Do not keep a change that didn't help.
- **Confirmed** → you've found the root cause. Proceed.

Loop Steps 3 to 4 until a hypothesis is confirmed by evidence. **Never skip to a fix on a hunch**, an unverified fix is how a symptom gets patched while the bug survives.

### Step 5: Fix at the root

Make the **minimal, targeted** change that addresses the proven cause. Don't fix the symptom (clamping the null), fix the cause (why it's null). Resist scope creep, no opportunistic refactors riding along with the fix. Follow the project's conventions (`AGENTS.md`, neighbouring code).

### Step 6: Verify and protect

- Run the Step 1 reproduction again, confirm it now passes.
- Run the surrounding test suite, confirm no regression.
- **Add a regression test** that fails without the fix and passes with it, so this bug can't silently return; write it inline, or hand the spec to `/test`.
- **Check for siblings**: the same root cause often hides in other places (same pattern, same bad assumption). Grep for them and note or fix them.

### Optional: run it in a subagent

For a hunt that is not trivial, spawn an investigation subagent so the iterative tool use doesn't fill the main context:
- `model`: set explicitly to a strong model, do not inherit the session model (Codex: `sonnet`)
- `description: "Debug: <symptom>"`
- Tools: `Read`, `Bash`, `Grep`, `Glob`, `Edit`, `Write`
- `prompt`: this loop + the captured symptom + reproduction + the relevant `AGENTS.md` (inlined). Require it to report the root cause with evidence, not just "fixed it."

### Report

Lead with the root cause and the fix; the reproduction and evidence are the trail, not the headline (per `docs/conventions.md`). Template:

```
## /debug complete Â· <the bug, one line>

**Root cause: <the proven cause>. Fixed by <the minimal change, files touched>.**
Next: /test <feature>   (lock in the regression test, added inline or handed over)
Heads up: <same cause also at <where>, fixed too · or a design flaw → /architect <what>>   (omit if none)
```

If the cause is a flawed decision rather than a coding mistake, lead with that in the headline, the right fix may be a spec update, not a code patch.
