"use client";

import { Button } from "@licitaciones/ui";
import { useState, useTransition } from "react";
import { removeBid } from "../actions";

/** Deleting erases documents and history, so it asks once more and says so. */
export function RemoveBidButton({ bidId }: { bidId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-danger self-start"
        onClick={() => {
          setConfirming(true);
        }}
      >
        Eliminar postulación
      </Button>
    );
  }

  return (
    <div className="border-danger/30 bg-danger-soft flex flex-col gap-3 rounded-lg border p-3">
      <p className="text-sm">
        Se borrarán sus documentos y su historial. Si solo no te presentaste, mejor cambia el estado
        a «No me presenté».
      </p>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await removeBid(bidId);
              if (!result.ok) setError(result.message);
            });
          }}
        >
          {pending ? "Eliminando…" : "Sí, eliminar"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setConfirming(false);
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
