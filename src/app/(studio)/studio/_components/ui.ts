// Shared studio screen styles (spec 0006). Tailwind palette classes only, light and dark.

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-200 dark:focus-visible:ring-offset-stone-900";

export const card = "rounded-xl border border-stone-300 bg-stone-100 dark:border-stone-700 dark:bg-stone-800";

export const label = "text-sm font-semibold";

const fieldBase =
  "mt-1.5 block w-full rounded-lg border border-stone-400 bg-white text-sm text-stone-900 aria-[invalid=true]:border-red-600 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:aria-[invalid=true]:border-red-400";

export const input = `${fieldBase} h-11 px-3 ${focusRing}`;

export const textarea = `${fieldBase} min-h-28 px-3 py-2 ${focusRing}`;

export const fieldError = "mt-1 text-sm text-red-700 dark:text-red-400";

export const hint = "mt-1 text-xs text-stone-500 dark:text-stone-400";

const buttonBase = `inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const primaryButton = `${buttonBase} bg-stone-900 text-stone-100 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200`;

export const secondaryButton = `${buttonBase} border border-stone-400 hover:bg-stone-300 dark:border-stone-600 dark:hover:bg-stone-700`;

export const dangerButton = `${buttonBase} border border-red-700 text-red-700 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950`;

export const dangerSolidButton = `${buttonBase} bg-red-700 text-white hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500`;

export const textLink = `rounded font-semibold underline underline-offset-4 hover:text-red-orange-500 ${focusRing}`;

export const alertBox =
  "rounded-lg border border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500 dark:border-red-400 dark:bg-red-950 dark:text-red-100";

export const pageEyebrow = "text-sm font-semibold uppercase tracking-widest text-stone-500";
