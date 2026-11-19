import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "./cn";

/** Scrolls horizontally inside its own box so wide tables never widen the page. */
export function Table({
  className,
  caption,
  ...props
}: HTMLAttributes<HTMLTableElement> & { caption: string }) {
  return (
    <div className="border-border bg-surface overflow-x-auto rounded-xl border">
      <table className={cn("w-full text-left text-sm", className)} {...props}>
        <caption className="sr-only">{caption}</caption>
        {props.children}
      </table>
    </div>
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "border-border bg-surface-muted text-muted border-b px-4 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-border border-b px-4 py-3 align-top", className)} {...props} />;
}
