import Link from "next/link";
import { pageEyebrow, textLink } from "./ui";

// The frame around every client tracking form page (spec 0006): a back link, an eyebrow, and the title.
export default function FormPage({
  backHref,
  backLabel,
  eyebrow,
  title,
  children,
}: {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="container py-12 md:py-16">
      <Link href={backHref} className={`${textLink} text-sm`}>
        ← {backLabel}
      </Link>
      <p className={`${pageEyebrow} mt-6`}>{eyebrow}</p>
      <h1 className="mb-8 mt-2 break-words text-4xl md:text-5xl">{title}</h1>
      {children}
    </main>
  );
}
