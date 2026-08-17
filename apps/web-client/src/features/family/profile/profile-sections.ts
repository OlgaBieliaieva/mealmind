import type { ProfileSectionComponent } from "./profile-section.types";

import { AccountSecuritySection } from "./sections/account-security-section";
import { BodyActivitySection } from "./sections/body-activity-section";
import { FamilySection } from "./sections/family-section";
import { FoodPreferencesSection } from "./sections/food-preferences-section";
import { NutritionTargetsSection } from "./sections/nutrition-targets-section";
import { PersonalInformationSection } from "./sections/personal-information-section";
import { WeightGoalSection } from "./sections/weight-goal-section";

const sharedProfileSections = [
  PersonalInformationSection,
  BodyActivitySection,
  WeightGoalSection,
  NutritionTargetsSection,
  FoodPreferencesSection,
] satisfies readonly ProfileSectionComponent[];

export const profileSections = [
  ...sharedProfileSections,
  FamilySection,
  AccountSecuritySection,
] satisfies readonly ProfileSectionComponent[];

export const managedProfileSections = [
  ...sharedProfileSections,
] satisfies readonly ProfileSectionComponent[];
