import Link from "next/link";

/** Working wordmark until the brand is defined: a serif "L" seal plus the product name. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="text-foreground inline-flex items-center gap-2.5 font-semibold tracking-[-0.01em]"
    >
      <span
        aria-hidden="true"
        className="bg-primary text-primary-foreground font-display grid size-8 place-items-center rounded-lg text-lg leading-none font-semibold"
      >
        L
      </span>
      <span className="text-[1.0625rem]">Licitaciones</span>
    </Link>
  );
}
