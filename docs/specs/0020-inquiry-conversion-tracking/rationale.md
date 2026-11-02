# 0020. Inquiry conversion tracking: rationale

The decision record behind [index.md](index.md).

## Context

Spec 0016 and spec 0018 put calls to action on the landing page, header, and footer, and each one fires `contact_click` with a `location` (`hero`, `closing`, `header`, `mobile_nav`, `footer`, `services`, `ecosystem`). The link itself is a plain `/contact`, so that is where the trail ends. Once the visitor lands on the form, nothing ties what they do there back to the click, and the form (`src/components/ContactForm.tsx`) sends no analytics at all. You can see how many people click each call to action, but not how many of them went on to send an inquiry. That is the number that tells you which page changes work.

Scope feature 37 asks for three things: a sent inquiry can be traced to the call to action that led to `/contact`, form starts and successful submissions show as distinct events in the Vercel Analytics dashboard, and no personal data reaches analytics. The first wants a link per inquiry. Dashboard totals cannot provide that, because analytics events are anonymous and cannot be joined to a studio row.

Constraints. The form is the single public write path into the studio database (spec 0010, `src/inquiries/AGENTS.md`). Anything added to the request must be validated server side, must never be echoed back, and must never cause a real lead to be rejected. The `inquiries` table has strict check constraints and a payload hash used for duplicate detection. A new field must not turn an honest retry into a `KEY_CONFLICT`. Analytics runs only inside the `(site)` route group (`<Analytics />` in `src/app/(site)/layout.tsx`) and uses `track()` from `@vercel/analytics`, which does nothing locally.

Privacy. The inquiry holds personal data (name, email, description). Event properties must be fixed codes only: no field values, no email domain, no lengths, and no submission key or inquiry id, because an id would join an event directly to a person. At this site's traffic, an `inquiry_sent` timestamp could still be matched by hand to a row's `created_at`. That is accepted: only you can see both, and the event carries nothing personal on its own.

## Options considered

### Option 1: `sessionStorage` handoff, location stored on the inquiry

The click writes the location to `sessionStorage`. The form reads it, puts it on its analytics events, and sends it with the inquiry, which saves it in a nullable column shown in the studio.

**Pros**:
- Every sent inquiry is traceable to its call to action, which is the scope's first "done when" line.
- The `/contact` URL stays clean: no `?from=` in shared links, pageview paths, or the canonical.
- The location is a fixed code, not personal data, and retention cleanup removes it with the row.

**Cons**:
- A call to action opened in a new tab or window (middle click, long press) arrives with an empty `sessionStorage` and counts as `direct`.
- A stored location can go stale, so it needs a time limit and must be cleared after a send.
- It touches the public write path, the schema, and the studio, so the change is larger than analytics alone.

### Option 2: URL query parameter (`/contact?from=hero`)

Each call to action links to `/contact?from=<location>`, and the form reads the parameter.

**Pros**:
- Survives a new tab, a copied link, and a click with JavaScript off.

**Cons**:
- Every call to action changes, and the parameter shows up in shared URLs, browser history, and analytics page paths. It also splits the page's pageviews by query.
- A copied link carries a stale attribution to whoever opens it.

### Option 3: Analytics only

Events carry the location, nothing is stored on the inquiry.

**Pros**:
- No schema, API, or studio change.

**Cons**:
- You see totals per location but cannot tell which call to action a specific inquiry came from, so the scope's first "done when" line is not met.

## Rationale

The scope asks for per inquiry tracing, and only a value stored on the row gives that. Analytics events are anonymous by design, and keeping them that way is what makes AC-6 hold. So the studio row carries the attribution, and the dashboard carries the funnel. Both get the location from the same place.

`sessionStorage` beats a URL parameter here because the calls to action already run a click handler (`trackContactClick`), so writing one more value at the same moment covers all seven locations in one place. The URL parameter would change every link and put attribution into URLs people share. The cost is that a new tab click counts as `direct`. That undercounts slightly. Misattribution is the worse error for a decision metric, so the stored value expires after 30 minutes and is cleared after a send, and only clicks that actually go to `/contact` write it. Some stale attribution can remain within that window, and that is accepted.

"First edit" is the start signal because focus fires on accidental clicks and on tabbing, which would inflate starts and make the drop off look worse than it is. Failures carry a fixed reason so you can tell a validation problem (copy or field design) from a failed bot challenge, rate limiting, or an outage. These are different fixes, and a success only event would hide all three. The server accepts an unknown location as `null` instead of rejecting, because a tracking field must never cost a real lead. The location is kept out of the payload hash so an honest retry stays a retry. The database check is a shape check, not an exact list, so a future call to action needs only a code change (`CONTACT_LOCATIONS`), not a migration. The application allowlist is the real gate.

