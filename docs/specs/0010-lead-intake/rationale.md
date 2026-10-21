# Lead intake reasoning

## Context

The public portfolio generates interest while the private studio already tracks clients and contracts. A prospective client needs a simple way to describe a project, and the owner needs to review it before treating it as a business relationship. The studio serves one owner and public data must remain separate from private contact details.

Feature 25 uses Tracer Bullet and Beta rigor. The owner selected the core product behavior and delegated remaining recommended design choices on 2026-10-21. This record is a design, not a claim that the feature is built, tested, legally certified, or deployed.

## Options considered

### Option 1: Email link only

The simplest experience keeps the existing contact links and handles inquiries in email. It needs no new database write path, but cannot provide the requested private inbox and deliberate conversion workflow. Suitable as a fallback, not the selected feature.

### Option 2: Inquiry inbox in the current app

Store inquiries separately, expose a narrow public write endpoint, and let the owner convert them using current studio conventions. This reuses the existing database, session, and client model. It also makes the public input boundary and notification failure handling the project's responsibility. This is the recommended option.

### Option 3: Hosted form or CRM

A hosted product can offer spam filtering, inboxes, and notifications with less custom code. It adds another store of contact data and an integration back to the studio. The requested source of truth is the private studio, so a second CRM is unnecessary for this scale.

## Rationale

Inquiry and client are different stages. Creating clients automatically would couple spam and name collisions to existing client rules. An explicit conversion transaction can link repeat visitors to existing clients without overwriting their records.

The database is the primary success condition. Email alerts contain only a private link and are attempted after commit. This prevents mail failure from losing the inquiry and reduces personal information copied into the provider and mailbox. Resend is selected for its focused HTTP API and retry key support. A custom SMTP integration is the runner up, but brings more connection and retry behavior into application code.

Turnstile verifies the browser challenge server side. Database counters provide limits shared across server instances without another data service. Honeypot only protection is simpler but too weak for an internet facing submission endpoint. A dedicated rate service would be reasonable at larger volume but is not required for this owner workflow.

The cleanup job implements the owner's 12 month inactivity choice. It uses calendar months and database time rather than local browser time. This is a product retention policy, not a legal conclusion. Retention of converted client/contact/note data remains governed separately.

Provider accounts, verified domain, recipient mailbox, and secrets belong to release setup. The spec chooses interfaces without inventing account values. It does not create accounts, buy a domain, change sharing, or deploy anything.

## Design record

No References section was requested; the recommended clean format was selected under the owner's delegation. Current official provider documentation was checked for server validation, email retry window, owned sender domain, and daily cron feasibility. The spec states these operational constraints without claiming independent model review before it runs.

The data model and final design were ratified through the owner's explicit authorization to use recommended choices until this architect run completes on 2026-10-21. The feature is not built, so its spec remains Proposed. No application code or deployment configuration was changed.

## Cross check

A fresh context agent performed a read only critique. A different model could not be verified. It identified nine decision gaps, and the main thread applied their recommended resolutions under the owner's delegation: nullable note provenance preserving existing note deletion; stable conversion retry keys and hashes; exact trusted address header; complete maintenance schema and health semantics; alert version and attempt timestamps; quota rollback with duplicate insertion; a Unicode safe body cap; cleanup protection for live email leases; and a deterministic conversion note template.

Optional discovery identified the official Resend sending skill and a Cloudflare setup oriented Turnstile skill. These are recorded for implementation, not installed during the design. Provider MCP account access is not required by the app design.

A second focused read checked those fixes and found two additional compatibility details. Public field limits now match existing UTF-16 studio validation, and completed conversion retries resolve their stored result before live client validation, so later client archival does not break a successful retry. Both recommendations were applied. No application test result is implied by a design review.
