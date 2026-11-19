"use client";

import type { Subscription } from "@licitaciones/core/accounts";
import { Field, Input, Select } from "@licitaciones/ui";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-parts";
import { fieldErrors, fieldValue, idleState, type FormState } from "@/lib/form-state";

const STATUS_LABELS: Record<Subscription["status"], string> = {
  active: "Contrato vigente",
  trial: "Prueba",
  paused: "Pausado (sin alertas)",
  cancelled: "Cancelado",
};

/** Renew, change plan or seats, pause or cancel: the commercial terms of one organization. */
export function SubscriptionForm({
  action,
  subscription,
  plans,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  subscription: Subscription;
  plans: { code: string; name: string }[];
}) {
  const [state, formAction] = useActionState(action, idleState);
  const value = (field: string, fallback: string) => fieldValue(state, field) ?? fallback;
  const endsAt = subscription.endsAt.toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="sub-plan" name="planCode" label="Plan" errors={fieldErrors(state, "planCode")}>
          {(control) => (
            <Select
              key={value("planCode", subscription.planCode)}
              {...control}
              defaultValue={value("planCode", subscription.planCode)}
            >
              {plans.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="sub-status" name="status" label="Estado" errors={fieldErrors(state, "status")}>
          {(control) => (
            <Select
              key={value("status", subscription.status)}
              {...control}
              defaultValue={value("status", subscription.status)}
            >
              {Object.entries(STATUS_LABELS).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          id="sub-ends"
          name="endsAt"
          label="Vigente hasta"
          errors={fieldErrors(state, "endsAt")}
        >
          {(control) => <Input {...control} type="date" defaultValue={value("endsAt", endsAt)} />}
        </Field>
        <Field
          id="sub-seats"
          name="maxSeats"
          label="Usuarios incluidos"
          errors={fieldErrors(state, "maxSeats")}
        >
          {(control) => (
            <Input
              {...control}
              type="number"
              min={1}
              max={100}
              defaultValue={value("maxSeats", String(subscription.maxSeats))}
            />
          )}
        </Field>
      </div>
      <div>
        <SubmitButton variant="secondary" pendingLabel="Guardando...">
          Guardar cambios del plan
        </SubmitButton>
      </div>
    </form>
  );
}
