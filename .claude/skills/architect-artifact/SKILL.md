---
name: architect-artifact
allowed-tools: Bash, Read, Grep, Glob, Write, Edit, Agent, AskUserQuestion, Skill, Artifact, mcp__visualize__read_me, mcp__visualize__show_widget
argument-hint: <feature or decision to design>
description: "Run /architect-artifact when you want /architect with visuals: the same design interview and the same spec in docs/specs/, but every interview round is a visual board in the chat (option cards with pictures, answered by clicking, never a text picker), and the confirmed spec gets its own private artifact page comparing the options and drawing the architecture and data flow. Use plain /architect when you want text only."
---

## What this skill is

`/architect-artifact` is `/architect` plus a visual layer. It is a separate skill on purpose: the engineer picks `/architect` for a text only run and `/architect-artifact` for a visual one. Everything `/architect` decides, asks, writes, and owns stays exactly the same. The spec in `docs/specs/` stays the only source of truth; the visuals illustrate it and never add a decision the spec does not hold.

This skill never copies `/architect`'s rules. It runs the installed `/architect` skill and adds three things on top:

1. **A visual board for every interview round** (clickable option cards with pictures in the chat, never a text picker).
2. **One private artifact page per spec**, published after the spec is confirmed.
3. **The page link recorded in the spec**, so a later run updates the same page.

Treat `architect-artifact` as a workflow skill, the same as `architect` (never as a community skill).

## How to run it

1. Resolve the sibling skill folder `../architect/` (relative to this file) to an absolute path, read its `SKILL.md` in full, and follow it from Step 0 to the end, with the topic and arguments given to `/architect-artifact`. Read its supporting files exactly when it says to.
2. Apply the additions below at the points named. Where they conflict with `/architect`, the additions win only for how a question is shown and for publishing the page. Every rule about what to ask, what to recommend, the completeness gate, the spec shape, statuses, the scope link, and the cross check stays `/architect`'s.
3. Keep `/architect`'s output style: plain simple words, `you`, no dashes or hyphens as punctuation. That applies to the cards and the page too.

## Addition 1: every interview round is a visual board (during the design conversation)

The engineer is a visual thinker. In this skill **every** question `/architect` would ask during the interview is shown as an inline visual board (`mcp__visualize__show_widget`) they answer by clicking. Never open an `AskUserQuestion` picker for an interview question, and never ask one as plain text. This covers the requirement questions, the page design stage, the data model questions and its confirm, the stack walk, the API, security, and edge case rounds, the References consent, the design source question, an overlapping spec panel, the cross check ask, and the final spec accept. Only the closing Next step panel from `/architect`'s shared block stays a picker.

Before the first board of the run, call `mcp__visualize__read_me` once with `interactive` plus `mockup` and `diagram`. Do not mention that call.

**One board per round.** Put the whole round (the same up to 4 questions `/architect` would batch) into a single widget, one section per question, so the engineer sees the round at once and answers it in one click.

**Every option is a card with a picture.** Draw something on every card, not only for layout questions:

- Layouts, sections, placement: a mini wireframe of the page or block.
- Flows, architecture, data flow: a few boxes and labelled arrows.
- Data model: small entity boxes with their key fields and the relationship line.
- Priorities, content choices, signals: a tiny mock of how that choice would look on screen (for example a card showing "3 inquiries waiting").
- Numbers, limits, rules: a simple scale, gauge, or before and after sketch.
- Yes or no: two cards, each showing what happens in that case.

Each card holds the option name, its picture, one line on what it is, and the main tradeoff (one plus, one minus). `/architect`'s option rules hold unchanged: every option that genuinely applies, up to 4 cards per question (show the strongest, say the rest can be typed), exactly one marked `Recommended` with a one line why, never a neutral menu. The one exception is `/architect`'s design source question, which carries no recommendation.

**Picking and sending.**

- Single choice questions: clicking a card selects it (highlighted border, others dimmed). Multi choice questions: cards toggle, and the section header says "pick all that apply".
- Each question section ends with a small "Other" text box for a custom answer, which replaces the card pick for that question.
- The recommended card starts selected, so a round the engineer agrees with is one click.
- One `Send answers` button at the bottom calls `sendPrompt` with one self contained message, one line per question, for example:
  `Answers for studio home, round 1:`
  `1. Core job: What needs me today`
  `2. Attention signals: Inquiries to review, Retention due`
  `3. Design source: Other: match the Vercel dashboard look`
  Disable the button until every single choice question has a pick or an Other text.
