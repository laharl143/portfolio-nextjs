import { twMerge } from "tailwind-merge";
import { brandData } from "../../../utils/data/brand-data";

// The ED Solutions wordmark (spec 0015): text in wide, light Archivo, never an image.
// Sizes step down from the old header name, because the wide cut runs longer: at 375px it must clear the menu button.
// The DOM text stays "ED Solutions" and CSS uppercases it, so screen readers read the name, not "E D".
export default function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={twMerge(
        "text-base font-light uppercase tracking-[0.24em] [font-stretch:125%] md:text-2xl lg:text-4xl",
        className,
      )}
    >
      {brandData.name}
    </span>
  );
}
