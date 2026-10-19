import { fieldError, hint as hintClass, input, label as labelClass, textarea } from "./ui";

// Labelled form fields with their error tied by aria-describedby (spec 0006, AC-12). No hooks, so client forms
// and server pages can both render them.

type Common = {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

function describedBy(name: string, error?: string, hint?: string): string | undefined {
  const ids = [error ? `${name}-error` : "", hint ? `${name}-hint` : ""].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function Label({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={name} className={labelClass}>
      {label}
      {!required && <span className="font-normal text-stone-500 dark:text-stone-400"> (optional)</span>}
    </label>
  );
}

function Extras({ name, error, hint }: { name: string; error?: string; hint?: string }) {
  return (
    <>
      {hint && (
        <p id={`${name}-hint`} className={hintClass}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className={fieldError}>
          {error}
        </p>
      )}
    </>
  );
}

export function TextField({
  name,
  label,
  error,
  hint,
  required,
  defaultValue,
  type = "text",
  maxLength,
  autoComplete = "off",
  inputMode,
}: Common & {
  defaultValue: string;
  type?: string;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <Label name={name} label={label} required={required} />
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={input}
      />
      <Extras name={name} error={error} hint={hint} />
    </div>
  );
}

export function TextAreaField({
  name,
  label,
  error,
  hint,
  required,
  defaultValue,
  maxLength,
  rows = 4,
}: Common & { defaultValue: string; maxLength?: number; rows?: number }) {
  return (
    <div>
      <Label name={name} label={label} required={required} />
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={textarea}
      />
      <Extras name={name} error={error} hint={hint} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  error,
  hint,
  required,
  defaultValue,
  options,
}: Common & { defaultValue: string; options: { value: string; label: string }[] }) {
  return (
    <div>
      <Label name={name} label={label} required={required} />
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={input}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Extras name={name} error={error} hint={hint} />
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  error,
  defaultChecked,
}: Omit<Common, "required" | "hint"> & { defaultChecked: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          id={name}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className="size-5 rounded border-stone-400 accent-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-orange-500 dark:accent-stone-100"
        />
        <label htmlFor={name} className={labelClass}>
          {label}
        </label>
      </div>
      <Extras name={name} error={error} />
    </div>
  );
}
