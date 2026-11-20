"use client";

import { BID_STATUSES, type BidStatus } from "@licitaciones/core/bids";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moveBid } from "../actions";
import type { BidSummary } from "../data";
import { BID_STATUS } from "../labels";

/**
 * Moves a card to another column in one step. Results that need more data (amount
 * won, why it was lost) open the bid instead, so nothing is recorded half-done.
 */
export function QuickMove({ bid }: { bid: BidSummary }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const id = `move-${bid.id}`;

  function move(status: BidStatus) {
    if (status === bid.status) return;
    if (status === "won" || status === "lost") {
      router.push(`/postulaciones/${bid.id}?resultado=${status}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await moveBid(bid.id, {
        status,
        offeredAmount: bid.offeredAmount,
        awardedAmount: null,
        lostReason: null,
        assigneeId: bid.assigneeId,
      });
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        Mover a otro estado
      </label>
      <select
        id={id}
        value={bid.status}
        disabled={pending}
        onChange={(event) => {
          move(event.target.value as BidStatus);
        }}
        className="border-border bg-surface text-muted hover:text-foreground h-8 rounded-md border px-2 text-xs transition-colors disabled:opacity-60"
      >
        {BID_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status === bid.status
              ? BID_STATUS[status].label
              : `Mover a ${BID_STATUS[status].label}`}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
