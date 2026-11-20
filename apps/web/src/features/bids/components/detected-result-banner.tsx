"use client";

import { formatDateLima, formatMoney } from "@licitaciones/core/shared";
import { Button, buttonVariants } from "@licitaciones/ui";
import Link from "next/link";
import { useState, useTransition } from "react";
import { moveBid } from "../actions";
import type { BidDetail, DetectedResult } from "../data";

function headline(result: DetectedResult): string {
  const amount = result.amount !== null ? ` por ${formatMoney(result.amount, "PEN")}` : "";
  const winner = result.winnerName ?? "otro postor";
  if (result.outcome === "won") return `SEACE publicó la buena pro: la ganaste${amount}.`;
  if (result.outcome === "lost") return `SEACE publicó la buena pro: la ganó ${winner}${amount}.`;
  return `La buena pro fue para ${winner}${amount}. Según SEACE, tu empresa no presentó oferta.`;
}

/**
 * Suggests the result SEACE published. One click records it; the company stays in
 * control (nothing changes until it confirms).
 */
export function DetectedResultBanner({
  bid,
  result,
}: {
  bid: Pick<BidDetail, "id" | "offeredAmount" | "assigneeId">;
  result: DetectedResult;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function record(status: "won" | "withdrawn") {
    setError(null);
    startTransition(async () => {
      const outcome = await moveBid(bid.id, {
        status,
        offeredAmount: bid.offeredAmount,
        awardedAmount: status === "won" ? result.amount : null,
        lostReason: null,
        assigneeId: bid.assigneeId,
      });
      if (!outcome.ok) setError(outcome.message);
    });
  }

  return (
    <div
      role="status"
      className="border-primary/30 bg-primary-soft flex flex-col gap-3 rounded-xl border p-4"
    >
      <div>
        <p className="font-medium">{headline(result)}</p>
        {result.awardDate && (
          <p className="text-muted mt-0.5 text-xs">
            Adjudicado el {formatDateLima(new Date(result.awardDate))}. ¿Lo registramos?
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {result.outcome === "won" && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => {
              record("won");
            }}
          >
            {pending ? "Registrando…" : "Registrar como ganada"}
          </Button>
        )}
        {result.outcome === "lost" && (
          <Link
            href={`/postulaciones/${bid.id}?resultado=lost`}
            className={buttonVariants({ size: "sm" })}
          >
            Registrar como no ganada
          </Link>
        )}
        {result.outcome === "awarded_to_other" && (
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                record("withdrawn");
              }}
            >
              {pending ? "Registrando…" : "Registrar «No me presenté»"}
            </Button>
            <Link
              href={`/postulaciones/${bid.id}?resultado=lost`}
              className={buttonVariants({ size: "sm", variant: "secondary" })}
            >
              Sí presenté oferta
            </Link>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
