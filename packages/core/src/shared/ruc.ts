import type { Brand } from "./brand";

export type Ruc = Brand<string, "Ruc">;

// 10: persona natural, 15/16/17: no domiciliados y otros, 20: persona jurídica.
const VALID_PREFIXES = new Set(["10", "15", "16", "17", "20"]);
const CHECK_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

/** SUNAT modulo-11 check digit over the first 10 digits. */
function checkDigit(firstTen: string): number {
  const sum = CHECK_WEIGHTS.reduce((acc, weight, i) => acc + weight * Number(firstTen[i]), 0);
  return (11 - (sum % 11)) % 10;
}

export function isValidRuc(value: string): value is Ruc {
  if (!/^\d{11}$/.test(value)) return false;
  if (!VALID_PREFIXES.has(value.slice(0, 2))) return false;
  return checkDigit(value.slice(0, 10)) === Number(value[10]);
}

export function normalizeRuc(value: string): string {
  return value.replace(/\D/g, "");
}
