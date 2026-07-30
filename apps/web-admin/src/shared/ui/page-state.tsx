"use client";

import { useId, type ReactNode } from "react";

export type PageStateKind = "loading" | "empty" | "error";

export interface PageStateProps {
  readonly kind: PageStateKind;
  readonly title: string;
  readonly description?: string;
  readonly headingLevel?: 1 | 2 | 3;
  readonly visual?: ReactNode;
  readonly actions?: ReactNode;
}

interface StateHeadingProps {
  readonly level: 1 | 2 | 3;
  readonly id: string;
  readonly children: ReactNode;
}

function StateHeading({ level, id, children }: StateHeadingProps) {
  if (level === 1) {
    return <h1 id={id}>{children}</h1>;
  }

  if (level === 2) {
    return <h2 id={id}>{children}</h2>;
  }

  return <h3 id={id}>{children}</h3>;
}

export function PageState({
  kind,
  title,
  description,
  headingLevel = 2,
  visual,
  actions,
}: PageStateProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;

  return (
    <section
      className={`ui-page-state ui-page-state--${kind}`}
      aria-labelledby={titleId}
      aria-busy={kind === "loading"}
      aria-live={kind === "error" ? "assertive" : "polite"}
    >
      {visual === undefined ? (
        kind === "loading" ? (
          <span className="ui-spinner" aria-hidden="true" />
        ) : null
      ) : (
        <div className="ui-page-state__visual" aria-hidden="true">
          {visual}
        </div>
      )}

      <StateHeading level={headingLevel} id={titleId}>
        {title}
      </StateHeading>

      {description === undefined ? null : (
        <p className="ui-page-state__description">{description}</p>
      )}

      {actions === undefined ? null : <div className="ui-page-state__actions">{actions}</div>}
    </section>
  );
}
