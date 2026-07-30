import type { HTMLAttributes, ReactNode } from "react";

export type CardPadding = "none" | "compact" | "default";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  readonly children: ReactNode;
  readonly padding?: CardPadding;
}

export function Card({ children, padding = "default", className, ...cardProps }: CardProps) {
  const classes = ["ui-card", `ui-card--${padding}`, className].filter(Boolean).join(" ");

  return (
    <div {...cardProps} className={classes}>
      {children}
    </div>
  );
}
