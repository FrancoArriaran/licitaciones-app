"use client";

import { Alert, Field, Input } from "@licitaciones/ui";
import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-parts";
import { fieldErrors, fieldValue, idleState } from "@/lib/form-state";
import { requestPasswordReset, setPassword, signIn } from "../actions";

export function LoginForm({ next }: { next: string | undefined }) {
  const [state, action] = useActionState(signIn, idleState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field id="email" label="Correo" errors={fieldErrors(state, "email")}>
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            defaultValue={fieldValue(state, "email")}
          />
        )}
      </Field>
      <Field id="password" label="Contraseña" errors={fieldErrors(state, "password")}>
        {(control) => <Input {...control} type="password" autoComplete="current-password" />}
      </Field>
      <SubmitButton pendingLabel="Ingresando...">Ingresar</SubmitButton>
      <Link href="/recuperar" className="text-primary text-center text-sm hover:underline">
        Olvidé mi contraseña
      </Link>
    </form>
  );
}

export function RequestResetForm() {
  const [state, action] = useActionState(requestPasswordReset, idleState);

  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field id="email" label="Correo de tu cuenta" errors={fieldErrors(state, "email")}>
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            defaultValue={fieldValue(state, "email")}
          />
        )}
      </Field>
      <SubmitButton pendingLabel="Enviando...">Enviar enlace</SubmitButton>
    </form>
  );
}

export function SetPasswordForm({ intent }: { intent: "welcome" | "recovery" }) {
  const [state, action] = useActionState(setPassword.bind(null, intent), idleState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field
        id="password"
        label="Nueva contraseña"
        hint="Mínimo 10 caracteres, con mayúscula, minúscula y número."
        errors={fieldErrors(state, "password")}
      >
        {(control) => <Input {...control} type="password" autoComplete="new-password" />}
      </Field>
      <Field
        id="confirmPassword"
        label="Repite la contraseña"
        errors={fieldErrors(state, "confirmPassword")}
      >
        {(control) => <Input {...control} type="password" autoComplete="new-password" />}
      </Field>
      <SubmitButton pendingLabel="Guardando...">
        {intent === "welcome" ? "Crear contraseña y entrar" : "Guardar contraseña"}
      </SubmitButton>
    </form>
  );
}
