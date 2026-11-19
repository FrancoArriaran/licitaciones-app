/** The morning email, as the client receives it. Fictitious data. */

const OPPORTUNITIES = [
  {
    title: "Adquisición de cemento portland tipo I para pistas y veredas",
    buyer: "Municipalidad distrital, Arequipa",
    amount: "S/ 45,000.00",
    deadline: "Vence en 3 días",
    urgent: true,
    reason: "Cemento y agregados, en Arequipa",
    similar: "La última compra similar se adjudicó a S/ 27.90 por bolsa, con 4 postores.",
  },
  {
    title: "Suministro de fierro corrugado de 1/2 pulgada",
    buyer: "Gobierno Regional de Puno",
    amount: "S/ 128,400.00",
    deadline: "Vence en 9 días",
    urgent: false,
    reason: "Fierro y acero, en Puno",
    similar: "La última compra similar se adjudicó a S/ 41.50 por varilla, con 6 postores.",
  },
];

export function DigestPreview() {
  return (
    <figure className="border-border bg-surface overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(20,32,27,0.04),0_12px_32px_-16px_rgba(20,32,27,0.16)]">
      <div className="border-border border-b px-6 py-4">
        <p className="text-muted text-xs">Correo de las 7:00</p>
        <p className="mt-1 font-medium">4 oportunidades nuevas para Ferretería El Clavo</p>
      </div>
      <ul className="divide-border divide-y">
        {OPPORTUNITIES.map((item) => (
          <li key={item.title} className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <p className="leading-snug font-medium text-pretty">{item.title}</p>
              <span
                className={
                  item.urgent
                    ? "bg-warning-soft text-warning shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    : "bg-surface-muted text-muted shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                }
              >
                {item.deadline}
              </span>
            </div>
            <p className="text-muted mt-1 text-sm">
              {item.buyer}. Valor referencial{" "}
              <span className="text-foreground tabular-nums">{item.amount}</span>
            </p>
            <p className="mt-3 text-sm">
              <span className="text-muted">Por qué te llegó: </span>
              {item.reason}
            </p>
            <p className="bg-primary-soft text-primary mt-3 rounded-lg px-3 py-2 text-sm">
              {item.similar}
            </p>
          </li>
        ))}
      </ul>
      <figcaption className="border-border text-muted border-t px-6 py-3 text-xs">
        Y 2 oportunidades más en tu cuenta. Ejemplo con datos ficticios.
      </figcaption>
    </figure>
  );
}
