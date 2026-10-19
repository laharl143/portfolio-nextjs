import "server-only";
import "@/studio/marker";
import { existsSync } from "node:fs";
import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { PdfRenderFailed } from "@/studio/data/errors";
import { parseMarkdown, type Block, type Line } from "../markdown";
import { cleanValue, isPlaceholderName, placeholderLabel, type PlaceholderValues } from "../placeholders";

// Contract PDFs (spec 0007, PDF rendering): A4, 2 cm margins, bundled Noto Sans, `Page N of M`, and an optional
// watermark. Rendered in Node by @react-pdf/renderer, never in the browser.

export type Watermark = "DRAFT" | "NOT THE SENT COPY";

export type ContractPdfInput = {
  title: string;
  body: string;
  values: PlaceholderValues;
};

const FAMILY = "Noto Sans";
const FONT_DIR = path.join(process.cwd(), "src", "studio", "contracts", "pdf", "fonts");
const FONT_FILES = [
  { file: "NotoSans-Regular.ttf", fontWeight: "normal", fontStyle: "normal" },
  { file: "NotoSans-Bold.ttf", fontWeight: "bold", fontStyle: "normal" },
  { file: "NotoSans-Italic.ttf", fontWeight: "normal", fontStyle: "italic" },
  { file: "NotoSans-BoldItalic.ttf", fontWeight: "bold", fontStyle: "italic" },
] as const;

let fontsRegistered = false;

// Once per process, by absolute path. A missing file fails loudly instead of falling back to Helvetica.
function registerFonts() {
  if (fontsRegistered) {
    return;
  }
  const fonts = FONT_FILES.map((font) => ({ ...font, src: path.join(FONT_DIR, font.file) }));
  if (!fonts.every((font) => existsSync(font.src))) {
    throw new PdfRenderFailed();
  }
  Font.register({
    family: FAMILY,
    fonts: fonts.map(({ src, fontWeight, fontStyle }) => ({ src, fontWeight, fontStyle })),
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

const CM = 28.3465;
const A4_HEIGHT = 841.89;

const styles = StyleSheet.create({
  page: {
    fontFamily: FAMILY,
    fontSize: 10.5,
    lineHeight: 1.45,
    paddingTop: 2 * CM,
    paddingBottom: 2 * CM,
    paddingHorizontal: 2 * CM,
    color: "#1c1917",
  },
  h1: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  h2: { fontSize: 14, fontWeight: "bold", marginTop: 6, marginBottom: 6 },
  h3: { fontSize: 12, fontWeight: "bold", marginTop: 4, marginBottom: 4 },
  paragraph: { marginBottom: 8 },
  list: { marginBottom: 8 },
  item: { flexDirection: "row", marginBottom: 2 },
  marker: { width: 18 },
  itemText: { flex: 1 },
  missing: { color: "#b91c1c", fontWeight: "bold" },
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
  watermark: {
    fontWeight: "bold",
    color: "#e7e5e4",
    transform: "rotate(-45deg)",
  },
});

// Only marked text sets a weight or style, so plain text inherits its block's (a heading stays bold).
function fontStyleOf(bold: boolean, italic: boolean) {
  return {
    ...(bold ? { fontWeight: "bold" as const } : {}),
    ...(italic ? { fontStyle: "italic" as const } : {}),
  };
}

// Placeholders are filled here, after parsing, so a value is plain text and never Markdown.
function renderLine(line: Line, values: PlaceholderValues, keyPrefix: string) {
  return line.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    const style = fontStyleOf(node.bold, node.italic);
    if (node.type === "text") {
      return (
        <Text key={key} style={style}>
          {node.text}
        </Text>
      );
    }
    if (!isPlaceholderName(node.name)) {
      return (
        <Text key={key} style={style}>
          {node.raw}
        </Text>
      );
    }
    const value = cleanValue(values[node.name]);
    if (value === null) {
      return (
        <Text key={key} style={styles.missing}>
          [Missing: {placeholderLabel(node.name)}]
        </Text>
      );
    }
    return (
      <Text key={key} style={style}>
        {value}
      </Text>
    );
  });
}

function renderBlock(block: Block, values: PlaceholderValues, index: number) {
  const key = `b${index}`;
  switch (block.type) {
    case "pagebreak":
      return <View key={key} break />;
    case "heading":
      return (
        <Text key={key} style={styles[`h${block.level}`]} minPresenceAhead={40}>
          {renderLine(block.content, values, key)}
        </Text>
      );
    case "paragraph":
      return (
        <Text key={key} style={styles.paragraph}>
          {block.lines.flatMap((line, lineIndex) => [
            ...(lineIndex > 0 ? ["\n"] : []),
            ...renderLine(line, values, `${key}-${lineIndex}`),
          ])}
        </Text>
      );
    case "list":
      return (
        <View key={key} style={styles.list}>
          {block.items.map((item, itemIndex) => (
            <View key={`${key}-${itemIndex}`} style={styles.item} wrap={false}>
              <Text style={styles.marker}>{block.ordered ? `${block.start + itemIndex}.` : "•"}</Text>
              <Text style={styles.itemText}>{renderLine(item, values, `${key}-${itemIndex}`)}</Text>
            </View>
          ))}
        </View>
      );
  }
}

function ContractDocument({ input, watermark }: { input: ContractPdfInput; watermark: Watermark | null }) {
  const blocks = parseMarkdown(input.body);
  return (
    <Document title={input.title} creator="Studio" producer="Studio">
      <Page size="A4" style={styles.page}>
        {watermark && (
          <View fixed style={styles.watermarkBox}>
            {/* The long watermark is smaller so it stays on one line once rotated. */}
            <Text style={[styles.watermark, { fontSize: watermark === "DRAFT" ? 72 : 44 }]}>{watermark}</Text>
          </View>
        )}
        {blocks.map((block, index) => renderBlock(block, input.values, index))}
        <View fixed style={styles.footer}>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// Throws PdfRenderFailed on any rendering problem; the caller logs only the code.
export async function renderContractPdf(input: ContractPdfInput, opts: { watermark: Watermark | null }): Promise<Buffer> {
  registerFonts();
  try {
    return await renderToBuffer(<ContractDocument input={input} watermark={opts.watermark} />);
  } catch {
    throw new PdfRenderFailed();
  }
}
