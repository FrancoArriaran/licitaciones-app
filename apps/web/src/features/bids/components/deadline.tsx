import { formatDateLima } from "@licitaciones/core/shared";
import { Badge } from "@licitaciones/ui";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Ofertas hasta 27 nov (en 3 días)", red when ≤ 2 days, amber when ≤ 5. */
export function Deadline({ label, iso, now }: { label: string; iso: string | null; now: Date }) {
  if (!iso) return null;
  const date = new Date(iso);
  const days = Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
  if (days < 0) {
    return (
      <span className="text-muted text-xs">
        {label} cerró el {formatDateLima(date)}
      </span>
    );
  }
  const tone = days <= 2 ? "danger" : days <= 5 ? "warning" : "neutral";
  const relative = days === 0 ? "hoy" : days === 1 ? "mañana" : `en ${String(days)} días`;
  return (
    <Badge tone={tone}>
      {label} {formatDateLima(date)} ({relative})
    </Badge>
  );
}

/** The next deadline that matters for a bid still in play. */
export function nextDeadline(
  tender: {
    enquiryEnd: string | null;
    tenderEnd: string | null;
  },
  now: Date,
): { label: string; iso: string } | null {
  const upcoming = [
    { label: "Consultas hasta", iso: tender.enquiryEnd },
    { label: "Ofertas hasta", iso: tender.tenderEnd },
  ].filter(
    (item): item is { label: string; iso: string } =>
      item.iso !== null && new Date(item.iso).getTime() >= now.getTime(),
  );
  return upcoming.sort((a, b) => a.iso.localeCompare(b.iso))[0] ?? null;
}
