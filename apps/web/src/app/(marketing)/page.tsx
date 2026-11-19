import { Badge, buttonVariants } from "@licitaciones/ui";
import Link from "next/link";
import { SectionLink } from "@/components/section-link";
import { DigestPreview } from "@/features/marketing/components/digest-preview";
import { OpportunityPreview } from "@/features/marketing/components/opportunity-preview";
import { containerClass, Section, SectionHeading } from "@/features/marketing/components/section";

const STEPS = [
  {
    title: "Nos cuentas qué vendes y dónde",
    body: "En tus palabras, por ejemplo «cemento y fierro en Arequipa». Nosotros lo traducimos a las categorías del Estado; no necesitas conocer códigos.",
  },
  {
    title: "Revisamos SEACE cada día",
    body: "Cruzamos cada convocatoria nueva con tu rubro, tus regiones y tus montos. Solo pasa lo que de verdad encaja.",
  },
  {
    title: "Te llega un resumen a las 7:00",
    body: "Por WhatsApp y correo, con el plazo, el monto y el precio al que se adjudicó la última compra similar.",
  },
];

const ALERT_PARTS = [
  {
    term: "El plazo que importa",
    detail: "Cuántos días te quedan para presentar tu oferta, destacado si vence pronto.",
  },
  {
    term: "Por qué te llegó",
    detail:
      "El rubro y la región de tu perfil que coinciden. Si algo no encaja, lo marcas y ajustamos.",
  },
  {
    term: "A cuánto se adjudicó la última vez",
    detail:
      "Precio por unidad, ganador y número de postores de la compra más parecida. Es tu referencia para ofertar.",
  },
  {
    term: "Un solo mensaje al día",
    detail: "Todo lo nuevo junto, a la hora que elijas. Nunca te repetimos una licitación.",
  },
];

const SOURCES = [
  {
    name: "SEACE",
    owner: "OECE",
    detail:
      "Convocatorias, cronogramas, bases, ítems con cantidades, buena pro y postores, descargados cada día de los datos abiertos oficiales.",
    available: true,
  },
  {
    name: "Catálogos Electrónicos",
    owner: "Perú Compras",
    detail:
      "Órdenes de compra de los Acuerdos Marco: qué compra cada entidad, a quién y a qué precio.",
    available: false,
  },
];

const UPCOMING = [
  {
    name: "Seguimiento de postulaciones",
    detail:
      "Marca a qué procesos entras, guarda tus documentos y recibe recordatorios de cada plazo.",
  },
  {
    name: "Inteligencia de mercado",
    detail: "Quién le vende a cada entidad, en qué regiones y a qué precios.",
  },
];

const FAQ = [
  {
    q: "¿Necesito saber de códigos o categorías del Estado?",
    a: "No. Describes tu negocio con tus palabras y te proponemos las categorías. Tú las confirmas y puedes cambiarlas cuando quieras.",
  },
  {
    q: "¿Qué es SEACE?",
    a: "Es el sistema donde las entidades públicas del Perú publican sus procesos de contratación: convocatorias, bases, consultas, buena pro y contratos. Lo administra el OECE y su información es pública.",
  },
  {
    q: "¿Y Perú Compras?",
    a: "Es la central de compras del Estado. Administra los Catálogos Electrónicos de Acuerdos Marco, donde las entidades compran directamente a proveedores incorporados. Lo sumaremos para mostrarte precios y avisarte cuando abran convocatorias de tu rubro.",
  },
  {
    q: "¿Necesito estar inscrito en el RNP?",
    a: "Para presentar ofertas al Estado, sí: el Registro Nacional de Proveedores es obligatorio. Para recibir alertas y evaluar oportunidades, no.",
  },
  {
    q: "¿Cómo se contrata el servicio?",
    a: "Después de una demo corta acordamos el plan. El pago es por transferencia y emitimos factura electrónica. No pedimos tarjeta.",
  },
  {
    q: "¿Qué hacen con los datos de mi empresa?",
    a: "Los usamos solo para enviarte tus alertas. Puedes darte de baja de cada canal cuando quieras y pedirnos eliminar tus datos.",
  },
];

