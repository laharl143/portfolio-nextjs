import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container space-y-4 py-10">
      <h1 className="text-3xl">Inquiry not found</h1>
      <Link href="/studio/inquiries" className="underline">
        Back to inquiries
      </Link>
    </main>
  );
}
