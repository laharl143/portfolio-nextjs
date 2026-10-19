import "server-only";
import "@/studio/marker";

const MAX_LENGTH = 60;

// Checked in order: Edge and Opera also say "Chrome", and Chrome also says "Safari".
const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Safari\//, "Safari"],
];

// iOS before macOS: iPads report "Mac OS X" too, and Android before Linux.
const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux|X11/, "Linux"],
];

function firstMatch(userAgent: string, table: [RegExp, string][]): string | null {
  return table.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
}

// A short "Chrome on Windows" style label (spec 0005). Never an IP address, never the raw user agent.
export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const browser = firstMatch(ua, BROWSERS) ?? "Unknown browser";
  const system = firstMatch(ua, SYSTEMS) ?? "unknown OS";
  return `${browser} on ${system}`.slice(0, MAX_LENGTH);
}
