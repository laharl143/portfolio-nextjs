"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="container space-y-4 py-10">
      <h1 className="text-3xl">Inquiries are unavailable</h1>
      <p>
        No change has been confirmed. Reload before trying a mutation again.
      </p>
      <button onClick={reset} className="underline">
        Try again
      </button>
    </main>
  );
}
