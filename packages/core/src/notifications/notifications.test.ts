import { describe, expect, it } from "vitest";
import type { Clock } from "../shared";
import {
  SendWhatsAppAlerts,
  tenderAlertTemplateParams,
  type MatchSource,
  type PendingWhatsAppAlert,
  type WhatsAppTemplateMessage,
} from "./index";

function alert(overrides: Partial<PendingWhatsAppAlert> = {}): PendingWhatsAppAlert {
  return {
    source: "alerts",
    matchIds: [1],
    recipientKey: "org-a",
    phone: "+51987654321",
    companyName: "Ferretería Andina",
    sendFromHour: 7,
    ocid: "ocds-1",
    title: "SIE-SIE-1-2026-MDSD-OEC-1",
    buyerName: "MUNICIPALIDAD DISTRITAL DE SANTO DOMINGO",
    amount: 45000,
    enquiryEnd: new Date("2026-11-21T04:59:00Z"),
    ...overrides,
  };
}

describe("tenderAlertTemplateParams", () => {
  it("fills the template like the n8n node did", () => {
    expect(tenderAlertTemplateParams(alert())).toEqual([
      "Ferretería Andina",
      "SIE-SIE-1-2026-MDSD-OEC-1",
      "MUNICIPALIDAD DISTRITAL DE SANTO DOMINGO",
      "45,000.00",
      // 04:59 UTC on the 21st is still the 20th in Lima.
      "20/11/2026",
    ]);
  });

  it("uses the n8n fallbacks for missing data", () => {
    expect(
      tenderAlertTemplateParams(
        alert({ title: null, buyerName: null, amount: null, enquiryEnd: null }),
      ),
    ).toEqual(["Ferretería Andina", "", "", "0.00", "por confirmar"]);
  });
});

describe("SendWhatsAppAlerts", () => {
  // 12:00 UTC = 07:00 in Lima.
  const clock: Clock = { now: () => new Date("2026-11-19T12:00:00Z") };

  function setup(pending: PendingWhatsAppAlert[], failFor: string[] = []) {
    const sent: WhatsAppTemplateMessage[] = [];
    const marked: { source: MatchSource; ids: readonly number[] }[] = [];
    const useCase = new SendWhatsAppAlerts(
      {
        list: async () => pending,
        markNotified: async (source, ids) => void marked.push({ source, ids }),
      },
      {
        sendTemplate: async (message) => {
          if (failFor.includes(message.to)) throw new Error("WhatsApp returned HTTP 400");
          sent.push(message);
        },
      },
      clock,
    );
    return { useCase, sent, marked };
  }

  it("sends one message per tender and marks it as notified", async () => {
    const { useCase, sent, marked } = setup([
      alert({ matchIds: [1], ocid: "a" }),
      alert({ source: "prototype", matchIds: [9], recipientKey: "7", ocid: "b" }),
    ]);
    const summary = await useCase.execute();
    expect(sent.map((message) => message.to)).toEqual(["+51987654321", "+51987654321"]);
    expect(marked).toEqual([
      { source: "alerts", ids: [1] },
      { source: "prototype", ids: [9] },
    ]);
    expect(summary).toMatchObject({ sent: 2, waiting: 0, failed: [] });
  });

  it("sends a tender once when two profiles of a company caught it", async () => {
    const { useCase, sent, marked } = setup([alert({ matchIds: [1] }), alert({ matchIds: [2] })]);
    await useCase.execute();
    expect(sent).toHaveLength(1);
    expect(marked).toEqual([{ source: "alerts", ids: [1, 2] }]);
  });

  it("waits until the recipient's hour in Lima", async () => {
    const { useCase, sent } = setup([alert({ sendFromHour: 9 })]);
    const summary = await useCase.execute();
    expect(sent).toEqual([]);
    expect(summary.waiting).toBe(1);
  });

  it("leaves failed sends pending for the next run and continues with the rest", async () => {
    const { useCase, sent, marked } = setup(
      [
        alert({ phone: "+51900000001", matchIds: [1] }),
        alert({ phone: "+51900000002", matchIds: [2] }),
      ],
      ["+51900000001"],
    );
    const summary = await useCase.execute();
    expect(sent.map((message) => message.to)).toEqual(["+51900000002"]);
    expect(marked).toEqual([{ source: "alerts", ids: [2] }]);
    expect(summary.failed).toEqual([
      { source: "alerts", matchIds: [1], error: "WhatsApp returned HTTP 400" },
    ]);
  });

  it("in a dry run sends and marks nothing", async () => {
    const { useCase, sent, marked } = setup([alert()]);
    const summary = await useCase.execute({ dryRun: true });
    expect(sent).toEqual([]);
    expect(marked).toEqual([]);
    expect(summary.preview).toHaveLength(1);
  });
});
