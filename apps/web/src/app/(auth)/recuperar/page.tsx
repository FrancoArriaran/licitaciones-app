import { Card } from "@licitaciones/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { RequestResetForm } from "@/features/auth/components/auth-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-2xl leading-tight font-semibold tracking-[-0.01em]">
        Recupera tu contraseña
      </h1>
      <p className="text-muted mt-1 text-sm">
        Te enviaremos un enlace para crear una nueva. Vence en 24 horas.
      </p>
      <div className="mt-6">
        <RequestResetForm />
      </div>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Volver a ingresar
        </Link>
      </p>
    </Card>
  );
}
