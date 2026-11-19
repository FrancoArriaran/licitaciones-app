const limaParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  hourCycle: "h23",
});

export interface LimaCalendar {
  year: number;
  month: number;
  day: number;
  hour: number;
}

/** Calendar date and hour in Lima for an instant, whatever the server's timezone. */
export function limaCalendar(instant: Date): LimaCalendar {
  const parts = Object.fromEntries(
    limaParts.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
  };
}
