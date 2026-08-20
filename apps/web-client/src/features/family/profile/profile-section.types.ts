import type { ComponentType } from "react";

import type { OwnProfile } from "@/shared/api/family";

export interface ProfileSectionProps {
  readonly profile: OwnProfile;
}

export type ProfileSectionComponent = ComponentType<ProfileSectionProps> & {
  sectionId: string;
};
