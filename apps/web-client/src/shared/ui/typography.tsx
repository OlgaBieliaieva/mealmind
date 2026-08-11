import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

export type TypographyVariant =
  | "eyebrow"
  | "page-title"
  | "page-description"
  | "section-title"
  | "item-title"
  | "body"
  | "supporting"
  | "caption";

export type TypographyProps<T extends ElementType = "p"> = {
  readonly as?: T;
  readonly variant?: TypographyVariant;
  readonly children: ReactNode;
  readonly className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Typography<T extends ElementType = "p">({
  as,
  variant = "body",
  children,
  className,
  ...typographyProps
}: TypographyProps<T>) {
  const Component = as ?? "p";

  const classes = ["ui-typography", `ui-typography--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Component {...typographyProps} className={classes}>
      {children}
    </Component>
  );
}
