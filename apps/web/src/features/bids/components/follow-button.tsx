"use client";

import type { BidStatus } from "@licitaciones/core/bids";
import { Badge, Button, buttonVariants } from "@licitaciones/ui";
import Link from "next/link";
import { useState, useTransition } from "react";
import { followOpportunity } from "../actions";
import { BID_STATUS } from "../labels";

/**
 * Primary action of the opportunity page. Once followed it turns into the bid's
 * status and a link to it, so the page always shows where the company stands.
 */
export function FollowButton({
  ocid,
  bid,
}: {
  ocid: string;
  bid: { id: string; status: BidStatus } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (bid) {
    const status = BID_STATUS[bid.status];
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={status.tone}>En tus postulaciones · {status.label}</Badge>
        <Link
          href={`/postulaciones/${bid.id}`}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Ver postulación
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await followOpportunity(ocid);
            if (!result.ok) setError(result.message);
          });
        }}
        disabled={pending}
        aria-disabled={pending}
      >
        {pending ? "Agregando…" : "Seguir esta licitación"}
      </Button>
      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : (
        <p className="text-muted text-xs">
          La agregamos a tus postulaciones para que registres tu oferta y documentos.
        </p>
      )}
    </div>
  );
}
