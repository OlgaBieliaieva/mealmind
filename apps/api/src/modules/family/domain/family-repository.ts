export type BiologicalSex = "MALE" | "FEMALE" | "UNSPECIFIED";
export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
export type WeightGoalType = "MAINTAIN" | "LOSE" | "GAIN";
export type FamilyRole = "OWNER" | "MEMBER";

export interface OnboardingInput {
  readonly firstName: string;
  readonly lastName?: string | undefined;
  readonly birthDate?: string | undefined;
  readonly biologicalSex?: BiologicalSex | undefined;
  readonly heightCm?: number | undefined;
  readonly weightKg?: number | undefined;
  readonly activityLevel?: ActivityLevel | undefined;
  readonly weightGoalType?: WeightGoalType | undefined;
}

export interface ProfileInput {
  readonly firstName: string;
  readonly lastName?: string | null | undefined;
  readonly birthDate?: string | null | undefined;
  readonly biologicalSex?: BiologicalSex | null | undefined;
}

export interface ProfilePatchInput {
  readonly firstName?: string | undefined;
  readonly lastName?: string | null | undefined;
  readonly birthDate?: string | null | undefined;
  readonly biologicalSex?: BiologicalSex | null | undefined;
}

export interface SessionContext {
  readonly onboardingCompleted: boolean;
  readonly profile: {
    readonly id: string;
    readonly firstName: string;
    readonly lastName: string | null;
  } | null;
  readonly family: {
    readonly id: string;
    readonly name: string;
    readonly timeZone: string;
    readonly weekStartsOn: string;
    readonly role: FamilyRole;
  } | null;
}

export interface FamilyMemberView {
  readonly id: string;
  readonly profileId: string;
  readonly firstName: string;
  readonly lastName: string | null;
  readonly birthDate: string | null;
  readonly biologicalSex: BiologicalSex | null;
  readonly isAccountOwner: boolean;
}

export interface FamilyView {
  readonly id: string;
  readonly name: string;
  readonly timeZone: string;
  readonly weekStartsOn: string;
  readonly role: FamilyRole;
}

export interface FamilyRepository {
  readSession(userId: string): Promise<SessionContext>;
  completeOnboarding(userId: string, input: OnboardingInput): Promise<SessionContext>;
  readFamily(userId: string): Promise<FamilyView>;
  updateFamily(
    userId: string,
    input: {
      readonly name?: string | undefined;
      readonly timeZone?: string | undefined;
      readonly weekStartsOn?: string | undefined;
    },
  ): Promise<FamilyView>;
  listMembers(userId: string): Promise<readonly FamilyMemberView[]>;
  createDependent(userId: string, input: ProfileInput): Promise<FamilyMemberView>;
  updateDependent(
    userId: string,
    memberId: string,
    input: ProfilePatchInput,
  ): Promise<FamilyMemberView>;
  archiveDependent(userId: string, memberId: string): Promise<void>;
  readOwnProfile(userId: string): Promise<FamilyMemberView>;
  updateOwnProfile(userId: string, input: ProfilePatchInput): Promise<FamilyMemberView>;
}
