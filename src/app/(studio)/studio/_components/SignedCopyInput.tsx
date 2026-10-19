"use client";

import { useState } from "react";
import { fieldError, hint, label } from "./ui";

const MAX_BYTES = 4 * 1024 * 1024;
const FILE_ERROR = "Choose a PDF of 4 MB or less.";

// The signed copy file input (spec 0007, AC-8). The size is checked here first, because Vercel rejects a request
// over about 4.5 MB before the server action runs; the server checks size and magic bytes again.
export default function SignedCopyInput({
  id,
  serverError,
  required = false,
  onTooBig,
}: {
  id: string;
  serverError?: string;
  required?: boolean;
  onTooBig: (tooBig: boolean) => void;
}) {
  const [tooBig, setTooBig] = useState(false);
  const error = tooBig ? FILE_ERROR : serverError;
  return (
    <div>
      <label htmlFor={id} className={label}>
        Signed copy{!required && <span className="font-normal text-stone-500 dark:text-stone-400"> (optional)</span>}
      </label>
      <input
        id={id}
        name="signedCopy"
        type="file"
        accept="application/pdf,.pdf"
        required={required}
        onChange={(event) => {
          const file = event.target.files?.[0];
          const next = Boolean(file && file.size > MAX_BYTES);
          setTooBig(next);
          onTooBig(next);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-stone-400 file:bg-transparent file:px-3 file:py-2 file:text-sm file:font-semibold dark:file:border-stone-600 dark:file:text-stone-100"
      />
      <p id={`${id}-hint`} className={hint}>
        A PDF of 4 MB or less.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className={fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}