export default function HomePage() {
  return (
    <>
      <section aria-labelledby="hero-title">
        <div
          className={`${containerClass} grid items-center gap-14 pt-14 pb-20 md:pt-20 md:pb-28 lg:grid-cols-[1.2fr_0.8fr] lg:gap-14`}
        >
          <div>
            <h1
              id="hero-title"
              className="font-display text-[2.5rem] leading-[1.06] font-semibold tracking-[-0.02em] text-pretty sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem]"
            >
              Cada mañana, las licitaciones del Estado que tu empresa puede ganar.
            </h1>
            <p className="text-muted mt-6 max-w-[34rem] text-lg leading-relaxed md:text-xl md:leading-relaxed">
              Revisamos SEACE por ti y te avisamos por WhatsApp y correo solo con lo que encaja con
              tu negocio, junto con el precio al que se adjudicó la última compra similar.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/demo" className={buttonVariants({ size: "lg" })}>
                Solicitar demo
              </Link>
              <SectionLink
                href="/#como-funciona"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
              >
                Ver cómo funciona
              </SectionLink>
            </div>
            <p className="text-muted mt-5 text-sm">
              Demo de 20 minutos con las licitaciones reales de tu rubro.
            </p>
          </div>
          <OpportunityPreview />
        </div>
      </section>

      <Section className="border-border bg-surface border-y" labelledBy="contexto">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <h2
            id="contexto"
            className="font-display text-[1.75rem] leading-[1.25] font-semibold tracking-[-0.01em] md:text-[2.125rem]"
          >
            Solo en octubre de 2026 se publicaron <span className="tabular-nums">6,671</span>{" "}
            procesos en SEACE.
          </h2>
          <div className="text-muted flex flex-col gap-4 text-lg leading-relaxed">
            <p>
              Revisarlos uno por uno es un trabajo de tiempo completo, y la mayoría no tiene nada
              que ver con tu negocio.
            </p>
            <p>
              De ellos, <span className="text-foreground tabular-nums">3,625</span> ya tienen
              ganador y precio públicos. Es el dato que te dice a cuánto ofertar, y casi nadie lo
              revisa.
            </p>
            <p className="text-sm">
              Fuente: OECE, datos abiertos de contrataciones (estándar OCDS).
            </p>
          </div>
        </div>
      </Section>

      <Section id="como-funciona" labelledBy="como-funciona-title">
        <SectionHeading id="como-funciona-title" title="Cómo funciona" />
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative">
              <div className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="border-primary text-primary grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold tabular-nums"
                >
                  {index + 1}
                </span>
                {index < STEPS.length - 1 && (
                  <span aria-hidden="true" className="bg-border hidden h-px flex-1 md:block" />
                )}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="text-muted mt-2 leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="alerta" className="bg-surface-muted/60" labelledBy="alerta-title">
        <div className="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              id="alerta-title"
              title="Lo que recibes cada mañana"
              lead="Un resumen corto por WhatsApp y el detalle por correo. Cada oportunidad trae lo necesario para decidir en un minuto si te conviene."
            />
            <dl className="mt-10 flex flex-col gap-6">
              {ALERT_PARTS.map((part) => (
                <div key={part.term} className="border-primary border-l-2 pl-5">
                  <dt className="font-semibold">{part.term}</dt>
                  <dd className="text-muted mt-1 leading-relaxed">{part.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="lg:pt-2">
            <DigestPreview />
          </div>
        </div>
      </Section>

      <Section labelledBy="fuentes-title">
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="fuentes-title" className="text-lg font-semibold">
              De dónde salen los datos
            </h2>
            <ul className="mt-6 flex flex-col">
              {SOURCES.map((source) => (
                <li key={source.name} className="border-border border-t py-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="font-medium">
                      {source.name} <span className="text-muted font-normal">({source.owner})</span>
                    </p>
                    {source.available ? (
                      <Badge tone="success">Disponible</Badge>
                    ) : (
                      <Badge tone="info">Próximamente</Badge>
                    )}
                  </div>
                  <p className="text-muted mt-2 leading-relaxed">{source.detail}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Lo que estamos construyendo</h2>
            <ul className="mt-6 flex flex-col">
              {UPCOMING.map((item) => (
                <li key={item.name} className="border-border border-t py-5">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted mt-2 leading-relaxed">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section
        id="preguntas"
        className="border-border bg-surface border-t"
        labelledBy="preguntas-title"
      >
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            id="preguntas-title"
            title="Preguntas frecuentes"
            lead="Si tienes otra duda, la resolvemos en la demo."
          />
          <div className="border-border divide-border divide-y border-y">
            {FAQ.map((item) => (
              <details key={item.q} className="group">
                <summary className="hover:text-primary flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-medium transition-colors [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="text-muted grid size-6 shrink-0 place-items-center text-xl leading-none transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="text-muted max-w-prose pb-5 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      <section aria-labelledby="cta-title" className="bg-primary text-primary-foreground">
        <div
          className={`${containerClass} flex flex-col items-start gap-8 py-16 md:flex-row md:items-center md:justify-between md:py-20`}
        >
          <div className="max-w-xl">
            <h2
              id="cta-title"
              className="font-display text-[1.75rem] leading-[1.2] font-semibold tracking-[-0.01em] md:text-[2.125rem]"
            >
              Mira qué te habría llegado el último mes.
            </h2>
            <p className="mt-3 text-lg leading-relaxed opacity-85">
              En la demo usamos el RUC de tu empresa y datos reales de SEACE.
            </p>
          </div>
          <Link
            href="/demo"
            className={buttonVariants({
              variant: "secondary",
              size: "lg",
              className: "text-foreground shrink-0 border-transparent",
            })}
          >
            Solicitar demo
          </Link>
        </div>
      </section>
    </>
  );
}
