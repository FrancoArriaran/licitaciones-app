"use client";

import { Field, Input, Select } from "@licitaciones/ui";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/form-parts";
import { fieldErrors, idleState } from "@/lib/form-state";
import { saveNotificationSettings } from "../actions";
import type { NotificationSettingsView } from "../data";

const HOURS = Array.from({ length: 16 }, (_, index) => index + 5);

export function NotificationSettingsForm({ settings }: { settings: NotificationSettingsView }) {
  const [state, action] = useActionState(saveNotificationSettings, idleState);
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings.whatsappEnabled);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />

      <div className="flex items-start gap-3">
        <input
          id="emailEnabled"
          type="checkbox"
          name="emailEnabled"
          defaultChecked={settings.emailEnabled}
          aria-describedby="emailEnabled-hint"
          className="accent-primary mt-1 size-4"
        />
        <div>
          <label htmlFor="emailEnabled" className="font-medium">
            Correo
          </label>
          <p id="emailEnabled-hint" className="text-muted text-sm">
            El detalle de cada oportunidad, a los correos de tu equipo.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <input
            id="whatsappEnabled"
            type="checkbox"
            name="whatsappEnabled"
            checked={whatsappEnabled}
            onChange={(event) => {
              setWhatsappEnabled(event.target.checked);
            }}
            aria-describedby="whatsappEnabled-hint"
            className="accent-primary mt-1 size-4"
          />
          <div>
            <label htmlFor="whatsappEnabled" className="font-medium">
              WhatsApp
            </label>
            <p id="whatsappEnabled-hint" className="text-muted text-sm">
              Un resumen corto con un enlace a tus oportunidades.
            </p>
          </div>
        </div>

        {whatsappEnabled && (
          <div className="flex flex-col gap-4 pl-7">
            <Field id="whatsappPhone" label="Celular" errors={fieldErrors(state, "whatsappPhone")}>
              {(control) => (
                <Input
                  {...control}
                  type="tel"
                  autoComplete="tel"
                  placeholder="987 654 321"
                  defaultValue={settings.whatsappPhone?.replace(/^\+51/, "") ?? ""}
                  className="max-w-xs"
                />
              )}
            </Field>
            <div>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="whatsappConsent"
                  defaultChecked={settings.whatsappEnabled}
                  aria-describedby={
                    fieldErrors(state, "whatsappConsent") ? "consent-error" : undefined
                  }
                  className="accent-primary mt-0.5 size-4"
                />
                <span>
                  Autorizo a Licitaciones a enviarme por WhatsApp las oportunidades de mis perfiles
                  de alerta. Puedo darme de baja cuando quiera desde esta página.
                </span>
              </label>
              {fieldErrors(state, "whatsappConsent") && (
                <p id="consent-error" className="text-danger mt-1 pl-7 text-xs">
                  {fieldErrors(state, "whatsappConsent")?.join(" ")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <Field
        id="digestHour"
        label="Hora del resumen diario"
        errors={fieldErrors(state, "digestHour")}
      >
        {(control) => (
          <Select {...control} defaultValue={String(settings.digestHour)} className="max-w-xs">
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {hour}:00
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div>
        <SubmitButton variant="secondary" pendingLabel="Guardando...">
          Guardar preferencias
        </SubmitButton>
      </div>
    </form>
  );
}
