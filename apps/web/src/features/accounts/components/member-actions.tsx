"use client";

import { Alert, Button } from "@licitaciones/ui";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/form-parts";
import { idleState, type FormState } from "@/lib/form-state";
import { InvitationLinkPanel } from "./invitation-link-panel";

type MemberAction = (previous: FormState, formData: FormData) => Promise<FormState>;

/** Renew a pending invitation or remove someone, with an inline confirmation step. */
export function MemberActions({
  userId,
  email,
  pending,
  renewAction,
  removeAction,
}: {
  userId: string;
  email: string;
  pending: boolean;
  renewAction: MemberAction;
  removeAction: MemberAction;
}) {
  const [renewState, renew] = useActionState(renewAction, idleState);
  const [removeState, remove] = useActionState(removeAction, idleState);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {pending && !confirming && (
          <form action={renew}>
            <input type="hidden" name="userId" value={userId} />
            <SubmitButton variant="ghost" size="sm" pendingLabel="Generando...">
              Nuevo enlace
            </SubmitButton>
          </form>
        )}
        {confirming ? (
          <form action={remove} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="userId" value={userId} />
            <span className="text-sm">¿Quitar a {email}?</span>
            <SubmitButton variant="danger" size="sm" pendingLabel="Quitando...">
              Sí, quitar
            </SubmitButton>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Cancelar
            </Button>
          </form>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger"
            onClick={() => {
              setConfirming(true);
            }}
          >
            {pending ? "Cancelar invitación" : "Quitar"}
          </Button>
        )}
      </div>
      {renewState.status === "success" && renewState.invitationLink && (
        <div className="basis-full">
          <InvitationLinkPanel message={renewState.message} link={renewState.invitationLink} />
        </div>
      )}
      {renewState.status === "error" && (
        <Alert tone="error" className="basis-full">
          {renewState.message}
        </Alert>
      )}
      {removeState.status === "error" && (
        <Alert tone="error" className="basis-full">
          {removeState.message}
        </Alert>
      )}
    </>
  );
}
