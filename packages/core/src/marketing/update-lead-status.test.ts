import { describe, expect, it } from "vitest";
import type { Actor, UserId } from "../accounts";
import { NotAuthorizedError, ValidationError } from "../shared";
import { UpdateLeadStatus, type LeadStatus } from "./index";

const staff: Actor = { userId: "u-staff" as UserId, isPlatformAdmin: true, role: null };
const customer: Actor = { userId: "u-owner" as UserId, isPlatformAdmin: false, role: "owner" };
const LEAD_ID = "40000000-0000-4000-8000-000000000001";

describe("UpdateLeadStatus", () => {
  it("moves a lead through the pipeline", async () => {
    const updates: [string, LeadStatus][] = [];
    const useCase = new UpdateLeadStatus({
      updateStatus: async (id, status) => void updates.push([id, status]),
    });
    await useCase.execute(staff, { leadId: LEAD_ID, status: "demo_scheduled" });
    expect(updates).toEqual([[LEAD_ID, "demo_scheduled"]]);
  });

  it("is staff-only and validates the status", async () => {
    const useCase = new UpdateLeadStatus({ updateStatus: async () => {} });
    await expect(
      useCase.execute(customer, { leadId: LEAD_ID, status: "won" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(
      useCase.execute(staff, { leadId: LEAD_ID, status: "archived" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
