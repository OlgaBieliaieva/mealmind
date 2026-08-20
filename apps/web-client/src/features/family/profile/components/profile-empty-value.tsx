import type { ReactNode } from "react";

interface ProfileEmptyValueProps {
  readonly children?: ReactNode;
}

export function ProfileEmptyValue({ children = "Не вказано" }: ProfileEmptyValueProps) {
  return <span className="profile-empty-value">{children}</span>;
}
