import { Button } from "@licitaciones/ui";

export function SignOutButton() {
  return (
    <form action="/auth/salir" method="post">
      <Button type="submit" variant="ghost" size="sm">
        Salir
      </Button>
    </form>
  );
}
