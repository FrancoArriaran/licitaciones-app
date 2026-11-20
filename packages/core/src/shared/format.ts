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

/** Soles as "S/ 45,000.00"; other currencies with their code ("USD 1,200.5"). */
export function formatMoney(amount: number, currency: string | null): string {
  if (!currency || currency === "PEN") return formatPen(amount);
  return `${currency} ${amount.toLocaleString("es-PE", { maximumFractionDigits: 2 })}`;
}

/** Quantities as SEACE publishes them, with thousands separators: "12,923". */
export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString("es-PE", { maximumFractionDigits: 2 });
}

const timeFormatter = new Intl.DateTimeFormat("es-PE", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: LIMA_TIME_ZONE,
});

/** "17 nov 2026, 09:05", in Lima time. */
export function formatDateTimeLima(date: Date): string {
  return `${formatDateLima(date)}, ${timeFormatter.format(date)}`;
}

/** "850 KB", "2.4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
