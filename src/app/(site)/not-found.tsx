import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container flex min-h-screen flex-col items-start justify-center gap-6">
      <h1 className="text-5xl md:text-7xl">Page not found</h1>
      <p className="text-lg text-stone-600 dark:text-stone-400">This page does not exist.</p>
      <Link href="/" className="underline underline-offset-4 hover:text-red-orange-500">
        Back to the home page
      </Link>
    </main>
  );
}
