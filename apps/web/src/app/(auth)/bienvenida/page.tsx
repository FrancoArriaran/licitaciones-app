import { Card } from "@licitaciones/ui";
import type { Metadata } from "next";
import { SetPasswordForm } from "@/features/auth/components/auth-forms";
import { getMembership, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Bienvenida" };

export default async function WelcomePage() {
  const user = await requireUser();
  const membership = await getMembership();

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-2xl leading-tight font-semibold tracking-[-0.01em]">
        Te damos la bienvenida{membership ? ` a ${membership.organization.name}` : ""}
      </h1>
      <p className="text-muted mt-1 text-sm">
        Crea la contraseña para <span className="text-foreground font-medium">{user.email}</span>.
        La usarás para entrar desde cualquier dispositivo.
      </p>
      <div className="mt-6">
        <SetPasswordForm intent="welcome" />
      </div>
    </Card>
  );
}
