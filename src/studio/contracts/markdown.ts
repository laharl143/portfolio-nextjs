// The contract Markdown subset (spec 0007, Markdown subset). A pure module with no "server-only", so the template
// editor's client preview, the contract page, and the PDF renderer all read the same block tree.
//
// Blocks: `#`, `##`, `###` headings; paragraphs (blank line separated, single line breaks kept); `- ` or `* ` bullet
// lists; `1. ` numbered lists; a line of exactly `---` as a page break. Inline: `**bold**`, `*italic*`, `\*` for a
// literal star. A `{{…}}` token is one atomic unit. Anything else is literal text: no HTML, links, or images.
// Placeholders stay as nodes here and are filled by the renderers, so a value is never read as Markdown.

export type Inline =
  | { type: "text"; text: string; bold: boolean; italic: boolean }
  | { type: "placeholder"; name: string; raw: string; bold: boolean; italic: boolean };

export type Line = Inline[];

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; content: Line }
  | { type: "paragraph"; lines: Line[] }
  | { type: "list"; ordered: boolean; start: number; items: Line[] }
  | { type: "pagebreak" };

type Token =
  | { kind: "text"; text: string }
  | { kind: "placeholder"; name: string; raw: string }
  | { kind: "marker"; marker: "**" | "*" };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let text = "";
  const flush = () => {
    if (text) {
      tokens.push({ kind: "text", text });
      text = "";
    }
  };
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const placeholder = /^\{\{([^{}]*)\}\}/.exec(rest);
    if (placeholder) {
      flush();
      tokens.push({ kind: "placeholder", name: placeholder[1].trim(), raw: placeholder[0] });
      i += placeholder[0].length;
    } else if (rest.startsWith("\\*")) {
      text += "*";
      i += 2;
    } else if (rest.startsWith("**")) {
      flush();
      tokens.push({ kind: "marker", marker: "**" });
      i += 2;
    } else if (rest.startsWith("*")) {
      flush();
      tokens.push({ kind: "marker", marker: "*" });
      i += 1;
    } else {
      text += source[i];
      i += 1;
    }
  }
  flush();
  return tokens;
}

// A marker opens only when the same marker appears later on the line; otherwise it is a literal star.
export function parseInline(source: string): Line {
  const tokens = tokenize(source);
  const out: Line = [];
  let bold = false;
  let italic = false;
  const pushText = (value: string) => {
    const last = out[out.length - 1];
    if (last && last.type === "text" && last.bold === bold && last.italic === italic) {
      last.text += value;
    } else {
      out.push({ type: "text", text: value, bold, italic });
    }
  };
  const hasLater = (from: number, marker: "**" | "*") =>
    tokens.slice(from + 1).some((t) => t.kind === "marker" && t.marker === marker);

  tokens.forEach((token, index) => {
    if (token.kind === "text") {
      pushText(token.text);
    } else if (token.kind === "placeholder") {
      out.push({ type: "placeholder", name: token.name, raw: token.raw, bold, italic });
    } else if (token.marker === "**") {
      if (bold) {
        bold = false;
      } else if (hasLater(index, "**")) {
        bold = true;
      } else {
        pushText("**");
      }
    } else if (italic) {
      italic = false;
    } else if (hasLater(index, "*")) {
      italic = true;
    } else {
      pushText("*");
    }
  });
  return out;
}

const HEADING = /^(#{1,3}) +(.*)$/;
const BULLET = /^[-*] +(.*)$/;
const NUMBERED = /^(\d{1,9})\. +(.*)$/;

export function parseMarkdown(body: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: Line[] | null = null;
  let list: Extract<Block, { type: "list" }> | null = null;
  const close = () => {
    paragraph = null;
    list = null;
  };

  for (const rawLine of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) {
      close();
      continue;
    }
    if (line.trim() === "---") {
      close();
      blocks.push({ type: "pagebreak" });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      close();
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, content: parseInline(heading[2]) });
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const content = parseInline(bullet ? bullet[1] : numbered![2]);
      const current = list as Extract<Block, { type: "list" }> | null;
      if (current && current.ordered === ordered) {
        current.items.push(content);
      } else {
        paragraph = null;
        const next: Extract<Block, { type: "list" }> = {
          type: "list",
          ordered,
          start: numbered ? Number(numbered[1]) : 1,
          items: [content],
        };
        blocks.push(next);
        list = next;
      }
      continue;
    }
    list = null;
    const current = paragraph as Line[] | null;
    if (current) {
      current.push(parseInline(line));
    } else {
      const lines = [parseInline(line)];
      blocks.push({ type: "paragraph", lines });
      paragraph = lines;
    }
  }
  return blocks;
}
