import { getRecordCounts, type RecordCounts } from "@/studio/data/counts";
import { pgErrorOf } from "@/studio/data/errors";
import {
  getContractSignal,
  getExportDriftSignal,
  getInquirySignal,
  getStatusOverview,
  type ContractSignal,
  type ExportDriftSignal,
  type InquirySignal,
  type StatusOverview,
} from "@/studio/data/home";
import { CLIENT_STATUSES, CONTRACT_STATUSES, PROJECT_STATUSES } from "@/studio/db/constants";
import { getDatabaseStatus, type DatabaseStatus } from "@/studio/db/status";
import { formatDateTime } from "@/studio/format";
import { requireStudioAccess } from "@/studio/guard";
import { getRetentionAttention } from "@/studio/retention/service";
import { isStoreReachable } from "@/studio/storage/blob";
import StatusBadge from "../_components/StatusBadge";
import { card, pageEyebrow } from "../_components/ui";
import AllClear from "./_home/AllClear";
import AttentionRow from "./_home/AttentionRow";
import AttentionSection from "./_home/AttentionSection";
import CountStrip, { type Tile } from "./_home/CountStrip";
import HealthCard from "./_home/HealthCard";
import HealthFooter, { type HealthLine } from "./_home/HealthFooter";
import StatusBar from "./_home/StatusBar";
import { ageLabel, dueLabel } from "./_home/age";

const ATTENTION_ROWS = 3;

type RetentionSignal = Awaited<ReturnType<typeof getRetentionAttention>>;
type Loaded<T> = { ok: true; value: T } | { ok: false };

function databaseLine(status: DatabaseStatus) {
  switch (status.state) {
    case "not-connected":
      return "Not connected";
    case "not-migrated":
      return "Connected, not migrated";
    case "migrated":
      return `Connected, ${status.count} migrations applied`;
  }
}

