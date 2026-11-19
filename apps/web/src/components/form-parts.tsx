"use client";

import { Alert, Button, type ButtonProps } from "@licitaciones/ui";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/form-state";

export function SubmitButton({
  children,
  pendingLabel,
  disabled = false,
  ...props
}: ButtonProps & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      {...props}
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Form-level outcome. Field errors are rendered next to each field by <Field>. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "error") return <Alert tone="error">{state.message}</Alert>;
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;
  return null;
}
