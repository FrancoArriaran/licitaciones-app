import { Button, Card } from "@licitaciones/ui";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Cuenta sin empresa" };

export default async function NoOrganizationPage() {
  const user = await requireUser();

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-2xl leading-tight font-semibold tracking-[-0.01em]">
        Tu cuenta no está asociada a una empresa
      </h1>
      <p className="text-muted mt-2 text-sm">
        Ingresaste como <span className="text-foreground font-medium">{user.email}</span>, pero no
        encontramos una empresa para ese correo. Pide al responsable de tu empresa que te invite, o
        escríbenos si crees que es un error.
      </p>
      <form action="/auth/salir" method="post" className="mt-6">
        <Button type="submit" variant="secondary">
          Salir
        </Button>
      </form>
    </Card>
  );
}
