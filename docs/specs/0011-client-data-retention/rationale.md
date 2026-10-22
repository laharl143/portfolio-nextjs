# Client data retention decision record

## Context

Specs 0004 and 0010 leave archived contacts and converted client records without a retention rule. The studio already archives records and keeps contract history and files immutable. Inquiry cleanup deliberately retains converted client records and copied notes. The owner needs a safe policy before live client use.

## Options considered

| Option | Benefit | Cost |
|---|---|---|
| Review dashboard only | Smallest change, no removal risk | Leaves expired data in storage and requires manual database work |
| Owner reviewed removal with holds, chosen | Clear consent, exact scope, no new infrastructure | Requires regular owner review; conservative blockers leave complex records retained |
| Automatic scheduled deletion | Clears eligible backlog without visits | Business exceptions and false assumptions can cause irreversible loss |
| Anonymize all records and preserve structure | Can preserve linked business history | Free text and PDFs defeat reliable complete anonymization; unique names and downstream semantics need a separate design |

## Rationale

The existing contract model makes broad deletion unsafe. A narrow hard removal path for unencumbered archived records solves a real portion of retention without weakening contract invariants or claiming to scrub arbitrary text. A fixed 12 calendar month archive window is a deliberate product default, separate from the source inquiry clock. It is not a legal minimum or maximum. Explicit business holds preserve data still needed for ordinary freelance obligations; they do not silently reset archive timestamps.

Server persisted previews avoid trusting browser supplied deletion sets. A short expiry, snapshot recheck and one transaction make confirmation meaningful under concurrent changes. Existing client locks plus the inquiry workspace lock provide an established ordering rather than introducing a competing lock namespace. Minimal finite receipts support retries without copying removed personal content.

The engineer delegated the recommended design and confirmations on 2026-10-21. No new tool is chosen, so no tool discovery or installation is needed. References preference resolves to the skill's recommended no references option; project paths in the build spec remain integration contracts. Fresh context review is part of the delegated recommended Beta workflow, with model independence unverified.

## Design review

Fresh context critique on 2026-10-21 found five gaps. Recommended fixes were applied under the engineer's delegation: blocked client reviews expose held child contacts, expired receipts never count as successful retries, blockers take precedence over waiting in list filters, metadata cleanup is scoped and time bounded, and backup restoration uses the existing studio disable switch with fresh previews after reconciliation. No implementation or behavioral verification ran during architecture.
