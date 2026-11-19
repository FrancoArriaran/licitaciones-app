"use client";

import type { OrganizationRole } from "@licitaciones/core/accounts";
import { Field, Input, Select } from "@licitaciones/ui";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-parts";
import { fieldErrors, fieldValue, idleState, type FormState } from "@/lib/form-state";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "../labels";
import { InvitationLinkPanel } from "./invitation-link-panel";

export function InviteForm({
  action,
  roles,
  defaultRole,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  roles: readonly OrganizationRole[];
  defaultRole: OrganizationRole;
}) {
  const [state, formAction] = useActionState(action, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === "success" && state.invitationLink ? (
        <InvitationLinkPanel message={state.message} link={state.invitationLink} />
      ) : (
        <FormMessage state={state} />
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field id="invite-email" name="email" label="Correo" errors={fieldErrors(state, "email")}>
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="off"
              placeholder="nombre@empresa.pe"
              defaultValue={fieldValue(state, "email")}
            />
          )}
        </Field>
        <Field
          id="invite-role"
          name="role"
          label="Rol"
          hint={ROLE_DESCRIPTIONS[defaultRole]}
          errors={fieldErrors(state, "role")}
        >
          {(control) => (
            <Select
              key={fieldValue(state, "role") ?? defaultRole}
              {...control}
              defaultValue={fieldValue(state, "role") ?? defaultRole}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div>
        <SubmitButton pendingLabel="Creando invitación...">Crear invitación</SubmitButton>
      </div>
    </form>
  );
}
