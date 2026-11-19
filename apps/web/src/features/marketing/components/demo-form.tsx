"use client";

import { Alert, Field, Input, Select, Textarea } from "@licitaciones/ui";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-parts";
import { fieldErrors, fieldValue, idleState } from "@/lib/form-state";
import { submitDemoRequest } from "../actions";
import { Turnstile } from "./turnstile";

export function DemoForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const [state, action] = useActionState(submitDemoRequest, idleState);

  if (state.status === "success") {
    return (
      <Alert tone="success" title="¡Gracias!">
        {state.message}
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fullName" label="Tu nombre" errors={fieldErrors(state, "fullName")}>
          {(control) => (
            <Input {...control} autoComplete="name" defaultValue={fieldValue(state, "fullName")} />
          )}
        </Field>
        <Field id="jobTitle" label="Cargo" optional errors={fieldErrors(state, "jobTitle")}>
          {(control) => (
            <Input
              {...control}
              autoComplete="organization-title"
              defaultValue={fieldValue(state, "jobTitle")}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="companyName" label="Empresa" errors={fieldErrors(state, "companyName")}>
          {(control) => (
            <Input
              {...control}
              autoComplete="organization"
              defaultValue={fieldValue(state, "companyName")}
            />
          )}
        </Field>
        <Field
          id="ruc"
          label="RUC"
          optional
          hint="Lo usamos para preparar la demo con tu historial en SEACE."
          errors={fieldErrors(state, "ruc")}
        >
          {(control) => (
            <Input
              {...control}
              inputMode="numeric"
              maxLength={13}
              defaultValue={fieldValue(state, "ruc")}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
        <Field id="phone" label="Celular (WhatsApp)" errors={fieldErrors(state, "phone")}>
          {(control) => (
            <Input
              {...control}
              type="tel"
              autoComplete="tel"
              placeholder="987 654 321"
              defaultValue={fieldValue(state, "phone")}
            />
          )}
        </Field>
      </div>

      <Field id="sector" label="¿Qué vende tu empresa?" errors={fieldErrors(state, "sector")}>
        {(control) => (
          <Textarea
            {...control}
            placeholder="Por ejemplo: cemento, fierro y agregados para construcción en Arequipa y Puno."
            defaultValue={fieldValue(state, "sector")}
          />
        )}
      </Field>

      <Field
        id="sellsToGovernment"
        label="¿Ya le vendes al Estado?"
        errors={fieldErrors(state, "sellsToGovernment")}
      >
        {(control) => (
          // key: React ignores defaultValue changes on a mounted <select>; remount to keep the submitted choice.
          <Select
            key={fieldValue(state, "sellsToGovernment") ?? ""}
            {...control}
            defaultValue={fieldValue(state, "sellsToGovernment") ?? ""}
          >
            <option value="" disabled>
              Elige una opción
            </option>
            <option value="yes">Sí, ya hemos ganado procesos</option>
            <option value="no">Todavía no</option>
            <option value="not_sure">Lo hemos intentado, sin éxito</option>
          </Select>
        )}
      </Field>

      {/* Honeypot: invisible to people and screen readers; bots tend to fill it. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="website">Sitio web</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <Turnstile siteKey={turnstileSiteKey} resetSignal={state} />

      <SubmitButton pendingLabel="Enviando..." size="lg">
        Solicitar demo
      </SubmitButton>
      <p className="text-muted text-xs">
        Usaremos tus datos solo para coordinar la demo. No compartimos tu información.
      </p>
    </form>
  );
}
