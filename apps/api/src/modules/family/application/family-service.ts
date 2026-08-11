import type {
  FamilyRepository,
  OnboardingInput,
  ProfileInput,
  ProfilePatchInput,
} from "../domain/family-repository.js";

export function createFamilyService(repository: FamilyRepository) {
  return Object.freeze({
    readSession: (userId: string) => repository.readSession(userId),
    completeOnboarding: (userId: string, input: OnboardingInput) =>
      repository.completeOnboarding(userId, input),
    readFamily: (userId: string) => repository.readFamily(userId),
    updateFamily: (
      userId: string,
      input: {
        readonly name?: string | undefined;
        readonly timeZone?: string | undefined;
        readonly weekStartsOn?: string | undefined;
      },
    ) => repository.updateFamily(userId, input),
    listMembers: (userId: string) => repository.listMembers(userId),
    createDependent: (userId: string, input: ProfileInput) =>
      repository.createDependent(userId, input),
    updateDependent: (userId: string, memberId: string, input: ProfilePatchInput) =>
      repository.updateDependent(userId, memberId, input),
    archiveDependent: (userId: string, memberId: string) =>
      repository.archiveDependent(userId, memberId),
    readOwnProfile: (userId: string) => repository.readOwnProfile(userId),
    updateOwnProfile: (userId: string, input: ProfilePatchInput) =>
      repository.updateOwnProfile(userId, input),
  });
}

export type FamilyService = ReturnType<typeof createFamilyService>;
