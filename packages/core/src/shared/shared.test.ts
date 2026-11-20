import { describe, expect, it } from "vitest";
import {
  formatDateLima,
  formatDateTimeLima,
  formatFileSize,
  formatMoney,
  formatPen,
  formatQuantity,
  formatTenderDescription,
} from "./format";
import { isValidRuc, normalizeRuc } from "./ruc";
import { peruMobileSchema, rucSchema } from "./schemas";

describe("isValidRuc", () => {
  it.each(["20131312955", "20505120451"])("accepts real RUC %s", (ruc) => {
    expect(isValidRuc(ruc)).toBe(true);
  });

  it("rejects a wrong check digit", () => {
    expect(isValidRuc("20131312954")).toBe(false);
  });

  it("rejects unknown prefixes and wrong lengths", () => {
    expect(isValidRuc("30131312955")).toBe(false);
    expect(isValidRuc("2013131295")).toBe(false);
  });

  it("normalizes separators before validating", () => {
    expect(rucSchema.parse("20-13131295-5")).toBe("20131312955");
    expect(normalizeRuc(" 20131312955 ")).toBe("20131312955");
  });
});

describe("peruMobileSchema", () => {
  it.each(["987654321", "987 654 321", "+51 987 654 321", "51987654321"])(
    "normalizes %s to E.164",
    (input) => {
      expect(peruMobileSchema.parse(input)).toBe("+51987654321");
    },
  );

  it("rejects landlines and short numbers", () => {
    expect(peruMobileSchema.safeParse("014567890").success).toBe(false);
    expect(peruMobileSchema.safeParse("98765432").success).toBe(false);
  });
});

describe("format", () => {
  it("formats soles with two decimals", () => {
    expect(formatPen(45000)).toBe("S/ 45,000.00");
  });

  it("turns SEACE capitals into sentence case and fixes mis-encoded quotes", () => {
    expect(formatTenderDescription("ADQUISICIÓN DE  CEMENTO ¿PORTLAND TIPO I (42.5KG)¿")).toBe(
      'Adquisición de cemento "portland tipo i (42.5KG)"',
    );
    expect(formatTenderDescription("Servicio de limpieza")).toBe("Servicio de limpieza");
  });

  it("formats dates in Lima time, not UTC", () => {
    // 03:00 UTC on the 18th is still the 17th in Lima (UTC-5).
    expect(formatDateLima(new Date("2026-11-18T03:00:00Z"))).toMatch(/^17 nov 2026$/);
  });
});

describe("formatMoney", () => {
  it("shows soles with S/ and other currencies with their code", () => {
    expect(formatMoney(45000, "PEN")).toBe(formatPen(45000));
    expect(formatMoney(45000, null)).toBe(formatPen(45000));
    expect(formatMoney(1200.5, "USD")).toBe("USD 1,200.5");
  });

  it("formats quantities with thousands separators", () => {
    expect(formatQuantity(12923)).toBe("12,923");
    expect(formatQuantity(2.5)).toBe("2.5");
  });
});

describe("formatDateTimeLima and formatFileSize", () => {
  it("shows the Lima date and time", () => {
    expect(formatDateTimeLima(new Date("2026-11-19T14:05:00Z"))).toBe("19 nov 2026, 09:05");
  });

  it("shows sizes in KB or MB", () => {
    expect(formatFileSize(300)).toBe("1 KB");
    expect(formatFileSize(850 * 1024)).toBe("850 KB");
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe("2.4 MB");
  });
});
