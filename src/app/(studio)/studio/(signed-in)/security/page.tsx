import type { Metadata } from "next";
import { countPasskeys } from "@/studio/auth/passkeys";
import { requireStudioAccess } from "@/studio/guard";
import AddPasskey from "../../_components/AddPasskey";

export const metadata: Metadata = {
  title: "Security · Studio",
  robots: { index: false, follow: false },
};

export default async function SecurityPage() {
  const session = await requireStudioAccess();
  const passkeyCount = await countPasskeys(session.ownerId);

  return (
    <main className="container py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-stone-500">Private</p>
      <h1 className="mt-2 text-5xl md:text-6xl">Security</h1>
      <div className="mt-10 max-w-md">
        <AddPasskey initialCount={passkeyCount} />
      </div>
    </main>
  );
}
