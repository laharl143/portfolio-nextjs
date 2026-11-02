# 0019. Next steps on the contact success state

**Date**: 2026-11-02
**Status**: Accepted

## Summary

After a visitor sends an inquiry on `/contact`, the success message now goes on to say what happens next: you reply by email within 1 business day, your reply has a few questions about their project and a couple of times you could talk, and they should check spam for a message from your address. There is no booking link, because no scheduling page exists today and a promise the site cannot keep is worse than none. The copy lives in `utils/data/contact-data.ts`, so changing the promise later is a one line edit. Only the success state changes; the error, validation, and pending states stay as they are.

## Context

The `/contact` form (spec 0010) ends on one line, "Thanks, your inquiry has been received." A small business owner who just described their project gets no sense of when they will hear back or what the next conversation looks like. That silence is where leads go cold: they send the same note to someone else, or they assume the form went nowhere.

Two of the facts this screen needs are promises only you can make: how fast you reply, and what the reply contains. Nothing in the repo recorded either. An uncommitted draft (from the stopped `/develop` run) said "within 24 hours" and "a link to book a short intro call", but no booking page exists and 24 calendar hours binds you on weekends.

Spec 0010 says the success copy makes "no email delivery promise" and that no visitor email receipt is added. That rule is about an automatic confirmation email from the system. This feature promises a personal reply from you, sent by hand from your own inbox, so it does not break that rule, but the copy must not imply an automatic email is on its way.

The site has no visitor accounts and stores nothing new here. The only work is copy and one small rendering block inside the existing client form component.

## Requirements

**User stories**:
- As a small business owner who just sent an inquiry, I want to know when I will hear back and what the reply will ask of me, so that I wait with confidence instead of guessing.
- As the site owner, I want the reply promise written down in one place, so that the site never promises something I am not doing.

**Acceptance criteria**:
- **AC-1**: After a successful submission, the success region (the existing `role="status"` element that receives focus) shows, in order: the existing line "Thanks, your inquiry has been received.", a heading "What happens next", and an ordered list of exactly three steps:
  1. "I read your note and reply by email within 1 business day."
  2. "My reply has a few questions about your project and a couple of times we could talk."
  3. "Keep an eye on your inbox, and check your spam folder for a message from erskine.duenas@gmail.com."
- **AC-2**: The email address in step 3 is the same value as `contactData.email` (one source, not typed twice). Changing `contactData.email` changes step 3.
- **AC-3**: No copy on the page mentions a booking link, a calendar link, 24 hours, or an automatic confirmation email.
- **AC-4**: The next steps block never shows outside the success state: not while idle, pending, on a 422 field error, a 429 rate limit, a failed or ambiguous submit, or when the form is unavailable. Those states keep their current copy and behavior. Choosing "Start another inquiry" hides the block again along with the success message.
- **AC-5**: The block sits inside the existing status region, so the screen reader announcement and the focus move that already happen on success include it. The heading is an `h2` (the page `h1` stays the only `h1`), the steps are a real `<ol>`, and the text uses brand token colors only (spec 0015 rule, e.g. `text-muted-foreground`).
- **AC-6**: At desktop and 375px, in both themes, the success state has no horizontal scroll; the long email address in step 3 wraps instead of overflowing.
- **AC-7**: Nothing else changes: the `/contact` API, validation, Turnstile, analytics events, and the studio are untouched. `npm run lint`, `npm test`, and `npm run build` (with the studio leak check) pass.

## Options considered

### Option 1: Static next steps copy in `contact-data.ts`, rendered in the success region

Add a `nextSteps` object (title plus three step strings) to `contactData`, build step 3 from `contactData.email`, and render it under the success message in `ContactForm`.

**Pros**:
- Copy stays where all other contact copy lives (the `utils/data` rule in `AGENTS.md`); the promise is one edit away.
- Rides on the existing status region, so focus and announcement already work.
- Nothing to operate: no third party, no new env var.

**Cons**:
- The reply time is a manual promise; nothing checks that you actually keep it.

### Option 2: Add a booking link now (Cal.com, Calendly, or a Google booking page)

Show "Book a short intro call" with a link, either on the success state or promised in your reply.

**Pros**:
- Shortest path from inquiry to call for a visitor ready to talk.

**Cons**:
- No booking page exists; this adds a third party account, a public URL to keep in sync, and calendar upkeep.
- Promising a link the reply does not reliably carry is the exact gap this spec exists to close.

### Option 3: An automatic confirmation email to the visitor

Send the next steps by email through Resend right after submission.

**Pros**:
- The visitor has the promise in their inbox, not just on a screen they close.

**Cons**:
- Reverses spec 0010's "no visitor email receipt" decision and turns the public form into a way to send mail to any address (an abuse path that needs its own rate and content design).
- Much larger than the scope row asks for.

## Decision

**Chosen option**: Option 1: Static next steps copy in `contact-data.ts`, rendered in the success region

The success state shows a three step "What happens next" list promising a reply within 1 business day that carries a few questions and a couple of times to talk, with no booking link.

**Implementation skills**: `vitest` (`antfu/skills`, `.claude/skills/vitest/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.claude/skills/vercel-react-best-practices/`)

