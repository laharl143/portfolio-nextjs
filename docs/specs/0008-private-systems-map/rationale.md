# 0008. Private systems map: rationale

Decision record for [index.md](index.md). `/develop` builds from `index.md`; this file holds the why.

## Context

Your SMB Systems Map lives in a Claude artifact: 15 systems and 21 directed links in the artifact's own database. Each system has a name, a status (`built`, `ongoing`, `next`, `idea`), a layer group, an order, a private summary, an architecture lesson, a stack string, a free text notes box, and sometimes a repo link. The public Products page (spec 0002) shows a rewritten, public only copy of part of this data from the hand edited `utils/data/products-data.ts`. The studio already has the tables for the map (spec 0004: `systems`, `system_links`, `system_resources`, `notes`), seeded on the dev branch from the public file with the private fields empty. Production has no system rows at all.

Three forces shape the design. First, this repository is public (`laharl143/portfolio-nextjs`), so private notes, lessons, stack, and repo links can never be committed: no seed file, no fixture, no generated file can hold them. Second, the public site must stay free of studio code and studio data (root `AGENTS.md`, spec 0003), and the studio is off in Preview deploys, so anything the public page needs must exist without the database. Third, the artifact's shape does not match the schema exactly (two status names differ, it has a layer the schema lacks, its notes are one box rather than a log, its stack is one string).

Left undecided, the map stays split across three places (artifact, public file, empty studio tables), the public page drifts from reality, and every status change is typed twice.

## Options considered

### Option 1: Studio generated public file that you commit

The studio builds `products-data.ts` from the database through a query that selects only public columns, shows a banner when the bundled file differs, and offers it as a download. You replace the file, read the diff, commit, and deploy.

**Pros**:
- The public site stays static and database free, exactly as spec 0002 designed it.
- Private fields are never read by the export query, so they cannot leak through it.
- The git diff is a human check before anything goes public, and the history of public changes lives in git.

**Cons**:
- Two steps to publish (export, then commit and deploy).
- The bundled file can lag the database until you do them (the banner makes this visible, not automatic).

### Option 2: A local export script

The same generator, run as `npm run systems:export` on your machine against the database, writing the file in place.

**Pros**:
- One command, no download and copy.
- Easy to run in a terminal next to `git diff`.

**Cons**:
- The real map lives in production, so the script needs the production database URL on your machine; the seed is built to refuse exactly that host, and `.env.development.local` deliberately holds only the dev branch.
- A second way to reach production data outside the passkey gate.

### Option 3: Live read from Neon

`/products` reads systems from the database at build time or on request (ISR, incremental static regeneration: the page rebuilds itself every so often).

**Pros**:
- Always current, no export step.
- No generated file in the repo.

**Cons**:
- The public page now depends on the database; a Neon outage or a migration in flight breaks a public page.
- Public code must import a data module, against the rule that public code never imports studio code, and the leak check would need an exception.
- Preview deploys have no studio and no production data, so previews of `/products` show nothing real.
- No human check between an edit and the public page.

### Option 4: Keep two sources

`products-data.ts` stays hand edited for the public; the studio holds only the private side.

**Pros**:
- Smallest build: no export or drift code.

**Cons**:
- Name, status, and links are typed twice and drift apart, which is the problem this feature exists to remove.

## Rationale

Option 1 keeps the property that made spec 0002 safe (the public bundle physically cannot contain a private field) while making the studio the single place you edit. The force that decides it is the public repo plus the gated studio: a live read (Option 3) breaks the public and studio boundary and couples a public page to a private database for no real gain, since the product list changes a few times a month at most. Option 2 would be the smoothest workflow, but the real data sits in production and pulling its URL onto your machine undoes the care spec 0005 took to keep production behind the passkey. The cost of Option 1 is one download and one commit per public change, and the drift banner turns "did I forget to publish?" into something you can see.

The import follows the same logic. The real map cannot pass through the repo, and production has no rows, so a signed in paste page with a preview is the only path that needs no new secret and leaves nothing in git. A preview that names every create and field change, plus slug and from/to matching, makes it safe to run twice. Typing 15 systems by hand would work but loses the lessons and notes text to retyping errors.

The artifact's single notes box becomes the first note in the existing notes log, because client tracking already uses that log and later progress notes fit a timeline better than one overwritten box. The layer becomes a real column because it is how you think about the map (the artifact draws rows by layer), and deriving `standalone` from it removes the one field that could disagree with another.

Smaller calls, made on your instruction to take the recommended pick: restore for archived systems (a wrong archive would quietly drop a product from the next export), both link ends live for any link write (one simple rule), last write wins on import (a one time tool), no drawn diagram yet (the board and connections list do the tracking job; the diagram is mostly presentation), and a stable export order so repeated exports produce empty diffs.

## Evidence: artifact field inventory (read 2026-10-19)

Field names only, no values (the values are private and must not enter this public repo).

| Artifact field | Present on | Maps to |
|---|---|---|
| document id (not a field inside the row) | 15 of 15 | `systems.id`; the export JSON must add it to each row as `id` |
| `name` | 15 of 15 | `systems.name` |
| `status` (`built`, `ongoing`, `next`, `idea`) | 15 | `systems.status` (`ongoing` → `in-progress`, `idea` → `planned`) |
| `group` (`current`, `platform`, `core`, `layer2`, `standalone`) | 15 | `systems.layer` (new) |
| `order` | 15 | `systems.sort_order` |
| `summary` | 15 | `systems.summary` (private) |
| `lesson` | 15 | `systems.lessons` |
| `notes` | 15 (some empty) | one row in `notes` |
| `stack` (one string, `·` separated) | 9 | `systems.stack` (list) |
| `repo` | 3 | one `system_resources` row, kind `repo` |
| `updatedAt` | some | not imported (the studio keeps its own timestamps) |
| links: `from`, `to`, `label`, `state` | 21 | `system_links` |

The artifact has no public summary; the public summaries exist only in `utils/data/products-data.ts`, which is why the import takes them from there for new systems.
