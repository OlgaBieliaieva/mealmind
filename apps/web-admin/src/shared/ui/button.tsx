import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
  readonly fullWidth?: boolean;
  readonly isLoading?: boolean;
  readonly loadingLabel?: string;
}

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  isLoading = false,
  loadingLabel = "Зачекайте…",
  type = "button",
  className,
  disabled,
  ...buttonProps
}: ButtonProps) {
  const classes = [
    "ui-button",
    `ui-button--${variant}`,
    fullWidth ? "ui-button--full-width" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      className={classes}
      type={type}
      disabled={disabled === true || isLoading}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <span className="ui-spinner" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
