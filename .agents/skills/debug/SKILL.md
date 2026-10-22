---
name: debug
allowed-tools: Bash, Read, Grep, Glob, Write, Edit, Agent
description: "Run /debug to find and fix a bug's root cause: a test failing for an unclear reason, /check verify finding a failure, or behavior being wrong. Runs a reproduce, localize, hypothesize, test, fix, verify loop, makes the minimal fix, and hands a regression test to /test. No features, no extra refactors."
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
- `model`: set explicitly to a strong model, do not inherit the session model (Claude Code: `sonnet`)
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