**Choices made by the engineer** (2026-11-02): the reply time is 1 business day; the spam tip with the address stays. The engineer then asked for the recommended pick on every remaining dimension, which settled: the reply includes questions plus a couple of times to talk (no booking link); the heading reads "What happens next"; step 3 reads the address from `contactData.email`; no analytics change (feature 37 owns conversion tracking).

## Rationale

The scope row asks for a reply time you commit to, and the honest version of that promise is the one you can keep on a Friday evening. "1 business day" reads as fast to a business owner while leaving weekends alone; 24 calendar hours would be broken by the first weekend inquiry. Saying what the reply contains matters just as much: "a couple of times we could talk" is true today with your plain inbox, while a booking link would need a tool, an account, and upkeep before the sentence becomes true. If you later set up a scheduling page, the copy changes in one place.

Rendering inside the existing status region reuses work spec 0010 already did (focus moves to that region, and `role="status"` announces it), so the new text reaches keyboard and screen reader users with no new mechanism. An automatic email (Option 3) would solve a problem nobody has reported and reopen an abuse surface 0010 closed on purpose.

## Feature design

**Data model sketch**: none. No database change, nothing stored.

**API surface**: none. `POST /api/inquiries` is unchanged.

**Interface surface**:
| Piece | Change |
|---|---|
| `utils/data/contact-data.ts` | Add `nextSteps: { title: string; steps: string[] }`. Hoist the email into a local `const email` so both `email` and step 3 use it. |
| `src/components/ContactForm.tsx` | Inside the status region, after `{message}`, render the block only when `success` is true: `<h2>` with the title, `<ol>` with one `<li>` per step. `break-words` (or `[overflow-wrap:anywhere]`) on the list so the address wraps. |
| `src/components/ContactForm.test.tsx` | Assert the block and its three steps on success, and its absence on the error path. |

**Value sourcing**:
| Action | Value displayed | Source |
|---|---|---|
| Success state | "Thanks, your inquiry has been received." | `contactData.success` (existing, spec 0010) |
| Success state | Heading "What happens next" | `contactData.nextSteps.title` |
| Success state | Reply time "within 1 business day" | `contactData.nextSteps.steps[0]`, decided by the engineer in this spec |
| Success state | Reply contents "a few questions … a couple of times we could talk" | `contactData.nextSteps.steps[1]`, decided in this spec |
| Success state | Reply sender address | `contactData.email` (interpolated into `steps[2]`) |
| Success state | Whether the block shows | the existing `success` state in `ContactForm` (true only after a 200 from `POST /api/inquiries`) |

**Key invariants**:
- The block renders if and only if `success` is true.
- The reply promise exists in exactly one place, `contactData.nextSteps`.
- No copy implies an automatic email or a booking link.

**Security model**: no change. The block is static public copy; it shows nothing the visitor submitted and no inquiry id (spec 0010 AC-4 still holds).

**Critical test scenarios**:
- Happy path: submit succeeds, the status region contains the heading and all three steps in order with the address from `contactData.email`, verifies **AC-1**, **AC-2**, **AC-5**
- Failure case: a failed submit shows the error and no "What happens next"; retry succeeds and the block appears, verifies **AC-4**
- Reset: "Start another inquiry" hides the block, verifies **AC-4**
- Copy guard: rendered success text does not match `/book|calendar|24 hours/i`, verifies **AC-3**
- Layout: at 375px in both themes the success state has no horizontal scroll (manual or `/check verify` with the local Turnstile test keys; no e2e submits the public form today), verifies **AC-6**

## Build plan

One thin slice, end to end (Tracer Bullet: the whole feature is one vertical path through copy, component, and test). The uncommitted draft already covers most of steps 1 and 2; align it to this spec rather than starting over.

1. In `utils/data/contact-data.ts`, set `nextSteps` to the AC-1 copy (replace "within 24 hours" and the booking link sentence) and build step 3 from a shared `email` constant, satisfies **AC-1**, **AC-2**, **AC-3**
2. In `ContactForm.tsx`, keep the drafted block inside the status region, rendered only on `success`, with brand token classes and wrapping for the address, satisfies **AC-1**, **AC-4**, **AC-5**, **AC-6**
3. In `ContactForm.test.tsx`, update the drafted assertions to the new copy ("within 1 business day", "a couple of times we could talk", the address from `contactData.email`), keep the absence check on the error path, and add the reset and copy guard checks, satisfies **AC-1** to **AC-5**
4. Run `npm run lint`, `npm test`, and `npm run build`; check `/contact` success at 375px and desktop in both themes, satisfies **AC-6**, **AC-7**

## Consequences

**Positive**:
- Visitors leave the form knowing when and how you will reply, which cuts the "did that go anywhere" drop off.
- The promise is written down once, so the site and your habits can be kept in step.

**Negative / tradeoffs**:
- You now owe a reply within 1 business day to every inquiry, spam that slips past Turnstile aside. Holidays and travel need either a copy change or a reply anyway.
- Visitors ready to book a call still have to wait for your email.

**Neutral**:
- Spec 0010's success line stays; this adds to it. 0010's "no email delivery promise" still holds, since no automatic email is promised.

## Follow-up

- [ ] If you set up a scheduling page later, update step 2 in `contactData.nextSteps` (and this spec) rather than adding a second promise elsewhere.
- [ ] Feature 37 (inquiry conversion tracking) owns any analytics on the success state; none is added here.
