"use client";

import { Button } from "@licitaciones/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importSeaceHistory } from "../actions";

export function ImportHistoryButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        size="lg"
        disabled={pending}
        aria-disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await importSeaceHistory();
            if (result.ok)
              router.push(`/postulaciones?vista=cerradas&importadas=${String(result.imported)}`);
            else setError(result.message);
          });
        }}
      >
        {pending
          ? "Agregando…"
          : `Agregar ${String(count)} ${count === 1 ? "proceso" : "procesos"} a mis postulaciones`}
      </Button>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
