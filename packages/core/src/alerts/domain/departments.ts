/** The 25 departments as SEACE writes them (tenders.department), with display labels. */
export const DEPARTMENTS = [
  { code: "AMAZONAS", label: "Amazonas" },
  { code: "ANCASH", label: "Áncash" },
  { code: "APURIMAC", label: "Apurímac" },
  { code: "AREQUIPA", label: "Arequipa" },
  { code: "AYACUCHO", label: "Ayacucho" },
  { code: "CAJAMARCA", label: "Cajamarca" },
  { code: "CALLAO", label: "Callao" },
  { code: "CUSCO", label: "Cusco" },
  { code: "HUANCAVELICA", label: "Huancavelica" },
  { code: "HUANUCO", label: "Huánuco" },
  { code: "ICA", label: "Ica" },
  { code: "JUNIN", label: "Junín" },
  { code: "LA LIBERTAD", label: "La Libertad" },
  { code: "LAMBAYEQUE", label: "Lambayeque" },
  { code: "LIMA", label: "Lima" },
  { code: "LORETO", label: "Loreto" },
  { code: "MADRE DE DIOS", label: "Madre de Dios" },
  { code: "MOQUEGUA", label: "Moquegua" },
  { code: "PASCO", label: "Pasco" },
  { code: "PIURA", label: "Piura" },
  { code: "PUNO", label: "Puno" },
  { code: "SAN MARTIN", label: "San Martín" },
  { code: "TACNA", label: "Tacna" },
  { code: "TUMBES", label: "Tumbes" },
  { code: "UCAYALI", label: "Ucayali" },
] as const;

export type DepartmentCode = (typeof DEPARTMENTS)[number]["code"];

const LABELS = new Map<string, string>(DEPARTMENTS.map((d) => [d.code, d.label]));

export function departmentLabel(code: string): string {
  return LABELS.get(code) ?? code;
}

export function isDepartmentCode(value: string): value is DepartmentCode {
  return LABELS.has(value);
}
