import { cn } from "@licitaciones/ui";

/**
 * Hero illustration: a SEACE-style ficha as a client sees it. Fictitious data,
 * labeled as such. The animation classes live in app/globals.css.
 */

const STAGES = [
  { label: "Convocatoria", date: "10 nov", state: "done" },
  { label: "Consultas", date: "14 nov", state: "done" },
  { label: "Ofertas", date: "20 nov", state: "next" },
  { label: "Buena pro", date: "24 nov", state: "future" },
] as const;

export function OpportunityPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-[30rem] sm:pt-14">
      <div
        className="anim-notice border-border bg-surface relative z-10 mb-3 ml-auto flex max-w-[17rem] items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-lg shadow-black/5 sm:absolute sm:top-0 sm:-right-4 sm:mb-0"
        aria-hidden="true"
      >
        <span className="bg-success mt-1.5 size-2 shrink-0 rounded-full" />
        <p className="text-[0.8125rem] leading-snug">
          <span className="text-muted">WhatsApp, 7:00</span>
          <br />
          Hoy encontramos 4 oportunidades para tu empresa.
        </p>
      </div>

      <div className="border-border bg-surface rounded-2xl border shadow-[0_1px_2px_rgba(20,32,27,0.04),0_12px_32px_-12px_rgba(20,32,27,0.18)]">
        <div className="border-border text-muted flex items-center justify-between gap-4 border-b px-6 py-3.5 text-[0.8125rem]">
          <span>Adjudicación simplificada</span>
          <span className="tabular-nums">AS-SM-12-2026</span>
        </div>

        <div className="px-6 pt-5">
          <p className="font-display text-xl leading-snug font-semibold text-pretty">
            Adquisición de cemento portland tipo I para pistas y veredas
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted">Entidad</dt>
            <dt className="text-muted">Valor referencial</dt>
            <dd>Municipalidad distrital, Arequipa</dd>
            <dd className="font-medium tabular-nums">S/ 45,000.00</dd>
          </dl>
        </div>

        <div className="px-6 pt-6 pb-6">
          <p className="text-sm font-medium">Cronograma</p>
          <ol className="relative mt-4 grid grid-cols-4 text-center">
            <span
              aria-hidden="true"
              className="bg-border absolute top-[5px] right-[12.5%] left-[12.5%] h-0.5 rounded-full"
            />
            <span
              aria-hidden="true"
              className="anim-schedule bg-primary absolute top-[5px] left-[12.5%] h-0.5 w-[37.5%] rounded-full"
            />
            <span
              aria-hidden="true"
              className="bg-warning absolute top-0 left-1/2 size-3 -translate-x-1/2 rounded-full ring-4 ring-[color-mix(in_srgb,var(--warning)_18%,transparent)]"
            />
            {STAGES.map((stage) => (
              <li key={stage.label} className="relative flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative size-3 rounded-full border-2",
                    stage.state === "done"
                      ? "border-primary bg-primary"
                      : "border-border bg-surface",
                  )}
                />
                <span className="mt-2.5 text-xs font-medium">{stage.label}</span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    stage.state === "next" ? "text-warning font-medium" : "text-muted",
                  )}
                >
                  {stage.date}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-warning mt-4 text-[0.8125rem] font-medium">
            Hoy, 17 nov: quedan 3 días para presentar tu oferta.
          </p>
        </div>

        <div className="border-border bg-surface-muted/70 flex items-center justify-between gap-5 rounded-b-2xl border-t px-6 py-5">
          <div className="min-w-0">
            <p className="text-sm font-medium">Última compra similar</p>
            <p className="text-muted mt-1 text-[0.8125rem] leading-relaxed">
              1,200 bolsas del mismo cemento, marzo de 2026. Ganó Comercial Ejemplo SAC entre 4
              postores.
            </p>
          </div>
          <div
            className={cn(
              "anim-seal border-seal text-seal shrink-0 -rotate-[4deg] rounded-md border-2 px-3 py-2 text-center",
              "bg-[color-mix(in_srgb,var(--seal)_5%,transparent)]",
            )}
          >
            <p className="text-[0.6875rem] leading-none font-medium">Adjudicado a</p>
            <p className="font-display mt-1 text-2xl leading-none font-semibold tabular-nums">
              S/ 27.90
            </p>
            <p className="mt-1 text-[0.6875rem] leading-none">por bolsa</p>
          </div>
        </div>
      </div>

      <figcaption className="text-muted mt-3 text-center text-xs">
        Ejemplo ilustrativo con datos ficticios.
      </figcaption>
    </figure>
  );
}
