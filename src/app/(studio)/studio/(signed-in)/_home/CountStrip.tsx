import Link from "next/link";
import { card } from "../../_components/ui";

export type Tile = {
  key: string;
  label: string;
  href: string;
  // null when the signal failed to load: the tile shows `!`, never 0 (spec 0012, AC-11).
  count: number | null;
  detail: string;
  dimmed: boolean;
};

const tileLink =
  "block h-full rounded-xl px-4 py-3 hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500 dark:hover:bg-stone-700";

// Four tiles in a fixed order, 2 by 2 on a phone (spec 0012, AC-2).
export default function CountStrip({ tiles }: { tiles: Tile[] }) {
  return (
    <ul aria-label="What needs you" className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((tile) => (
        <li
          key={tile.key}
          data-dimmed={tile.dimmed ? "true" : undefined}
          className={`${card} min-w-0 ${tile.dimmed ? "opacity-60" : ""}`}
        >
          <Link href={tile.href} className={tileLink}>
            <span className="block text-xs font-semibold uppercase tracking-widest text-stone-500">{tile.label}</span>
            <span
              className={`mt-1 block text-3xl font-semibold tabular-nums ${tile.count === null ? "text-red-700 dark:text-red-400" : ""}`}
            >
              {tile.count === null ? "!" : tile.count}
            </span>
            <span className="mt-1 block break-words text-sm text-stone-600 dark:text-stone-400">{tile.detail}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
