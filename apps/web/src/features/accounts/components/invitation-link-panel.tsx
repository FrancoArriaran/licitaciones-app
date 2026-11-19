"use client";

import { Button, buttonVariants, Input } from "@licitaciones/ui";
import { useRef, useState } from "react";

/**
 * Until email delivery is set up, invitations are delivered by hand: copy the link or
 * open WhatsApp with a ready-made message. The link signs the person in once.
 */
export function InvitationLinkPanel({ message, link }: { message: string; link: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const whatsappText = `Hola, te invitamos a Licitaciones, donde verás las licitaciones del Estado que encajan con tu empresa. Crea tu contraseña aquí (el enlace vence en 24 horas): ${link}`;

  function copy() {
    navigator.clipboard.writeText(link).then(
      () => {
        setCopied(true);
      },
      () => {
        // Some browsers refuse clipboard access; select the text so Ctrl+C works.
        input.current?.select();
      },
    );
  }

  return (
    <div role="status" className="border-success/30 bg-success-soft rounded-lg border p-4">
      <p className="text-success font-medium">{message}</p>
      <p className="mt-1 text-sm">
        Envíale este enlace. Es de un solo uso y vence en 24 horas; si vence, genera uno nuevo desde
        la lista del equipo.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          ref={input}
          readOnly
          value={link}
          aria-label="Enlace de invitación"
          onFocus={(event) => {
            event.currentTarget.select();
          }}
          className="text-xs sm:flex-1"
        />
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? "Copiado" : "Copiar enlace"}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "secondary" })}
        >
          Enviar por WhatsApp
        </a>
      </div>
    </div>
  );
}
