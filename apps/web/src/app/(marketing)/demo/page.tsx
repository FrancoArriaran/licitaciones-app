import { Card } from "@licitaciones/ui";
import type { Metadata } from "next";
import { DemoForm } from "@/features/marketing/components/demo-form";
import { containerClass } from "@/features/marketing/components/section";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Solicitar demo",
  description: "Agenda una demo de 20 minutos con las oportunidades reales de tu empresa en SEACE.",
};

const NEXT_STEPS = [
  "Te escribimos en menos de un día hábil para elegir un horario.",
  "Preparamos la demo con tu RUC: lo que has ganado y lo que te habría llegado el último mes.",
  "En 20 minutos ves la plataforma con tus datos. Si te sirve, activamos tu cuenta ese mismo día.",
];

export default function DemoPage() {
  return (
    <div
      className={`${containerClass} grid gap-12 py-14 md:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16`}
    >
      <div className="lg:pt-2">
        <h1 className="font-display text-[2.25rem] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[2.75rem]">
          Solicita una demo
        </h1>
        <p className="text-muted mt-4 text-lg leading-relaxed">
          Te mostramos la plataforma con las licitaciones reales de tu rubro. Sin compromiso.
        </p>
        <h2 className="mt-10 font-semibold">Qué pasa después</h2>
        <ol className="mt-5 flex flex-col gap-5">
          {NEXT_STEPS.map((step, index) => (
            <li key={step} className="flex gap-4">
              <span
                aria-hidden="true"
                className="border-primary text-primary grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold tabular-nums"
              >
                {index + 1}
              </span>
              <span className="text-muted leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <Card className="p-6 sm:p-8">
        <DemoForm turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
      </Card>
    </div>
  );
}
