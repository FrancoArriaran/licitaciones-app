import { Alert, Card } from "@licitaciones/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/auth/components/auth-forms";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Ingresar" };

const ERRORS: Record<string, string> = {
  enlace:
    "El enlace ya se usó o venció. Pide uno nuevo con «Olvidé mi contraseña» o escribe a quien te invitó.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const errorMessage = error ? ERRORS[error] : undefined;

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-2xl leading-tight font-semibold tracking-[-0.01em]">
        Ingresa a tu cuenta
      </h1>
      <p className="text-muted mt-1 text-sm">
        Revisa tus oportunidades y la configuración de tu empresa.
      </p>
      {errorMessage && (
        <Alert tone="error" className="mt-4">
          {errorMessage}
        </Alert>
      )}
      <div className="mt-6">
        <LoginForm next={next ? safeNextPath(next, "/inicio") : undefined} />
      </div>
      <p className="border-border text-muted mt-6 border-t pt-4 text-center text-sm">
        ¿Tu empresa aún no tiene cuenta?{" "}
        <Link href="/demo" className="text-primary font-medium hover:underline">
          Solicita una demo
        </Link>
      </p>
    </Card>
  );
}
