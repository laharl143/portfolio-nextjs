import { parseMarkdown, type Block, type Line } from "@/studio/contracts/markdown";
import {
  cleanValue,
  isPlaceholderName,
  placeholderLabel,
  type PlaceholderValues,
} from "@/studio/contracts/placeholders";

// The formatted preview of a template or contract body (spec 0007, Markdown subset). The parsed block tree renders
// as React elements, never as HTML strings. Without `values` (the template editor) each placeholder shows as a chip
// with its label; with `values` (the contract page) it shows the filled value, or a highlighted "Missing: <label>".
// No hooks, so server pages and the client editor both render it.

const chip =
  "mx-0.5 inline-flex rounded bg-sky-100 px-1.5 text-[0.85em] font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-200";
const missing =
  "mx-0.5 inline-flex rounded bg-amber-100 px-1.5 text-[0.85em] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200";

function InlineLine({ line, values }: { line: Line; values?: PlaceholderValues }) {
  return (
    <>
      {line.map((node, index) => {
        let content: React.ReactNode;
        if (node.type === "text") {
          content = node.text;
        } else if (!isPlaceholderName(node.name)) {
          content = node.raw;
        } else if (!values) {
          content = <span className={chip}>{placeholderLabel(node.name)}</span>;
        } else {
          const value = cleanValue(values[node.name]);
          content = value ?? <mark className={missing}>Missing: {placeholderLabel(node.name)}</mark>;
        }
        if (node.bold && node.italic) {
          content = (
            <strong>
              <em>{content}</em>
            </strong>
          );
        } else if (node.bold) {
          content = <strong>{content}</strong>;
        } else if (node.italic) {
          content = <em>{content}</em>;
        }
        return <span key={index}>{content}</span>;
      })}
    </>
  );
}

function BlockView({ block, values }: { block: Block; values?: PlaceholderValues }) {
  switch (block.type) {
    case "pagebreak":
      return (
        <div role="separator" aria-label="Page break" className="my-6 flex items-center gap-3 text-xs text-stone-500">
          <span className="h-px flex-1 border-t border-dashed border-stone-400 dark:border-stone-600" />
          Page break
          <span className="h-px flex-1 border-t border-dashed border-stone-400 dark:border-stone-600" />
        </div>
      );
    case "heading": {
      const Tag = (`h${block.level + 2}` as "h3" | "h4" | "h5");
      const size = block.level === 1 ? "text-xl" : block.level === 2 ? "text-lg" : "text-base";
      return (
        <Tag className={`${size} mb-2 mt-4 font-semibold first:mt-0`}>
          <InlineLine line={block.content} values={values} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="mb-3">
          {block.lines.map((line, index) => (
            <span key={index}>
              {index > 0 && <br />}
              <InlineLine line={line} values={values} />
            </span>
          ))}
        </p>
      );
    case "list": {
      const items = block.items.map((item, index) => (
        <li key={index}>
          <InlineLine line={item} values={values} />
        </li>
      ));
      return block.ordered ? (
        <ol start={block.start} className="mb-3 list-decimal space-y-1 pl-6">
          {items}
        </ol>
      ) : (
        <ul className="mb-3 list-disc space-y-1 pl-6">{items}</ul>
      );
    }
  }
}

export default function ContractBody({ body, values }: { body: string; values?: PlaceholderValues }) {
  const blocks = parseMarkdown(body);
  if (blocks.length === 0) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">No text yet.</p>;
  }
  return (
    <div className="break-words text-sm leading-relaxed">
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} values={values} />
      ))}
    </div>
  );
}
