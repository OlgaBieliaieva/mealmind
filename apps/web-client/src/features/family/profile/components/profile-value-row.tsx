import type { ReactNode } from "react";

interface ProfileValueRowProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly action?: ReactNode;
}

export function ProfileValueRow({ label, value, action }: ProfileValueRowProps) {
  return (
    <div className="profile-value-row">
      <dt className="profile-value-row__label">{label}</dt>

      <dd className="profile-value-row__value">
        <div className="profile-value-row__content">
          <span className="profile-value-row__text">{value}</span>

          {action === undefined ? null : (
            <span className="profile-value-row__action">{action}</span>
          )}
        </div>
      </dd>
    </div>
  );
}
