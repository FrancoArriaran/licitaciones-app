import { Card } from "@licitaciones/ui";
import type { Metadata } from "next";
import { SetPasswordForm } from "@/features/auth/components/auth-forms";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function NewPasswordPage() {
  const user = await requireUser();

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-2xl leading-tight font-semibold tracking-[-0.01em]">
        Crea una nueva contraseña
      </h1>
      <p className="text-muted mt-1 text-sm">
        Para la cuenta <span className="text-foreground font-medium">{user.email}</span>.
      </p>
      <div className="mt-6">
        <SetPasswordForm intent="recovery" />
      </div>
    </Card>
  );
}
