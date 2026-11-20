import { z } from "zod";
import type { OrganizationId, UserId } from "../../accounts";
import type { Brand } from "../../shared";

export type BidId = Brand<string, "BidId">;

/** Order matters: it is the order of the board columns. */
export const BID_STATUSES = [
  "evaluating",
  "preparing",
  "submitted",
  "won",
  "lost",
  "cancelled",
  "withdrawn",
] as const;
export type BidStatus = (typeof BID_STATUSES)[number];

/** Still in play: shown on the board and in reminders. */
export const OPEN_BID_STATUSES = [
  "evaluating",
  "preparing",
  "submitted",
] as const satisfies readonly BidStatus[];

export const LOST_REASONS = ["price", "requirements", "disqualified", "other"] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const BID_SOURCES = ["manual", "alert", "seace_import"] as const;
export type BidSource = (typeof BID_SOURCES)[number];

export function isOpenStatus(status: BidStatus): boolean {
  return (OPEN_BID_STATUSES as readonly BidStatus[]).includes(status);
}

export interface Bid {
  readonly id: BidId;
  readonly organizationId: OrganizationId;
  readonly ocid: string;
  readonly status: BidStatus;
  readonly offeredAmount: number | null;
  readonly awardedAmount: number | null;
  readonly lostReason: LostReason | null;
  readonly assigneeId: UserId | null;
}

/** The editable part of a bid. */
export type BidDetails = Pick<
  Bid,
  "status" | "offeredAmount" | "awardedAmount" | "lostReason" | "assigneeId"
>;

/**
 * Amounts as people type them in Peru: "41,000.50", "S/ 41 000", "41000". Comma is
 * the thousands separator and dot the decimal one. Empty means "not set".
 */
const amountSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const cleaned = value.replace(/^S\/\.?/i, "").replace(/[\s,]/g, "");
    if (cleaned === "") return null;
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(cleaned)) {
      ctx.addIssue({
        code: "custom",
        message: "Escribe el monto en soles, por ejemplo 41,000.50.",
      });
      return z.NEVER;
    }
    return Number(cleaned);
  });

const blankToNull = (value: unknown) => (value === "" ? null : value);

export const bidDetailsSchema = z
  .object({
    status: z.enum(BID_STATUSES, { message: "Elige un estado." }),
    offeredAmount: amountSchema.nullish().transform((value) => value ?? null),
    awardedAmount: amountSchema.nullish().transform((value) => value ?? null),
    lostReason: z
      .preprocess(blankToNull, z.enum(LOST_REASONS).nullish())
      .transform((v) => v ?? null),
    assigneeId: z.preprocess(blankToNull, z.uuid().nullish()).transform((v) => v ?? null),
  })
  // Only a won bid has an awarded amount and only a lost one has a reason; values left
  // over from a previous status are dropped instead of rejected, so changing status is one click.
  .transform((details) => ({
    ...details,
    awardedAmount: details.status === "won" ? details.awardedAmount : null,
    lostReason: details.status === "lost" ? details.lostReason : null,
  }));

export type BidDetailsInput = z.input<typeof bidDetailsSchema>;

export type BidEventType =
  | "created"
  | "status_changed"
  | "offer_changed"
  | "result_recorded"
  | "note"
  | "document_added"
  | "document_removed"
  | "assigned"
  | "result_detected";

export interface NewBidEvent {
  readonly type: BidEventType;
  readonly data: Readonly<Record<string, string | number | null>>;
}

/** What changed between two versions of a bid, as timeline entries. */
export function describeChanges(before: BidDetails, after: BidDetails): NewBidEvent[] {
  const events: NewBidEvent[] = [];
  const isResult = after.status === "won" || after.status === "lost";
  const resultChanged =
    before.status !== after.status ||
    before.awardedAmount !== after.awardedAmount ||
    before.lostReason !== after.lostReason;

  if (isResult && resultChanged) {
    events.push({
      type: "result_recorded",
      data: {
        from: before.status,
        to: after.status,
        awardedAmount: after.awardedAmount,
        lostReason: after.lostReason,
      },
    });
  } else if (before.status !== after.status) {
    events.push({ type: "status_changed", data: { from: before.status, to: after.status } });
  }
  if (before.offeredAmount !== after.offeredAmount) {
    events.push({
      type: "offer_changed",
      data: { from: before.offeredAmount, to: after.offeredAmount },
    });
  }
  if (before.assigneeId !== after.assigneeId) {
    events.push({ type: "assigned", data: { to: after.assigneeId } });
  }
  return events;
}
