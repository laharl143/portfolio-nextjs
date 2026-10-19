"use client";

import { useFormStatus } from "react-dom";

// A form submit button that disables itself while its server action runs.
export default function PendingButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className}>
      {children}
    </button>
  );
}
