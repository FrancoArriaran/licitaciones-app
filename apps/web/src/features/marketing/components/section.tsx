import { cn } from "@licitaciones/ui";
import type { ReactNode } from "react";

/** Shared page width and side gutters for every marketing band. */
export const containerClass = "mx-auto w-full max-w-6xl px-5 sm:px-8";

export function Section({
  id,
  className,
  innerClassName,
  labelledBy,
  children,
}: {
  id?: string;
  className?: string;
  innerClassName?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("scroll-mt-20", className)}>
      <div className={cn(containerClass, "py-20 md:py-28", innerClassName)}>{children}</div>
    </section>
  );
}

export function SectionHeading({
  id,
  title,
  lead,
  className,
}: {
  id: string;
  title: string;
  lead?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <h2
        id={id}
        className="font-display text-[2rem] leading-[1.15] font-semibold tracking-[-0.015em] md:text-[2.5rem]"
      >
        {title}
      </h2>
      {lead && <p className="text-muted mt-4 text-lg leading-relaxed">{lead}</p>}
    </div>
  );
}
