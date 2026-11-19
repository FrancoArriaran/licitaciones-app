import type { MonthlyFile, Period, ProcurementSource } from "@licitaciones/core/ingestion";
import { unzipSync } from "fflate";

const BASE_URL = "https://contratacionesabiertas.oece.gob.pe/api/v1/file/seace_v3/json";

/**
 * SEACE's monthly OCDS file. Served as a ZIP with a single JSON inside, the same
 * endpoint and User-Agent the n8n workflow used. 404 means the month isn't out yet.
 */
export class SeaceProcurementSource implements ProcurementSource {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly timeoutMs = 10 * 60_000,
  ) {}

  async fetchMonth({ year, month }: Period): Promise<MonthlyFile> {
    const url = `${BASE_URL}/${year}/${String(month).padStart(2, "0")}/`;
    const response = await this.fetchFn(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (response.status === 404) return { published: false };
    if (!response.ok) throw new Error(`SEACE returned HTTP ${response.status} for ${url}`);

    const entries = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const json = Object.entries(entries).find(([name]) => name.toLowerCase().endsWith(".json"));
    if (!json) throw new Error(`SEACE file for ${year}-${month} has no JSON inside`);

    return { published: true, data: JSON.parse(new TextDecoder().decode(json[1])) as unknown };
  }
}