// Each read is contained to its own section (spec 0012, AC-11). The log carries the signal name and the error
// code or class name only, never row data.
async function load<T>(name: string, read: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (err) {
    console.error("[studio] home signal", name, pgErrorOf(err)?.code ?? (err instanceof Error ? err.constructor.name : "UNEXPECTED"));
    return { ok: false };
  }
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function inquiryTile(signal: Loaded<InquirySignal>): Tile {
  const base = { key: "inquiries", label: "Inquiries", href: "#inquiries" };
  if (!signal.ok) {
    return { ...base, count: null, detail: "Could not load", dimmed: false };
  }
  const { open, alertProblems } = signal.value;
  const alerts = alertProblems > 0 ? ` · ${plural(alertProblems, "alert", "alerts")} failed` : "";
  const quiet = open === 0 && alertProblems === 0;
  return { ...base, href: quiet ? "/studio/inquiries" : base.href, count: open, detail: `${open} open${alerts}`, dimmed: quiet };
}

function contractTile(signal: Loaded<ContractSignal>): Tile {
  const base = { key: "contracts", label: "Contracts", href: "#contracts" };
  if (!signal.ok) {
    return { ...base, count: null, detail: "Could not load", dimmed: false };
  }
  const { sent, draft } = signal.value;
  const quiet = sent + draft === 0;
  return { ...base, href: quiet ? "/studio/contracts" : base.href, count: sent + draft, detail: `${sent} sent · ${draft} draft`, dimmed: quiet };
}

function retentionTile(signal: Loaded<RetentionSignal>): Tile {
  const base = { key: "retention", label: "Retention", href: "#retention" };
  if (!signal.ok) {
    return { ...base, count: null, detail: "Could not load", dimmed: false };
  }
  const { eligible } = signal.value;
  const quiet = eligible === 0;
  return { ...base, href: quiet ? "/studio/retention" : base.href, count: eligible, detail: quiet ? "Nothing due" : "Due for review", dimmed: quiet };
}

function exportTile(signal: Loaded<ExportDriftSignal>): Tile {
  const base = { key: "export", label: "Public export", href: "#export" };
  if (!signal.ok) {
    return { ...base, count: null, detail: "Could not load", dimmed: false };
  }
  const count = signal.value.differences.length;
  const quiet = count === 0;
  return { ...base, href: quiet ? "/studio/systems" : base.href, count, detail: quiet ? "In sync" : "Out of date", dimmed: quiet };
}

function Header() {
  return (
    <>
      <p className={pageEyebrow}>Private</p>
      <h1 className="mt-2 text-5xl md:text-6xl">Studio</h1>
    </>
  );
}

export default async function StudioPage() {
  await requireStudioAccess();

  const database = await getDatabaseStatus();
  const databaseOk = database.state === "migrated";

  // Not connected or not migrated: no other database read runs (spec 0012, AC-10).
  if (!databaseOk) {
    const storeReachable = await isStoreReachable();
    return (
      <main className="container py-16">
        <Header />
        <HealthCard
          title={database.state === "not-migrated" ? "Database not migrated" : "Database not reachable"}
          detail={
            database.state === "not-migrated"
              ? "The studio tables are missing. Run the migrations, then reload."
              : "The studio cannot reach its database. Check the connection, then reload."
          }
        />
        <HealthFooter
          lines={[
            { label: "Database", text: databaseLine(database), ok: false },
            { label: "File storage", text: storeReachable ? "Private store reachable" : "Storage not reachable", ok: storeReachable },
          ]}
          counts={null}
        />
      </main>
    );
  }

  const [inquiries, contracts, retention, drift, overview, storeReachable, counts] = await Promise.all([
    load("inquiries", getInquirySignal),
    load("contracts", getContractSignal),
    load("retention", () => getRetentionAttention(ATTENTION_ROWS)),
    load("export", getExportDriftSignal),
    load("overview", getStatusOverview),
    isStoreReachable(),
    load<RecordCounts>("counts", getRecordCounts),
  ]);

  const now = new Date();
  const allClear =
    inquiries.ok &&
    contracts.ok &&
    retention.ok &&
    drift.ok &&
    inquiries.value.open + inquiries.value.alertProblems === 0 &&
    contracts.value.sent + contracts.value.draft === 0 &&
    retention.value.eligible === 0 &&
    drift.value.differences.length === 0;

  const lines: HealthLine[] = [
    { label: "Database", text: databaseLine(database), ok: true },
    { label: "File storage", text: storeReachable ? "Private store reachable" : "Storage not reachable", ok: storeReachable },
  ];

  return (
    <main className="container py-16">
      <Header />

      {!storeReachable && (
        <HealthCard
          title="File storage not reachable"
          detail="Contract files cannot be read or saved until the private store responds. Everything else works."
        />
      )}

      {allClear ? (
        <AllClear />
      ) : (
        <>
          <CountStrip tiles={[inquiryTile(inquiries), contractTile(contracts), retentionTile(retention), exportTile(drift)]} />

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
            {(!inquiries.ok || inquiries.value.open + inquiries.value.alertProblems > 0) && (
              <AttentionSection
                id="inquiries"
                title="Inquiries"
                failed={!inquiries.ok}
                links={[
                  { href: "/studio/inquiries", label: "See all" },
                  ...(inquiries.ok && inquiries.value.alertProblems > 0
                    ? [{ href: "/studio/inquiries?alert=attention", label: "Check alerts" }]
                    : []),
                ]}
              >
                {inquiries.ok &&
                  inquiries.value.rows.map((row) => (
                    <AttentionRow
                      key={row.id}
                      href={`/studio/inquiries/${row.id}`}
                      title={row.name}
                      detail={row.company ?? undefined}
                      age={ageLabel(new Date(row.createdAt), now)}
                      ageTitle={formatDateTime(new Date(row.createdAt))}
                      mark={
                        row.alertProblem && (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400">
                            <span aria-hidden="true" className="inline-block size-2 rounded-full bg-red-600" />
                            Alert failed
                          </span>
                        )
                      }
                    />
                  ))}
              </AttentionSection>
            )}

            {(!contracts.ok || contracts.value.sent + contracts.value.draft > 0) && (
              <AttentionSection
                id="contracts"
                title="Contracts"
                failed={!contracts.ok}
                links={[
                  {
                    href: `/studio/contracts?status=${contracts.ok && contracts.value.sent === 0 ? "draft" : "sent"}`,
                    label: "See all",
                  },
                ]}
              >
                {contracts.ok &&
                  contracts.value.rows.map((row) => (
                    <AttentionRow
                      key={row.id}
                      href={`/studio/contracts/${row.id}`}
                      title={row.title}
                      detail={row.clientName}
                      mark={<StatusBadge status={row.status} />}
                      age={ageLabel(new Date(row.changedAt), now)}
                      ageTitle={formatDateTime(new Date(row.changedAt))}
                    />
                  ))}
              </AttentionSection>
            )}

            {(!retention.ok || retention.value.eligible > 0) && (
              <AttentionSection
                id="retention"
                title="Retention reviews due"
                failed={!retention.ok}
                links={[{ href: "/studio/retention?state=eligible", label: "See all" }]}
              >
                {retention.ok &&
                  retention.value.rows.map((row) => (
                    <AttentionRow
                      key={`${row.kind}-${row.id}`}
                      href={`/studio/retention/${row.kind}/${row.id}`}
                      title={row.name}
                      detail={row.kind === "client" ? "Client" : "Contact"}
                      age={dueLabel(new Date(row.dueAt), now)}
                      ageTitle={formatDateTime(new Date(row.dueAt))}
                    />
                  ))}
              </AttentionSection>
            )}

            {(!drift.ok || drift.value.differences.length > 0) && (
              <AttentionSection
                id="export"
                title={
                  drift.ok
                    ? `Public export: ${plural(drift.value.differences.length, "difference", "differences")}`
                    : "Public export"
                }
                failed={!drift.ok}
                links={[{ href: "/studio/systems", label: "Open systems" }]}
              >
                {drift.ok &&
                  drift.value.differences
                    .slice(0, ATTENTION_ROWS)
                    .map((difference) => <AttentionRow key={difference} title={difference} />)}
              </AttentionSection>
            )}
          </div>
        </>
      )}

      <Overview overview={overview} />

      <HealthFooter lines={lines} counts={counts.ok ? counts.value : null} />
    </main>
  );
}

function Overview({ overview }: { overview: Loaded<StatusOverview> }) {
  return (
    <section aria-labelledby="overview-title" className={`${card} mt-8 px-5 py-4`}>
      <h2 id="overview-title" className="text-lg font-semibold">
        Overview
      </h2>
      {overview.ok ? (
        <div className="mt-3 grid gap-6 md:grid-cols-3">
          <StatusBar
            title="Clients"
            noun="clients"
            statuses={CLIENT_STATUSES}
            counts={overview.value.clients}
            hrefFor={(status) => `/studio/clients?status=${status}`}
          />
          <StatusBar
            title="Contracts"
            noun="contracts"
            statuses={CONTRACT_STATUSES}
            counts={overview.value.contracts}
            hrefFor={(status) => `/studio/contracts?status=${status}`}
          />
          <StatusBar title="Projects" noun="projects" statuses={PROJECT_STATUSES} counts={overview.value.projects} />
        </div>
      ) : (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">Could not load</p>
      )}
    </section>
  );
}
