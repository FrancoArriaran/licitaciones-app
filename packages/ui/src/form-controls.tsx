import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

const controlClasses =
  "w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-ring aria-invalid:border-danger disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClasses, "min-h-24 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClasses, "h-10", className)} {...props} />;
}

export interface FieldControlProps {
  id: string;
  name: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
}

/**
 * Label + control + hint + error, wired for screen readers. The control is
 * rendered by the caller with the props this component hands it.
 */
export function Field({
  id,
  name = id,
  label,
  hint,
  errors,
  optional = false,
  children,
}: {
  id: string;
  name?: string;
  label: string;
  hint?: string;
  errors?: readonly string[] | undefined;
  optional?: boolean;
  children: (control: FieldControlProps) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-foreground text-sm font-medium">
        {label}
        {optional && <span className="text-muted font-normal"> (opcional)</span>}
      </label>
      {children({
        id,
        name,
        "aria-invalid": errorId ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint && (
        <p id={hintId} className="text-muted text-xs">
          {hint}
        </p>
      )}
      {errorId && (
        <p id={errorId} className="text-danger text-xs">
          {errors?.join(" ")}
        </p>
      )}
    </div>
  );
}