- Use the theme CSS variables the read_me gives you so the board reads well in light and dark mode. Plain HTML with inline SVG and a small inline script for selection; no external scripts.
- End the turn right after the board with one sentence naming the round. Do not pick for the engineer and do not continue until an answer arrives.

**Reading the answer.** An `Answers for …` message from the board, or a typed reply, is the engineer's answer to that round, exactly like a picker answer. Fold it forward and continue `/architect`'s staged conversation. A reply that answers something else, or is unclear, is handled the way `/architect` handles an unclear picker answer (ask again, as a board).

**Confirm boards.** Where `/architect` shows a whole thing for accept or change (the assembled data model, the architecture, the final spec), draw it on the board (an ERD style diagram, the architecture and data flow diagram, or a one screen outline of the spec) with cards for `Matches what I want (recommended)` and the change options, each with its own Other box. The architecture diagram is the same one the page will carry, so a mismatch is caught before the spec is written.

## Addition 2: the artifact page (after the spec is confirmed)

Run this after `/architect`'s `internal/after-subagent.md` step 3 (derive tasks and link the scope), and before its final summary and the Next step panel (the panel stays the very last action of the turn).

**Only for a confirmed spec.** If the engineer did not confirm (they stopped, or asked for changes still open), do not publish; say the page comes once the spec is confirmed.

**What the page shows** (every item comes from the written spec; quote or condense it, never invent):

1. **Header**: spec number and title, `**Status**:`, today's date, mode, and the linked scope feature and tracker key if any.
2. **Summary**: the spec's `## Summary`, plus the `## Decision` in one highlighted callout.
3. **Options compared**: one card per option from `## Options considered` (in `rationale.md` for a directory spec), each with its pros, cons, and the reason it was chosen or not. The chosen option is visibly marked. Add a short comparison table when the options share clear criteria (cost, effort, risk, fit with the stack).
4. **Architecture and data flow**: an inline SVG diagram of the parts the spec names (UI, routes or actions, services, database tables, external providers) and the data moving between them, with each arrow labelled by what moves. Draw only parts and flows the spec describes.
5. **Footer**: the spec's repo path, linked to the file on the remote (build the link from `git remote get-url origin` and the current branch; plain path if there is no remote).

Leave out anything the spec marks private or that should not leave the repo: no secrets, keys, environment values, real visitor or client data. The page is private to the engineer, but they may share it.

**Building and publishing.** Follow the `Artifact` tool's own rules for a new page (its quickstart and design guidance, plus `artifact-diagramming` for the diagram); this skill does not repeat them.

- Source file: `$SPEC_DIR/visuals/NNNN-title.html` (the same `NNNN-title` as the spec). Keeping the source in the repo lets any later session rebuild the page.
- Title: `Spec NNNN: <short title>`. Icon: `diagram`. Description: one sentence naming the decision.
- First publish creates the page. Then add the link to the spec, on its own line right under the `**Status**:` line of the spec file (the `index.md` for a directory spec): `**Visual**: <artifact url>`. Only this skill writes that line; `/architect` and `/develop` leave it alone.

**Rerun on a spec that already has a page.** If the spec carries a `**Visual**:` line, update that page instead of making a new one: read it with the `Artifact` read action, rebuild the source file from the updated spec, and publish with that `url`. If the local source file is missing, start from what the read returned.

**Supersede.** The new spec gets its own new page. Also republish the old spec's page with a banner at the top: "Superseded by spec NNNN" linking the new page.

**Report.** In `/architect`'s final summary, add one line with the page link and what it shows.

## Limits

- Claude Code only. Codex has no artifact or inline widget tool, so there is no `.agents/skills/` copy; in Codex use `/architect`.
- If the widget tool is unavailable, fall back to `/architect`'s normal picker for every round and say once that cards are not available in this session. If the `Artifact` tool is unavailable or the publish is refused, keep the source file, skip the `**Visual**:` line, and say so.
