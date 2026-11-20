"use client";

import { BID_STATUSES, LOST_REASONS, type BidStatus } from "@licitaciones/core/bids";
import { Field, Input, Select } from "@licitaciones/ui";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-parts";
import { idleState, type FormState } from "@/lib/form-state";
import type { BidDetail } from "../data";
import { BID_STATUS, LOST_REASON } from "../labels";

/** "41000.5" → "41,000.50" for the input, so people see the amount as they'd write it. */
function amountText(value: number | null): string {
  return value === null
    ? ""
    : value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Status, price, result and assignee in one short form. Result fields appear only
 * when they apply, and a status passed in the URL (from the board) is preselected.
 */
export function BidDetailsForm({
  bid,
  team,
  initialStatus,
  action,
}: {
  bid: BidDetail;
  team: { userId: string; email: string }[];
  initialStatus: BidStatus;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const [status, setStatus] = useState<BidStatus>(initialStatus);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field id="status" label="Estado" hint={BID_STATUS[status].hint} errors={errors.status}>
        {(control) => (
          <Select
            {...control}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as BidStatus);
            }}
          >
            {BID_STATUSES.map((value) => (
              <option key={value} value={value}>
                {BID_STATUS[value].label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        id="offeredAmount"
        label="Precio ofertado (S/)"
        hint="Lo que presentaste o piensas presentar."
        errors={errors.offeredAmount}
        optional
      >
        {(control) => (
          <Input
            {...control}
            inputMode="decimal"
            autoComplete="off"
            placeholder="41,000.00"
            defaultValue={values.offeredAmount ?? amountText(bid.offeredAmount)}
          />
        )}
      </Field>

      {status === "won" && (
        <Field
          id="awardedAmount"
          label="Monto adjudicado (S/)"
          hint="El que figura en la buena pro. Lo usamos para tu historial y tus cobranzas."
          errors={errors.awardedAmount}
          optional
        >
          {(control) => (
            <Input
              {...control}
              inputMode="decimal"
              autoComplete="off"
              placeholder="41,000.00"
              defaultValue={
                values.awardedAmount ?? amountText(bid.awardedAmount ?? bid.offeredAmount)
              }
            />
          )}
        </Field>
      )}

      {status === "lost" && (
        <Field
          id="lostReason"
          label="¿Por qué no se ganó?"
          hint="Nos ayuda a mostrarte en qué mejorar."
          errors={errors.lostReason}
          optional
        >
          {(control) => (
            <Select {...control} defaultValue={values.lostReason ?? bid.lostReason ?? ""}>
              <option value="">Sin indicar</option>
              {LOST_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {LOST_REASON[reason]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <Field id="assigneeId" label="Responsable" errors={errors.assigneeId} optional>
        {(control) => (
          <Select {...control} defaultValue={values.assigneeId ?? bid.assigneeId ?? ""}>
            <option value="">Sin asignar</option>
            {team.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.email}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <FormMessage state={state} />
      <SubmitButton pendingLabel="Guardando…">Guardar cambios</SubmitButton>
    </form>
  );
}
