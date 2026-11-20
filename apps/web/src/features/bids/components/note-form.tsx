"use client";

import { Textarea } from "@licitaciones/ui";
import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/form-parts";
import { idleState, type FormState } from "@/lib/form-state";

/** Short notes on the timeline. Clears itself after saving; Ctrl/⌘+Enter sends. */
export function NoteForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") form.current?.reset();
  }, [state]);

  const error = state.status === "error" ? state.message : null;

  return (
    <form ref={form} action={formAction} className="flex flex-col gap-2">
      <label htmlFor="note" className="sr-only">
        Nueva nota
      </label>
      <Textarea
        id="note"
        name="text"
        rows={2}
        maxLength={2000}
        placeholder="Agrega una nota para tu equipo: una llamada, un acuerdo, algo que revisar…"
        defaultValue={state.status === "error" ? (state.values.text ?? "") : ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "note-error" : undefined}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            form.current?.requestSubmit();
          }
        }}
        className="min-h-16"
      />
      <div className="flex items-center justify-between gap-3">
        {error ? (
          <p id="note-error" role="alert" className="text-danger text-xs">
            {error}
          </p>
        ) : (
          <span />
        )}
        <SubmitButton size="sm" variant="secondary" pendingLabel="Guardando…">
          Agregar nota
        </SubmitButton>
      </div>
    </form>
  );
}
