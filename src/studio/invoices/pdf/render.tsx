import "server-only";
import "@/studio/marker";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { PDF_FONT_FAMILY, registerPdfFonts } from "@/studio/contracts/pdf/render";
import { PdfRenderFailed } from "@/studio/data/errors";

// Invoice PDFs (spec 0013, PDF rendering): A4, 2 cm margins, the spec 0007 Noto Sans fonts, `Page N of M`, and a
// `DRAFT` watermark for drafts. Every value arrives already formatted; this file only lays it out.

export type InvoicePdfInput = {
  documentTitle: string;
  // The invoice number, or null for a draft (printed as DRAFT).
  number: string | null;
  // Null when no billing profile is saved yet (drafts only; sending requires one).
  business: {
    name: string;
    address: string;
    tin: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  billTo: { clientName: string; contactName: string | null; contactEmail: string | null; address: string | null };
  issueDate: string;
  dueDate: string;
  reference: string;
  currency: string;
  lines: { description: string; quantity: string; unitPrice: string; amount: string }[];
  total: string;
  notes: string | null;
  paymentInstructions: string | null;
  taxNote: string | null;
};

const CM = 28.3465;
const A4_HEIGHT = 841.89;
const BORDER = "#d6d3d1";
const MUTED = "#57534e";

const styles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    lineHeight: 1.4,
    paddingTop: 2 * CM,
    paddingBottom: 2 * CM,
    paddingHorizontal: 2 * CM,
    color: "#1c1917",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 },
  title: { fontSize: 22, fontWeight: "bold" },
  number: { fontSize: 12, fontWeight: "bold" },
  parties: { flexDirection: "row", gap: 24, marginBottom: 16 },
  party: { flex: 1 },
  label: { fontSize: 8, fontWeight: "bold", color: MUTED, textTransform: "uppercase", marginBottom: 3 },
  strong: { fontWeight: "bold" },
  missing: { color: "#b91c1c", fontWeight: "bold" },
  meta: {
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 8,
    marginBottom: 16,
  },
  metaItem: { flex: 1 },
  table: { marginBottom: 12 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: BORDER, paddingVertical: 5 },
  headRow: { flexDirection: "row", borderBottomWidth: 1.5, borderColor: "#78716c", paddingVertical: 5 },
  headCell: { fontSize: 8.5, fontWeight: "bold", color: MUTED },
  description: { flex: 1, paddingRight: 8 },
  qty: { width: 48, textAlign: "right", paddingRight: 8 },
  money: { width: 86, textAlign: "right" },
  moneyGap: { width: 86, textAlign: "right", paddingRight: 8 },
  empty: { paddingVertical: 8, color: MUTED },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  totalLabel: { fontWeight: "bold", marginRight: 16 },
  totalValue: { fontSize: 12, fontWeight: "bold" },
  taxNote: { textAlign: "right", color: MUTED, fontSize: 9, marginTop: 2 },
  block: { marginTop: 14 },
  footer: {
    position: "absolute",
    // Measured from the top: a `bottom` offset is not drawn by this react-pdf version.
    top: A4_HEIGHT - 1.5 * CM,
    left: 2 * CM,
    right: 2 * CM,
  },
  footerText: { textAlign: "center", fontSize: 8.5, color: "#78716c" },
  watermarkBox: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  watermark: { fontSize: 110, fontWeight: "bold", color: "#e7e5e4", transform: "rotate(-45deg)" },
});

function Lines({ values }: { values: (string | null)[] }) {
  return (
    <>
      {values.filter((value): value is string => Boolean(value)).map((value, index) => (
        <Text key={index}>{value}</Text>
      ))}
    </>
  );
}

function Business({ business }: { business: InvoicePdfInput["business"] }) {
  if (!business) {
    return <Text style={styles.missing}>[Missing: billing profile]</Text>;
  }
  return (
    <>
      <Text style={styles.strong}>{business.name}</Text>
      <Lines
        values={[
          business.address,
          business.tin ? `TIN ${business.tin}` : null,
          business.email,
          business.phone,
        ]}
      />
    </>
  );
}

function InvoiceDocument({ input, draft }: { input: InvoicePdfInput; draft: boolean }) {
  return (
    <Document title={input.number ?? `${input.documentTitle} draft`} creator="Studio" producer="Studio">
      <Page size="A4" style={styles.page}>
        {draft && (
          <View fixed style={styles.watermarkBox}>
            <Text style={styles.watermark}>DRAFT</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>{input.documentTitle}</Text>
          <Text style={styles.number}>{input.number ?? "DRAFT"}</Text>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.label}>From</Text>
            <Business business={input.business} />
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>Bill to</Text>
            <Text style={styles.strong}>{input.billTo.clientName}</Text>
            <Lines values={[input.billTo.contactName, input.billTo.contactEmail, input.billTo.address]} />
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Text style={styles.label}>Issue date</Text>
            <Text>{input.issueDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.label}>Due date</Text>
            <Text>{input.dueDate}</Text>
          </View>
          <View style={[styles.metaItem, { flex: 2 }]}>
            <Text style={styles.label}>Reference</Text>
            <Text>{input.reference}</Text>
          </View>
        </View>

        <View style={styles.table}>
          {/* A fixed child repeats at the top of each page the table continues on. */}
          <View fixed style={styles.headRow}>
            <Text style={[styles.headCell, styles.description]}>Description</Text>
            <Text style={[styles.headCell, styles.qty]}>Qty</Text>
            <Text style={[styles.headCell, styles.moneyGap]}>Unit price</Text>
            <Text style={[styles.headCell, styles.money]}>Amount ({input.currency})</Text>
          </View>
          {input.lines.length === 0 && <Text style={styles.empty}>No lines yet.</Text>}
          {input.lines.map((line, index) => (
            <View key={index} style={styles.row} wrap={false}>
              <Text style={styles.description}>{line.description}</Text>
              <Text style={styles.qty}>{line.quantity}</Text>
              <Text style={styles.moneyGap}>{line.unitPrice}</Text>
              <Text style={styles.money}>{line.amount}</Text>
            </View>
          ))}
        </View>

        <View wrap={false}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{input.total}</Text>
          </View>
          {input.taxNote && <Text style={styles.taxNote}>{input.taxNote}</Text>}
        </View>

        {input.notes && (
          <View style={styles.block} wrap={false}>
            <Text style={styles.label}>Notes</Text>
            <Text>{input.notes}</Text>
          </View>
        )}
        {input.paymentInstructions && (
          <View style={styles.block} wrap={false}>
            <Text style={styles.label}>Payment instructions</Text>
            <Text>{input.paymentInstructions}</Text>
          </View>
        )}

        <View fixed style={styles.footer}>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// Throws PdfRenderFailed on any rendering problem; the caller logs only the code.
export async function renderInvoicePdf(input: InvoicePdfInput, opts: { draft: boolean }): Promise<Buffer> {
  registerPdfFonts();
  try {
    return await renderToBuffer(<InvoiceDocument input={input} draft={opts.draft} />);
  } catch {
    throw new PdfRenderFailed();
  }
}
