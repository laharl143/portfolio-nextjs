# Verify: Client tracking · spec 0006 · updated 2026-10-19
_Steps derived from spec 0006 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Signed out, open `/studio/clients/<id>?x=1` → redirect to `/studio/login?next=%2Fstudio%2Fclients%2F<id>%3Fx%3D1` → AC-1
- [ ] With a cookie that matches no session, fetch `/studio/clients` → redirect from the page guard (the proxy lets it through) → AC-1
- [ ] Signed in, `/studio/clients` → live clients sorted by name ignoring case, with status, industry, primary contact, and last activity (Asia/Manila date); the header shows `Clients` between `Studio` and `Security` → AC-2
- [ ] Add a note to a client → its last activity moves to today (the latest change across the client and its contacts, projects, and notes) → AC-2
- [ ] With more than 50 clients, Previous and Next show only when that page exists → AC-2
- [ ] `q=demo` finds only names containing "demo"; `q=%` matches only a literal `%`; `status=past` filters; `status=bogus` is ignored; a reload keeps the filters → AC-3
- [ ] `page=abc` → page 1; `page=5` with few clients → "No clients on this page" with a link to page 1 → AC-3
- [ ] No filters, no live clients → "No clients yet"; `archived=1` with none → "No archived clients"; filters with no match → "No clients match" with a link that keeps `archived` → AC-3
- [ ] `/studio/clients/new` empty submit → "Name is required.", alert focused, error tied by `aria-describedby` → AC-4, AC-12
- [ ] Create "example bakery co" while "Example Bakery Co" is live → field error on name, nothing saved, the status select keeps its value → AC-4
- [ ] Website `localhost`, `ftp://files.example.com`, `https://u:p@example.com` → field errors; `demo.example.com` is stored as `https://demo.example.com` → AC-4
- [ ] Open the edit page in two tabs, save in one, then save in the other → "This client changed since you opened it." with `Reload`, typed values kept, the database keeps the first save → AC-5
- [ ] Archive Example Bakery Co (active contract) → refused with the spec message, still listed → AC-6
- [ ] Archive a client with no live contract → back on the list without it; under `archived=1`; its page shows "Archived on <date>" and no controls; its edit, new contact, and new project pages redirect to its page → AC-6
- [ ] On a live client's page, change the add note form's hidden `clientId` to the archived client's id and submit → "This client is archived, so it cannot be changed.", no new note → AC-6
- [ ] Add a contact to a client with no primary → the box starts ticked; the next add starts unticked → AC-7
- [ ] A contact email already used by a live contact of the same client (different case) → field error → AC-7
- [ ] Mark the second contact primary → the first loses it in the same save; the list shows the new primary → AC-7
- [ ] Archive the primary contact → it disappears and the client has none; its edit page shows not found → AC-7
- [ ] Project: target end before start, and an actual end date while active → both field errors; status done with valid dates saves; dates show on the same calendar day → AC-8
- [ ] Archive the seeded "Example storefront build" project → "This project has a signed or active contract." → AC-8
- [ ] Add a note `First line <b>not bold</b>` plus a second line → plain text, line breaks kept, no bold; the box resets → AC-9
- [ ] Edit the note → "edited" marker; delete it by keyboard through the dialog → gone → AC-9, AC-12
- [ ] With more than 100 notes → "Showing the latest 100 notes" → AC-9
- [ ] `/studio/clients/not-a-uuid`, a random uuid, `/studio/clients/<A>/contacts/<contact of B>/edit`, and a bad note or project id → the studio not found page, never a 500 → AC-10
- [ ] Each detail section with no rows shows its own empty state; the loading skeleton shows while pages load; a failed read shows the error panel with `Try again` → AC-10
- [ ] Keyboard through the create form and the archive dialog; focus returns to the trigger on close, or to the message on a refusal → AC-12
- [ ] 375px wide in light and dark: no sideways scroll on the list, detail, and form pages; the list shows stacked cards → AC-12

## Commands
- [ ] `npm run lint` → no errors → AC-11
- [ ] `npm run build` → ends with `[leak-check] clean` → AC-11
- [ ] Search the dev server log for a seeded contact email after failed contact saves → no match (`logging.serverFunctions: false` in `next.config.mjs`) → AC-11
- [ ] Search for imports of `@/studio/clients`, `@/studio/data`, or `@/studio/format` outside `src/studio/`, `src/app/(studio)/`, and `scripts/` → none → AC-11
- [ ] Race: `Promise.allSettled` of two creates with the same name ignoring case → one created, one `DuplicateClientName` → AC-4, AC-11
- [ ] Race: `archiveClient` and `createClientNote` together → never a note created after `archived_at` → AC-6

## Acceptance-criteria coverage
- AC-1 by steps 1 and 2 · AC-2 by steps 3 to 5 · AC-3 by steps 6 to 8 · AC-4 by steps 9 to 11 and the duplicate race · AC-5 by step 12 · AC-6 by steps 13 to 15 and the archive race · AC-7 by steps 16 to 19 · AC-8 by steps 20 and 21 · AC-9 by steps 22 to 24 · AC-10 by steps 25 and 26 · AC-11 by the commands · AC-12 by steps 9, 23, 27, and 28
