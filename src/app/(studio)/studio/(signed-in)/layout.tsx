import Link from "next/link";
import { signOut, signOutEverywhere } from "@/studio/auth/actions";
import { getOwnerDisplayName } from "@/studio/auth/owner";
import { requireStudioAccess } from "@/studio/guard";
import PendingButton from "../_components/PendingButton";

const navLink =
  "rounded-md px-3 py-2 text-sm font-semibold hover:bg-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500 dark:hover:bg-stone-800";
const headerButton =
  "rounded-md border border-stone-400 px-3 py-2 text-sm font-semibold hover:bg-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500 disabled:opacity-60 dark:border-stone-600 dark:hover:bg-stone-800";

// Every signed in studio page renders inside this guard (spec 0005). Pages and actions still guard themselves.
export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStudioAccess();
  const displayName = await getOwnerDisplayName(session.ownerId);

  return (
    <>
      <header className="border-b border-stone-300 dark:border-stone-800">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-semibold uppercase tracking-widest text-stone-500">
              {displayName ?? "Studio"}
            </span>
            <nav aria-label="Studio" className="flex flex-wrap gap-1">
              <Link href="/studio" className={navLink}>
                Studio
              </Link>
              <Link href="/studio/clients" className={navLink}>
                Clients
              </Link>
              <Link href="/studio/contracts" className={navLink}>
                Contracts
              </Link>
              <Link href="/studio/inquiries" className={navLink}>
                Inquiries
              </Link>
              <Link href="/studio/retention" className={navLink}>
                Retention
              </Link>
              <Link href="/studio/templates" className={navLink}>
                Templates
              </Link>
              <Link href="/studio/systems" className={navLink}>
                Systems
              </Link>
              <Link href="/studio/security" className={navLink}>
                Security
              </Link>
            </nav>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={signOut}>
              <PendingButton className={headerButton}>Sign out</PendingButton>
            </form>
            <form action={signOutEverywhere}>
              <PendingButton className={headerButton}>Sign out everywhere</PendingButton>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
