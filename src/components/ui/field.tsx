import { useId } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utilities/cn";

/** Props a Field passes to its control so label, hint and error are wired up. */
export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (control: FieldControlProps) => React.ReactNode;
};

/**
 * Label + control + hint + error, with ids connected for screen readers.
 * Works with React Hook Form: `<Field error={errors.x?.message}>{(p) => <Input {...p} {...register("x")} />}</Field>`
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-small font-medium text-fg">
        {label}
        {required && (
          <span className="text-muted" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && (
        <p id={hintId} className="text-meta text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-meta text-signal" role="alert">
          <AlertTriangle aria-hidden className="size-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

const control =
  "w-full rounded-md border border-border-strong bg-surface px-3 text-small text-fg placeholder:text-muted transition-colors hover:border-fg/60 focus-visible:border-accent aria-invalid:border-signal disabled:opacity-50";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(control, "h-10 pr-8", className)} {...props} />;
}
