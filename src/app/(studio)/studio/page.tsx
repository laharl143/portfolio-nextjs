import { requireStudioAccess } from "@/studio/guard";

export default async function StudioPage() {
  await requireStudioAccess();

  return (
    <main className="container py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-stone-500">Private</p>
      <h1 className="mt-2 text-5xl md:text-6xl">Studio</h1>
    </main>
  );
}
