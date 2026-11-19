import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-12">
      <Logo />
      <main className="mt-8 w-full max-w-md">{children}</main>
    </div>
  );
}
