"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

/**
 * Link to a section of a page ("/#como-funciona"). On that same page it scrolls
 * smoothly every time it's clicked; Next's router skips the scroll when the URL
 * already has that hash, which made a second click do nothing. From other pages it
 * navigates normally and the browser lands on the section.
 */
export function SectionLink({
  href,
  className,
  children,
}: {
  href: `/#${string}`;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const sectionId = href.slice(2);

  function scrollToSection(event: MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/") return;
    const target = document.getElementById(sectionId);
    if (!target) return;

    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // No URL update here: changing the hash makes Next's router cut the smooth scroll short.
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <Link href={href} className={className} onClick={scrollToSection}>
      {children}
    </Link>
  );
}
