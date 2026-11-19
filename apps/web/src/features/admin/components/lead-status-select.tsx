"use client";

import type { LeadStatus } from "@licitaciones/core/marketing";
import { Select } from "@licitaciones/ui";
import { useActionState, useRef } from "react";
import { idleState } from "@/lib/form-state";
import { updateLeadStatus } from "../actions";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  demo_scheduled: "Demo agendada",
  won: "Cliente",
  lost: "Descartado",
};

/** Changing the option saves immediately; errors show under the control. */
export function LeadStatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(updateLeadStatus, idleState);

  return (
    <form ref={form} action={action} className="flex flex-col gap-1">
      <input type="hidden" name="leadId" value={leadId} />
      <Select
        name="status"
        defaultValue={status}
        aria-label="Estado de la solicitud"
        disabled={pending}
        className="h-9 min-w-36"
        onChange={() => form.current?.requestSubmit()}
      >
        {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      {state.status === "error" && <span className="text-danger text-xs">{state.message}</span>}
    </form>
  );
}
