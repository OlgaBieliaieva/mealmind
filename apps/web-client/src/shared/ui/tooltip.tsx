import type { ReactNode } from "react";

export interface TooltipProps {
  readonly content: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const classes = ["ui-tooltip", className].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      {children}

      <span className="ui-tooltip__content" role="tooltip">
        {content}
      </span>
    </span>
  );
}
