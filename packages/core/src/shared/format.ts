const LIMA_TIME_ZONE = "America/Lima";

const penFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: LIMA_TIME_ZONE,
});

/** "S/ 45,000.00" */
export function formatPen(amount: number): string {
  // Intl separates "S/" and the amount with a no-break space; normalize to a regular one.
  return penFormatter.format(amount).replace(/\s/g, " ");
}

/** "17 nov 2026", always in Lima time regardless of server timezone. */
export function formatDateLima(date: Date): string {
  return dateFormatter.format(date).replace(/\./g, "");
}

/**
 * SEACE descriptions arrive in capitals, with curly quotes mis-encoded as "¿".
 * Shown as sentence case; tokens with digits (42.5KG, N°01) keep their capitals.
 */
export function formatTenderDescription(text: string): string {
  const cleaned = text.replace(/¿/g, '"').replace(/\s+/g, " ").trim();
  if (cleaned !== cleaned.toUpperCase()) return cleaned;
  const lowered = cleaned
    .split(" ")
    .map((word) => (/\d/.test(word) ? word : word.toLocaleLowerCase("es-PE")))
    .join(" ");
  return lowered.replace(
    /^(\P{L}*)(\p{L})/u,
    (_, prefix: string, first: string) => prefix + first.toLocaleUpperCase("es-PE"),
  );
}
