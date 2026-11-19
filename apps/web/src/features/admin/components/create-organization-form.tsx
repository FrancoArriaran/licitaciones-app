"use client";

import { buttonVariants, Field, Input, Select } from "@licitaciones/ui";
import Link from "next/link";
import { useActionState } from "react";
import { InvitationLinkPanel } from "@/features/accounts/components/invitation-link-panel";
import { FormMessage, SubmitButton } from "@/components/form-parts";
import { fieldErrors, fieldValue, idleState } from "@/lib/form-state";
import { createOrganizationWithOwner } from "../actions";

export function CreateOrganizationForm({
  plans,
  defaultEndsAt,
}: {
  plans: { code: string; name: string; defaultMaxSeats: number }[];
  defaultEndsAt: string;
}) {
  const [state, action] = useActionState(createOrganizationWithOwner, idleState);
  const value = (field: string, fallback = "") => fieldValue(state, field) ?? fallback;

  if (state.status === "success" && state.invitationLink) {
    return (
      <div className="flex flex-col gap-5">
        <InvitationLinkPanel message={state.message} link={state.invitationLink} />
        {state.href && (
          <Link href={state.href} className={buttonVariants({ className: "self-start" })}>
            Ver la empresa
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormMessage state={state} />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold">Empresa</legend>
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Field id="name" label="Razón social" errors={fieldErrors(state, "name")}>
            {(control) => <Input {...control} defaultValue={value("name")} />}
          </Field>
          <Field id="ruc" label="RUC" errors={fieldErrors(state, "ruc")}>
            {(control) => (
              <Input
                {...control}
                inputMode="numeric"
                maxLength={13}
                className="tabular-nums"
                defaultValue={value("ruc")}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold">Plan</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="planCode" label="Plan" errors={fieldErrors(state, "planCode")}>
            {(control) => (
              <Select
                key={value("planCode", "professional")}
                {...control}
                defaultValue={value("planCode", "professional")}
              >
                {plans.map((plan) => (
                  <option key={plan.code} value={plan.code}>
                    {plan.name} (hasta {plan.defaultMaxSeats} usuarios)
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="status" label="Tipo" errors={fieldErrors(state, "status")}>
            {(control) => (
              <Select
                key={value("status", "active")}
                {...control}
                defaultValue={value("status", "active")}
              >
                <option value="active">Contrato</option>
                <option value="trial">Prueba</option>
              </Select>
            )}
          </Field>
          <Field
            id="endsAt"
            label="Vigente hasta"
            hint="Para pruebas, normalmente 14 días."
            errors={fieldErrors(state, "endsAt")}
          >
            {(control) => (
              <Input {...control} type="date" defaultValue={value("endsAt", defaultEndsAt)} />
            )}
          </Field>
          <Field id="maxSeats" label="Usuarios incluidos" errors={fieldErrors(state, "maxSeats")}>
            {(control) => (
              <Input
                {...control}
                type="number"
                min={1}
                max={100}
                defaultValue={value("maxSeats", "3")}
              />
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold">Responsable de la cuenta</legend>
        <Field
          id="ownerEmail"
          label="Correo"
          hint="Te daremos un enlace de invitación para enviárselo."
          errors={fieldErrors(state, "ownerEmail")}
        >
          {(control) => <Input {...control} type="email" defaultValue={value("ownerEmail")} />}
        </Field>
      </fieldset>

      <div>
        <SubmitButton pendingLabel="Creando empresa...">Crear empresa e invitar</SubmitButton>
      </div>
    </form>
  );
}
