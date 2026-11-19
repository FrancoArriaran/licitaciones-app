import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("keeps internal paths with query strings", () => {
    expect(safeNextPath("/empresa?tab=equipo", "/inicio")).toBe("/empresa?tab=equipo");
  });

  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "inicio", "", null, undefined, 42])(
    "falls back for %s",
    (next) => {
      expect(safeNextPath(next, "/inicio")).toBe("/inicio");
    },
  );
});
