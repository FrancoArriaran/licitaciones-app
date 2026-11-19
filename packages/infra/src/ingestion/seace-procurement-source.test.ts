import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { SeaceProcurementSource } from "./seace-procurement-source";

function fakeFetch(response: Response) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return response;
  }) as typeof fetch;
  return { fetchFn, calls };
}

describe("SeaceProcurementSource", () => {
  it("downloads the month's ZIP from the n8n URL and parses the JSON inside", async () => {
    const zip = zipSync({ "2026-11_seace_v3.json": strToU8('{"records":[{"ocid":"x"}]}') });
    const { fetchFn, calls } = fakeFetch(new Response(zip, { status: 200 }));

    const file = await new SeaceProcurementSource(fetchFn).fetchMonth({ year: 2026, month: 11 });

    expect(calls[0]?.url).toBe(
      "https://contratacionesabiertas.oece.gob.pe/api/v1/file/seace_v3/json/2026/11/",
    );
    expect(calls[0]?.init?.headers).toEqual({ "User-Agent": "Mozilla/5.0" });
    expect(file).toEqual({ published: true, data: { records: [{ ocid: "x" }] } });
  });

  it("reports a month that isn't published yet", async () => {
    const { fetchFn } = fakeFetch(new Response("", { status: 404 }));
    const file = await new SeaceProcurementSource(fetchFn).fetchMonth({ year: 2026, month: 12 });
    expect(file).toEqual({ published: false });
  });

  it("fails on server errors", async () => {
    const { fetchFn } = fakeFetch(new Response("", { status: 503 }));
    await expect(
      new SeaceProcurementSource(fetchFn).fetchMonth({ year: 2026, month: 11 }),
    ).rejects.toThrow("HTTP 503");
  });
});
