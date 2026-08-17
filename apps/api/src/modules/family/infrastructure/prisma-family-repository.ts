import type { DatabaseClient } from "@mealmind/db";

import {
  ActiveWeightGoalNotFoundError,
  ActivityPeriodConflictError,
  DependentMemberRequiredError,
  FamilyMemberNotFoundError,
  FamilyOwnerRequiredError,
  InvalidAllergiesError,
  InvalidCuisinePreferencesError,
  InvalidDietaryRestrictionsError,
  InvalidDislikedProductsError,
  InvalidFamilyContextError,
  InvalidMealTypesError,
  InvalidNutrientTargetsError,
  OnboardingRequiredError,
  NutrientTargetConfigurationError,
  PersonProfileNotFoundError,
  WeightGoalConflictError,
} from "../application/family-errors.js";

import type {
  FamilyMemberView,
  FamilyRepository,
  FamilyRole,
  FamilyView,
  OnboardingInput,
  OwnProfileNutrientTargetSetView,
  OwnProfileView,
  ProfilePatchInput,
  SessionContext,
} from "../domain/family-repository.js";
import { calculateOnboardingNutritionTargets } from "../application/nutrient-target-calculator.js";
import {
  recalculateNutrientTargetsForProfileInPrisma,
  recalculateOwnNutrientTargetsInPrisma,
} from "./prisma-nutrient-target-recalculation.js";

type Db = DatabaseClient;

const DEFAULT_MEAL_TYPE_CODES = ["breakfast", "lunch", "dinner"] as const;

type MealTypePreferenceDatabase = Pick<Db, "mealType" | "personMealTypePreference">;

async function createDefaultMealTypePreferences(
  database: MealTypePreferenceDatabase,
  personProfileId: string,
): Promise<void> {
  const existingPreferenceCount = await database.personMealTypePreference.count({
    where: {
      personProfileId,
    },
  });

  /*
   * Defaults are bootstrap values only.
   *
   * If the profile already has any explicit meal-type preferences,
   * do not add missing defaults back. This prevents a later/repeated
   * bootstrap path from overriding a user's intentional configuration.
   */
  if (existingPreferenceCount > 0) {
    return;
  }

  const defaultMealTypes = await database.mealType.findMany({
    where: {
      code: {
        in: [...DEFAULT_MEAL_TYPE_CODES],
      },

      isActive: true,
    },

    select: {
      id: true,
      code: true,
    },
  });

  if (defaultMealTypes.length !== DEFAULT_MEAL_TYPE_CODES.length) {
    throw new InvalidMealTypesError();
  }

  const mealTypeByCode = new Map(defaultMealTypes.map((mealType) => [mealType.code, mealType.id]));

  await database.personMealTypePreference.createMany({
    data: DEFAULT_MEAL_TYPE_CODES.map((code) => {
      const mealTypeId = mealTypeByCode.get(code);

      if (mealTypeId === undefined) {
        throw new InvalidMealTypesError();
      }

      return {
        personProfileId,
        mealTypeId,
      };
    }),

    skipDuplicates: true,
  });
}

function dateOnly(value: Date | null): string | null {
  return value?.toISOString().slice(0, 10) ?? null;
}

function isoDateTime(value: Date): string {
  return value.toISOString();
}

function decimalString(
  value: {
    toString(): string;
  } | null,
): string | null {
  return value?.toString() ?? null;
}

function memberView(
  member: {
    id: string;

    personProfile: {
      id: string;
      userId: string | null;
      firstName: string;
      lastName: string | null;
      birthDate: Date | null;

      biologicalSex: "MALE" | "FEMALE" | "UNSPECIFIED" | null;
    };
  },

  actorUserId: string,
): FamilyMemberView {
  return Object.freeze({
    id: member.id,
    profileId: member.personProfile.id,
    firstName: member.personProfile.firstName,
    lastName: member.personProfile.lastName,
    birthDate: dateOnly(member.personProfile.birthDate),
    biologicalSex: member.personProfile.biologicalSex,
    isAccountOwner: member.personProfile.userId !== null,
    isOwnProfile: member.personProfile.userId === actorUserId,
  });
}

async function memberships(database: Db, userId: string) {
  return database.familyMembership.findMany({
    where: {
      userId,
      status: "ACTIVE",
      endedAt: null,

      family: {
        archivedAt: null,
      },
    },

    take: 2,

    include: {
      family: true,
    },
  });
}

async function currentMembership(database: Db, userId: string) {
  const found = await memberships(database, userId);

  if (found.length === 0) {
    throw new OnboardingRequiredError();
  }

  if (found.length !== 1) {
    throw new InvalidFamilyContextError();
  }

  return found[0]!;
}

function familyView(membership: Awaited<ReturnType<typeof currentMembership>>): FamilyView {
  return Object.freeze({
    id: membership.family.id,
    name: membership.family.name,
    timeZone: membership.family.timeZone,
    weekStartsOn: membership.family.weekStartsOn,
    role: membership.role as FamilyRole,
  });
}

async function ownerMembership(database: Db, userId: string) {
  const membership = await currentMembership(database, userId);

  if (membership.role !== "OWNER") {
    throw new FamilyOwnerRequiredError();
  }

  return membership;
}

const profileSelect = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  biologicalSex: true,
  profileCompletedAt: true,
} as const;

async function findMember(database: Db, familyId: string, memberId: string) {
  const member = await database.familyMember.findFirst({
    where: {
      id: memberId,
      familyId,
      archivedAt: null,
      personProfile: {
        archivedAt: null,
      },
    },

    include: {
      personProfile: {
        select: profileSelect,
      },
    },
  });

  if (member === null) {
    throw new FamilyMemberNotFoundError();
  }

  return member;
}

async function ownProfileForMutation(database: Db, userId: string) {
  await currentMembership(database, userId);

  const profile = await database.personProfile.findUnique({
    where: {
      userId,
    },

    select: {
      id: true,
      archivedAt: true,
    },
  });

  if (profile === null || profile.archivedAt !== null) {
    throw new PersonProfileNotFoundError();
  }

  return profile;
}

function profileData(input: ProfilePatchInput) {
  return {
    ...(input.firstName === undefined
      ? {}
      : {
          firstName: input.firstName,
        }),

    ...(input.lastName === undefined
      ? {}
      : {
          lastName: input.lastName,
        }),

    ...(input.birthDate === undefined
      ? {}
      : {
          birthDate: input.birthDate === null ? null : new Date(`${input.birthDate}T00:00:00.000Z`),
        }),

    ...(input.biologicalSex === undefined
      ? {}
      : {
          biologicalSex: input.biologicalSex,
        }),
  };
}

async function profileViewById(
  database: Db,
  familyId: string,
  personProfileId: string,
): Promise<OwnProfileView> {
  const profile = await database.personProfile.findUnique({
    where: {
      id: personProfileId,
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      biologicalSex: true,
      profileCompletedAt: true,
      archivedAt: true,

      familyMembers: {
        where: {
          familyId,
          archivedAt: null,
        },

        select: {
          id: true,
        },

        take: 1,
      },

      mealTypePreferences: {
        select: {
          mealType: {
            select: {
              id: true,
              code: true,
              nameUa: true,
              sortOrder: true,
            },
          },
        },

        orderBy: {
          mealType: {
            sortOrder: "asc",
          },
        },
      },

      cuisinePreferences: {
        select: {
          cuisine: {
            select: {
              id: true,
              code: true,
              nameUa: true,
            },
          },
        },

        orderBy: {
          cuisine: {
            sortOrder: "asc",
          },
        },
      },

      dislikedProducts: {
        select: {
          product: {
            select: {
              id: true,
              nameUa: true,
              nameEn: true,
            },
          },
        },

        orderBy: {
          createdAt: "asc",
        },
      },

      dietaryRestrictions: {
        select: {
          dietaryTag: {
            select: {
              id: true,
              code: true,
              nameUa: true,
            },
          },
        },

        orderBy: {
          dietaryTag: {
            sortOrder: "asc",
          },
        },
      },

      allergies: {
        where: {
          archivedAt: null,
        },

        select: {
          id: true,
          severity: true,

          allergen: {
            select: {
              id: true,
              code: true,
              nameUa: true,
            },
          },
        },

        orderBy: {
          createdAt: "asc",
        },
      },

      bodyMeasurements: {
        select: {
          id: true,
          heightCm: true,
          weightKg: true,
          measuredAt: true,
        },

        orderBy: [
          {
            measuredAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        take: 1,
      },

      activityPeriods: {
        where: {
          effectiveTo: null,
        },

        select: {
          id: true,
          activityLevel: true,
          effectiveFrom: true,
        },

        orderBy: [
          {
            effectiveFrom: "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        take: 1,
      },

      weightGoals: {
        where: {
          status: "ACTIVE",
          endedAt: null,
        },

        select: {
          id: true,
          type: true,
          status: true,
          targetWeightKg: true,
          targetRateKgPerWeek: true,
          targetDate: true,
          startsAt: true,
        },

        orderBy: [
          {
            startsAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        take: 1,
      },

      nutrientTargetSets: {
        where: {
          effectiveTo: null,
        },

        select: {
          id: true,
          source: true,
          calculationPolicyVersion: true,
          restingEnergyKcal: true,
          maintenanceEnergyKcal: true,
          effectiveFrom: true,

          targets: {
            select: {
              id: true,
              minimumValue: true,
              targetValue: true,
              maximumValue: true,
              source: true,

              nutrient: {
                select: {
                  id: true,
                  code: true,
                  nameUa: true,
                  unit: true,
                  sortOrder: true,
                },
              },
            },

            orderBy: {
              nutrient: {
                sortOrder: "asc",
              },
            },
          },
        },

        orderBy: {
          effectiveFrom: "desc",
        },

        take: 2,
      },
    },
  });

  if (profile === null || profile.archivedAt !== null) {
    throw new PersonProfileNotFoundError();
  }

  const familyMember = profile.familyMembers[0];

  if (familyMember === undefined) {
    throw new PersonProfileNotFoundError();
  }

  const measurement = profile.bodyMeasurements[0];

  const activity = profile.activityPeriods[0];

  const weightGoal = profile.weightGoals[0];

  if (profile.nutrientTargetSets.length > 1) {
    throw new NutrientTargetConfigurationError();
  }

  const currentTargetSet = profile.nutrientTargetSets[0];

  const currentNutritionTargets: OwnProfileNutrientTargetSetView | null =
    currentTargetSet === undefined
      ? null
      : Object.freeze({
          id: currentTargetSet.id,
          source: currentTargetSet.source,
          calculationPolicyVersion: currentTargetSet.calculationPolicyVersion,
          restingEnergyKcal: decimalString(currentTargetSet.restingEnergyKcal),
          maintenanceEnergyKcal: decimalString(currentTargetSet.maintenanceEnergyKcal),
          effectiveFrom: isoDateTime(currentTargetSet.effectiveFrom),
          targets: currentTargetSet.targets.map((target) =>
            Object.freeze({
              id: target.id,
              nutrient: Object.freeze({
                id: target.nutrient.id,
                code: target.nutrient.code,
                name: target.nutrient.nameUa,
                unit: target.nutrient.unit,
              }),
              minimumValue: decimalString(target.minimumValue),
              targetValue: decimalString(target.targetValue),
              maximumValue: decimalString(target.maximumValue),
              source: target.source,
            }),
          ),
        });

  return Object.freeze({
    id: profile.id,
    familyMemberId: familyMember.id,

    firstName: profile.firstName,
    lastName: profile.lastName,
    birthDate: dateOnly(profile.birthDate),
    biologicalSex: profile.biologicalSex,

    profileCompletedAt: profile.profileCompletedAt?.toISOString() ?? null,

    mealTypes: profile.mealTypePreferences.map(({ mealType }) =>
      Object.freeze({
        id: mealType.id,
        code: mealType.code,
        name: mealType.nameUa,
      }),
    ),

    cuisinePreferences: profile.cuisinePreferences.map(({ cuisine }) =>
      Object.freeze({
        id: cuisine.id,
        code: cuisine.code,
        name: cuisine.nameUa,
      }),
    ),

    dislikedProducts: profile.dislikedProducts.map(({ product }) =>
      Object.freeze({
        id: product.id,
        name: product.nameUa ?? product.nameEn,
      }),
    ),

    dietaryRestrictions: profile.dietaryRestrictions.map(({ dietaryTag }) =>
      Object.freeze({
        id: dietaryTag.id,
        code: dietaryTag.code,
        name: dietaryTag.nameUa,
      }),
    ),

    allergies: profile.allergies.map((allergy) =>
      Object.freeze({
        id: allergy.id,
        severity: allergy.severity,

        allergen: Object.freeze({
          id: allergy.allergen.id,
          code: allergy.allergen.code,
          name: allergy.allergen.nameUa,
        }),
      }),
    ),

    currentBodyMeasurement:
      measurement === undefined
        ? null
        : Object.freeze({
            id: measurement.id,
            heightCm: decimalString(measurement.heightCm),
            weightKg: decimalString(measurement.weightKg),
            measuredAt: isoDateTime(measurement.measuredAt),
          }),

    currentActivity:
      activity === undefined
        ? null
        : Object.freeze({
            id: activity.id,
            activityLevel: activity.activityLevel,
            effectiveFrom: isoDateTime(activity.effectiveFrom),
          }),

    currentWeightGoal:
      weightGoal === undefined
        ? null
        : Object.freeze({
            id: weightGoal.id,
            type: weightGoal.type,
            status: weightGoal.status,
            targetWeightKg: decimalString(weightGoal.targetWeightKg),
            targetRateKgPerWeek: decimalString(weightGoal.targetRateKgPerWeek),
            targetDate: dateOnly(weightGoal.targetDate),
            startsAt: isoDateTime(weightGoal.startsAt),
          }),

    nutritionTargets: Object.freeze({
      current: currentNutritionTargets,
    }),
  });
}

async function ownProfileView(database: Db, userId: string): Promise<OwnProfileView> {
  const membership = await currentMembership(database, userId);

  const profile = await database.personProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      archivedAt: true,
    },
  });

  if (profile === null || profile.archivedAt !== null) {
    throw new PersonProfileNotFoundError();
  }

  return profileViewById(database, membership.familyId, profile.id);
}

async function managedProfileForMutation(
  database: Db,
  userId: string,
  memberId: string,
): Promise<{ readonly id: string; readonly familyId: string }> {
  const membership = await ownerMembership(database, userId);
  const member = await findMember(database, membership.familyId, memberId);

  return Object.freeze({
    id: member.personProfile.id,
    familyId: membership.familyId,
  });
}

export function createPrismaFamilyRepository(database: DatabaseClient): FamilyRepository {
  const repository: FamilyRepository = {
    async readSession(userId): Promise<SessionContext> {
      const user = await database.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          onboardingCompletedAt: true,

          personProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (user === null) {
        throw new OnboardingRequiredError();
      }

      const found = await memberships(database, userId);

      if (found.length > 1) {
        throw new InvalidFamilyContextError();
      }

      if (user.onboardingCompletedAt !== null && found.length !== 1) {
        throw new InvalidFamilyContextError();
      }

      const membership = found[0];

      return Object.freeze({
        onboardingCompleted: user.onboardingCompletedAt !== null,

        profile: user.personProfile,

        family: membership === undefined ? null : familyView(membership),
      });
    },

    async completeOnboarding(userId, input: OnboardingInput) {
      await database.$transaction(async (tx) => {
        await tx.$queryRaw`
            SELECT id
            FROM users
            WHERE id = ${userId}::uuid
            FOR UPDATE
          `;

        const user = await tx.user.findUnique({
          where: {
            id: userId,
          },

          select: {
            onboardingCompletedAt: true,
          },
        });

        if (user === null) {
          throw new OnboardingRequiredError();
        }

        const active = await memberships(tx as Db, userId);

        if (
          active.length > 1 ||
          (user.onboardingCompletedAt !== null && active.length !== 1) ||
          (user.onboardingCompletedAt === null &&
            active.length === 1 &&
            active[0]?.role !== "OWNER")
        ) {
          throw new InvalidFamilyContextError();
        }

        if (user.onboardingCompletedAt !== null) {
          return;
        }

        const onboardingAt = new Date();
        const nutritionCalculation = calculateOnboardingNutritionTargets(input, onboardingAt);

        const completeProfile =
          input.birthDate !== undefined &&
          input.biologicalSex !== undefined &&
          input.heightCm !== undefined &&
          input.weightKg !== undefined &&
          input.activityLevel !== undefined &&
          input.weightGoalType !== undefined;

        const profile = await tx.personProfile.upsert({
          where: {
            userId,
          },

          create: {
            userId,
            firstName: input.firstName,

            ...(input.lastName === undefined
              ? {}
              : {
                  lastName: input.lastName,
                }),

            ...(input.birthDate === undefined
              ? {}
              : {
                  birthDate: new Date(`${input.birthDate}T00:00:00.000Z`),
                }),

            ...(input.biologicalSex === undefined
              ? {}
              : {
                  biologicalSex: input.biologicalSex,
                }),

            profileCompletedAt: completeProfile ? onboardingAt : null,
          },

          update: {
            ...profileData(input),

            archivedAt: null,

            ...(completeProfile
              ? {
                  profileCompletedAt: onboardingAt,
                }
              : {}),
          },
        });

        await createDefaultMealTypePreferences(tx, profile.id);

        let bodyMeasurementId: string | null = null;
        let activityPeriodId: string | null = null;

        if (input.heightCm !== undefined || input.weightKg !== undefined) {
          const measurement = await tx.bodyMeasurement.create({
            data: {
              personProfileId: profile.id,

              ...(input.heightCm === undefined
                ? {}
                : {
                    heightCm: input.heightCm,
                  }),

              ...(input.weightKg === undefined
                ? {}
                : {
                    weightKg: input.weightKg,
                  }),

              measuredAt: onboardingAt,

              source: "MANUAL",
            },
          });

          bodyMeasurementId = measurement.id;
        }

        if (input.activityLevel !== undefined) {
          const activityPeriod = await tx.personActivityPeriod.create({
            data: {
              personProfileId: profile.id,

              activityLevel: input.activityLevel,

              effectiveFrom: onboardingAt,

              source: "MANUAL",
            },
          });

          activityPeriodId = activityPeriod.id;
        }

        if (input.weightGoalType !== undefined) {
          await tx.personWeightGoal.create({
            data: {
              personProfileId: profile.id,

              type: input.weightGoalType,

              status: "ACTIVE",

              startsAt: onboardingAt,

              source: "MANUAL",
            },
          });
        }

        if (nutritionCalculation !== null) {
          const nutrientCodes = nutritionCalculation.targets.map((target) => target.nutrientCode);

          const nutrients = await tx.nutrient.findMany({
            where: {
              code: {
                in: nutrientCodes,
              },
              isActive: true,
              isTargetable: true,
            },
            select: {
              id: true,
              code: true,
            },
          });

          if (nutrients.length !== nutrientCodes.length) {
            throw new NutrientTargetConfigurationError();
          }

          const nutrientIdByCode = new Map(
            nutrients.map((nutrient) => [nutrient.code, nutrient.id]),
          );

          await tx.nutrientTargetSet.create({
            data: {
              personProfileId: profile.id,
              bodyMeasurementId,
              activityPeriodId,
              source: "CALCULATED",
              calculationPolicyVersion: nutritionCalculation.policyVersion,
              restingEnergyKcal: nutritionCalculation.restingEnergyKcal,
              maintenanceEnergyKcal: nutritionCalculation.maintenanceEnergyKcal,
              effectiveFrom: onboardingAt,
              targets: {
                create: nutritionCalculation.targets.map((target) => {
                  const nutrientId = nutrientIdByCode.get(target.nutrientCode);

                  if (nutrientId === undefined) {
                    throw new NutrientTargetConfigurationError();
                  }

                  return {
                    nutrientId,
                    minimumValue: target.minimumValue ?? null,
                    targetValue: target.targetValue ?? null,
                    maximumValue: target.maximumValue ?? null,
                    source: "CALCULATED" as const,
                  };
                }),
              },
            },
          });
        }

        let familyId = active[0]?.familyId;

        if (familyId === undefined) {
          const family = await tx.family.create({
            data: {
              name: "Моя сім'я",

              createdByUserId: userId,

              timeZone: "Europe/Kyiv",

              weekStartsOn: "MONDAY",
            },
          });

          familyId = family.id;

          await tx.familyMembership.create({
            data: {
              familyId,
              userId,
              role: "OWNER",
              status: "ACTIVE",
            },
          });
        }

        await tx.familyMember.upsert({
          where: {
            familyId_personProfileId: {
              familyId,
              personProfileId: profile.id,
            },
          },

          create: {
            familyId,
            personProfileId: profile.id,
          },

          update: {
            archivedAt: null,
          },
        });

        await tx.user.update({
          where: {
            id: userId,
          },

          data: {
            onboardingCompletedAt: onboardingAt,
          },
        });
      });

      return repository.readSession(userId);
    },

    async readFamily(userId) {
      return familyView(await currentMembership(database, userId));
    },

    async updateFamily(userId, input) {
      const membership = await ownerMembership(database, userId);

      const family = await database.family.update({
        where: {
          id: membership.familyId,
        },

        data: {
          ...(input.name === undefined
            ? {}
            : {
                name: input.name,
              }),

          ...(input.timeZone === undefined
            ? {}
            : {
                timeZone: input.timeZone,
              }),

          ...(input.weekStartsOn === undefined
            ? {}
            : {
                weekStartsOn: input.weekStartsOn as "MONDAY",
              }),
        },
      });

      return Object.freeze({
        id: family.id,
        name: family.name,
        timeZone: family.timeZone,
        weekStartsOn: family.weekStartsOn,
        role: "OWNER" as const,
      });
    },

    async listMembers(userId) {
      const membership = await currentMembership(database, userId);

      const found = await database.familyMember.findMany({
        where: {
          familyId: membership.familyId,
          archivedAt: null,
        },

        include: {
          personProfile: {
            select: profileSelect,
          },
        },

        orderBy: [
          {
            joinedAt: "asc",
          },
          {
            id: "asc",
          },
        ],
      });

      return found.map((member) => memberView(member, userId));
    },

    async createDependent(userId, input) {
      const membership = await ownerMembership(database, userId);

      const created = await database.$transaction(async (tx) => {
        const profile = await tx.personProfile.create({
          data: profileData(input) as never,
        });

        await createDefaultMealTypePreferences(tx, profile.id);

        return tx.familyMember.create({
          data: {
            familyId: membership.familyId,
            personProfileId: profile.id,
          },

          include: {
            personProfile: {
              select: profileSelect,
            },
          },
        });
      });

      return memberView(created, userId);
    },

    async updateDependent(userId, memberId, input) {
      const membership = await ownerMembership(database, userId);

      const member = await findMember(database, membership.familyId, memberId);

      const profile = await database.personProfile.update({
        where: {
          id: member.personProfile.id,
        },

        data: profileData(input),
      });

      return memberView(
        {
          ...member,
          personProfile: profile,
        },
        userId,
      );
    },

    async archiveDependent(userId, memberId) {
      const membership = await ownerMembership(database, userId);

      const member = await findMember(database, membership.familyId, memberId);

      if (member.personProfile.userId !== null) {
        throw new DependentMemberRequiredError();
      }

      const now = new Date();

      await database.$transaction([
        database.familyMember.update({
          where: {
            id: member.id,
          },

          data: {
            archivedAt: now,
          },
        }),

        database.personProfile.update({
          where: {
            id: member.personProfile.id,
          },

          data: {
            archivedAt: now,
          },
        }),
      ]);
    },

    async readOwnProfile(userId) {
      return ownProfileView(database, userId);
    },

    async updateOwnProfile(userId, input) {
      const profile = await ownProfileForMutation(database, userId);

      await database.personProfile.update({
        where: {
          id: profile.id,
        },

        data: profileData(input),
      });

      return repository.readOwnProfile(userId);
    },

    async replaceOwnMealTypes(userId, input) {
      const profile = await ownProfileForMutation(database, userId);

      await database.$transaction(async (tx) => {
        const availableMealTypes =
          input.mealTypeIds.length === 0
            ? []
            : await tx.mealType.findMany({
                where: {
                  id: {
                    in: [...input.mealTypeIds],
                  },

                  isActive: true,
                },

                select: {
                  id: true,
                },
              });

        if (availableMealTypes.length !== input.mealTypeIds.length) {
          throw new InvalidMealTypesError();
        }

        await tx.personMealTypePreference.deleteMany({
          where: {
            personProfileId: profile.id,
          },
        });

        if (input.mealTypeIds.length > 0) {
          await tx.personMealTypePreference.createMany({
            data: input.mealTypeIds.map((mealTypeId) => ({
              personProfileId: profile.id,
              mealTypeId,
            })),
          });
        }
      });

      return repository.readOwnProfile(userId);
    },

    async replaceOwnCuisinePreferences(userId, input) {
      const profile = await ownProfileForMutation(database, userId);

      await database.$transaction(async (tx) => {
        const availableCuisines =
          input.cuisineIds.length === 0
            ? []
            : await tx.cuisine.findMany({
                where: {
                  id: {
                    in: [...input.cuisineIds],
                  },

                  isActive: true,

                  isPreferenceSelectable: true,
                },

                select: {
                  id: true,
                },
              });

        if (availableCuisines.length !== input.cuisineIds.length) {
          throw new InvalidCuisinePreferencesError();
        }

        await tx.personCuisinePreference.deleteMany({
          where: {
            personProfileId: profile.id,
          },
        });

        if (input.cuisineIds.length > 0) {
          await tx.personCuisinePreference.createMany({
            data: input.cuisineIds.map((cuisineId) => ({
              personProfileId: profile.id,
              cuisineId,
            })),
          });
        }
      });

      return repository.readOwnProfile(userId);
    },

    async replaceOwnDislikedProducts(userId, input) {
      const profile = await ownProfileForMutation(database, userId);

      await database.$transaction(async (tx) => {
        const availableProducts =
          input.productIds.length === 0
            ? []
            : await tx.product.findMany({
                where: {
                  id: {
                    in: [...input.productIds],
                  },

                  status: "ACTIVE",
                },

                select: {
                  id: true,
                },
              });

        if (availableProducts.length !== input.productIds.length) {
          throw new InvalidDislikedProductsError();
        }

        await tx.personDislikedProduct.deleteMany({
          where: {
            personProfileId: profile.id,
          },
        });

        if (input.productIds.length > 0) {
          await tx.personDislikedProduct.createMany({
            data: input.productIds.map((productId) => ({
              personProfileId: profile.id,
              productId,
            })),
          });
        }
      });

      return repository.readOwnProfile(userId);
    },

    async replaceOwnDietaryRestrictions(userId, input) {
      const profile = await ownProfileForMutation(database, userId);

      await database.$transaction(async (tx) => {
        const availableTags =
          input.dietaryTagIds.length === 0
            ? []
            : await tx.dietaryTag.findMany({
                where: {
                  id: {
                    in: [...input.dietaryTagIds],
                  },

                  isActive: true,

                  isRestrictionSelectable: true,
                },

                select: {
                  id: true,
                },
              });

        if (availableTags.length !== input.dietaryTagIds.length) {
          throw new InvalidDietaryRestrictionsError();
        }

        await tx.personDietaryRestriction.deleteMany({
          where: {
            personProfileId: profile.id,
          },
        });

        if (input.dietaryTagIds.length > 0) {
          await tx.personDietaryRestriction.createMany({
            data: input.dietaryTagIds.map((dietaryTagId) => ({
              personProfileId: profile.id,
              dietaryTagId,
            })),
          });
        }
      });

      return repository.readOwnProfile(userId);
    },

    async replaceOwnAllergies(userId, input) {
      const profile = await ownProfileForMutation(database, userId);

      await database.$transaction(async (tx) => {
        const allergenIds = input.items.map((item) => item.allergenId);

        const availableAllergens =
          allergenIds.length === 0
            ? []
            : await tx.allergen.findMany({
                where: {
                  id: {
                    in: allergenIds,
                  },

                  isActive: true,
                },

                select: {
                  id: true,
                },
              });

        if (availableAllergens.length !== allergenIds.length) {
          throw new InvalidAllergiesError();
        }

        await tx.personAllergy.updateMany({
          where: {
            personProfileId: profile.id,
            archivedAt: null,
            ...(allergenIds.length === 0
              ? {}
              : {
                  allergenId: {
                    notIn: allergenIds,
                  },
                }),
          },

          data: {
            archivedAt: new Date(),
          },
        });

        for (const item of input.items) {
          await tx.personAllergy.upsert({
            where: {
              personProfileId_allergenId: {
                personProfileId: profile.id,
                allergenId: item.allergenId,
              },
            },

            create: {
              personProfileId: profile.id,
              allergenId: item.allergenId,
              severity: item.severity,
              source: "MANUAL",
            },

            update: {
              severity: item.severity,
              source: "MANUAL",
              archivedAt: null,
            },
          });
        }
      });

      return repository.readOwnProfile(userId);
    },

    async appendOwnBodyMeasurement(userId, input) {
      const profile = await ownProfileForMutation(database, userId);

      const measuredAt = input.measuredAt === undefined ? new Date() : new Date(input.measuredAt);

      /*
       * BodyMeasurement is append-only history.
       *
       * A new row is always created. When only one value is supplied,
       * the other value is carried forward from the latest snapshot at
       * or before the requested measurement time.
       */
      const previousMeasurement = await database.bodyMeasurement.findFirst({
        where: {
          personProfileId: profile.id,
          measuredAt: {
            lte: measuredAt,
          },
        },

        select: {
          heightCm: true,
          weightKg: true,
        },

        orderBy: [
          {
            measuredAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

      await database.bodyMeasurement.create({
        data: {
          personProfileId: profile.id,
          heightCm: input.heightCm ?? previousMeasurement?.heightCm ?? null,
          weightKg: input.weightKg ?? previousMeasurement?.weightKg ?? null,
          measuredAt,
          source: "MANUAL",
        },
      });

      return repository.readOwnProfile(userId);
    },

    async appendOwnActivityPeriod(userId, input) {
      const profile = await ownProfileForMutation(database, userId);

      const effectiveFrom =
        input.effectiveFrom === undefined ? new Date() : new Date(input.effectiveFrom);

      await database.$transaction(async (tx) => {
        /*
         * Serialize activity-period mutations for the profile so two
         * concurrent requests cannot create overlapping active periods.
         */
        await tx.$queryRaw`
          SELECT id
          FROM person_profiles
          WHERE id = ${profile.id}::uuid
          FOR UPDATE
        `;

        const existingAtSameStart = await tx.personActivityPeriod.findFirst({
          where: {
            personProfileId: profile.id,
            effectiveFrom,
          },

          select: {
            id: true,
          },
        });

        if (existingAtSameStart !== null) {
          throw new ActivityPeriodConflictError();
        }

        const previousPeriod = await tx.personActivityPeriod.findFirst({
          where: {
            personProfileId: profile.id,
            effectiveFrom: {
              lt: effectiveFrom,
            },
          },

          select: {
            id: true,
            effectiveTo: true,
          },

          orderBy: [
            {
              effectiveFrom: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        const nextPeriod = await tx.personActivityPeriod.findFirst({
          where: {
            personProfileId: profile.id,
            effectiveFrom: {
              gt: effectiveFrom,
            },
          },

          select: {
            effectiveFrom: true,
          },

          orderBy: [
            {
              effectiveFrom: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        });

        /*
         * If the new period starts inside the previous interval,
         * close that interval exactly at the new start timestamp.
         */
        if (
          previousPeriod !== null &&
          (previousPeriod.effectiveTo === null || previousPeriod.effectiveTo > effectiveFrom)
        ) {
          await tx.personActivityPeriod.update({
            where: {
              id: previousPeriod.id,
            },

            data: {
              effectiveTo: effectiveFrom,
            },
          });
        }

        /*
         * A backdated period ends when the next known period starts.
         * A latest period remains open-ended and becomes current.
         */
        await tx.personActivityPeriod.create({
          data: {
            personProfileId: profile.id,
            activityLevel: input.activityLevel,
            source: "MANUAL",
            effectiveFrom,
            effectiveTo: nextPeriod?.effectiveFrom ?? null,
          },
        });
      });

      return repository.readOwnProfile(userId);
    },

    async replaceOwnWeightGoal(userId, input) {
      const profile = await ownProfileForMutation(database, userId);

      const startsAt = input.startsAt === undefined ? new Date() : new Date(input.startsAt);

      await database.$transaction(async (tx) => {
        /*
         * Serialize weight-goal lifecycle mutations for the profile.
         * The schema permits multiple historical rows, so the repository
         * guarantees that only one ACTIVE + open-ended goal exists.
         */
        await tx.$queryRaw`
          SELECT id
          FROM person_profiles
          WHERE id = ${profile.id}::uuid
          FOR UPDATE
        `;

        const activeGoal = await tx.personWeightGoal.findFirst({
          where: {
            personProfileId: profile.id,
            status: "ACTIVE",
            endedAt: null,
          },

          select: {
            id: true,
            startsAt: true,
          },

          orderBy: [
            {
              startsAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        /*
         * In the MVP, weight-goal replacement is a forward-moving
         * lifecycle operation. Backdating a replacement before or exactly
         * at the current goal start would make the status history ambiguous.
         */
        if (activeGoal !== null && startsAt <= activeGoal.startsAt) {
          throw new WeightGoalConflictError();
        }

        if (activeGoal !== null) {
          await tx.personWeightGoal.update({
            where: {
              id: activeGoal.id,
            },

            data: {
              status: "SUPERSEDED",
              endedAt: startsAt,
            },
          });
        }

        await tx.personWeightGoal.create({
          data: {
            personProfileId: profile.id,
            type: input.type,
            status: "ACTIVE",
            targetWeightKg: input.targetWeightKg ?? null,
            targetRateKgPerWeek: input.targetRateKgPerWeek ?? null,
            targetDate:
              input.targetDate === undefined || input.targetDate === null
                ? null
                : new Date(`${input.targetDate}T00:00:00.000Z`),
            startsAt,
            endedAt: null,
            source: "MANUAL",
          },
        });
      });

      return repository.readOwnProfile(userId);
    },

    async completeOwnWeightGoal(userId) {
      const profile = await ownProfileForMutation(database, userId);

      await database.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT id
          FROM person_profiles
          WHERE id = ${profile.id}::uuid
          FOR UPDATE
        `;

        const activeGoal = await tx.personWeightGoal.findFirst({
          where: {
            personProfileId: profile.id,
            status: "ACTIVE",
            endedAt: null,
          },

          select: {
            id: true,
          },

          orderBy: [
            {
              startsAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        if (activeGoal === null) {
          throw new ActiveWeightGoalNotFoundError();
        }

        await tx.personWeightGoal.update({
          where: {
            id: activeGoal.id,
          },

          data: {
            status: "COMPLETED",
            endedAt: new Date(),
          },
        });
      });

      return repository.readOwnProfile(userId);
    },

    async cancelOwnWeightGoal(userId) {
      const profile = await ownProfileForMutation(database, userId);

      await database.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT id
          FROM person_profiles
          WHERE id = ${profile.id}::uuid
          FOR UPDATE
        `;

        const activeGoal = await tx.personWeightGoal.findFirst({
          where: {
            personProfileId: profile.id,
            status: "ACTIVE",
            endedAt: null,
          },

          select: {
            id: true,
          },

          orderBy: [
            {
              startsAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        if (activeGoal === null) {
          throw new ActiveWeightGoalNotFoundError();
        }

        await tx.personWeightGoal.update({
          where: {
            id: activeGoal.id,
          },

          data: {
            status: "CANCELLED",
            endedAt: new Date(),
          },
        });
      });

      return repository.readOwnProfile(userId);
    },

    async replaceOwnNutrientTargets(userId, input) {
      const profile = await ownProfileForMutation(database, userId);
      const effectiveFrom = new Date();

      await database.$transaction(async (tx) => {
        /*
         * NutrientTargetSet is an immutable/versioned nutrition snapshot.
         *
         * Database invariant:
         *   at most one current set per PersonProfile (effectiveTo IS NULL).
         *
         * PUT replaces the complete current snapshot. If a CALCULATED snapshot
         * is changed by the user, it is closed and a new MANUAL snapshot is
         * created. Unchanged copied targets preserve their individual source;
         * changed/new targets receive source = MANUAL.
         */
        await tx.$queryRaw`
          SELECT id
          FROM person_profiles
          WHERE id = ${profile.id}::uuid
          FOR UPDATE
        `;

        const nutrientIds = input.items.map((item) => item.nutrientId);

        const availableNutrients =
          nutrientIds.length === 0
            ? []
            : await tx.nutrient.findMany({
                where: {
                  id: {
                    in: nutrientIds,
                  },
                  isActive: true,
                  isTargetable: true,
                },
                select: {
                  id: true,
                },
              });

        if (availableNutrients.length !== nutrientIds.length) {
          throw new InvalidNutrientTargetsError();
        }

        const currentSets = await tx.nutrientTargetSet.findMany({
          where: {
            personProfileId: profile.id,
            effectiveTo: null,
          },
          select: {
            id: true,
            source: true,
            bodyMeasurementId: true,
            activityPeriodId: true,
            weightGoalId: true,
            calculationPolicyVersion: true,
            restingEnergyKcal: true,
            maintenanceEnergyKcal: true,
            targets: {
              select: {
                nutrientId: true,
                minimumValue: true,
                targetValue: true,
                maximumValue: true,
                source: true,
              },
            },
          },
          take: 2,
        });

        if (currentSets.length > 1) {
          throw new NutrientTargetConfigurationError();
        }

        const currentSet = currentSets[0];
        const currentTargetByNutrientId = new Map(
          (currentSet?.targets ?? []).map((target) => [target.nutrientId, target]),
        );

        const normalizedInput = input.items.map((item) => ({
          nutrientId: item.nutrientId,
          minimumValue: item.minimumValue ?? null,
          targetValue: item.targetValue ?? null,
          maximumValue: item.maximumValue ?? null,
        }));

        const sameDecimal = (
          persisted: { toString(): string } | null,
          requested: number | null,
        ): boolean => {
          if (persisted === null || requested === null) {
            return persisted === null && requested === null;
          }

          return Number(persisted.toString()) === requested;
        };

        const targetMatches = (
          persisted:
            | {
                minimumValue: { toString(): string } | null;
                targetValue: { toString(): string } | null;
                maximumValue: { toString(): string } | null;
              }
            | undefined,
          requested: {
            minimumValue: number | null;
            targetValue: number | null;
            maximumValue: number | null;
          },
        ): boolean =>
          persisted !== undefined &&
          sameDecimal(persisted.minimumValue, requested.minimumValue) &&
          sameDecimal(persisted.targetValue, requested.targetValue) &&
          sameDecimal(persisted.maximumValue, requested.maximumValue);

        const snapshotUnchanged =
          currentSet !== undefined &&
          currentSet.targets.length === normalizedInput.length &&
          normalizedInput.every((item) =>
            targetMatches(currentTargetByNutrientId.get(item.nutrientId), item),
          );

        /*
         * PUT is idempotent: resubmitting the same complete snapshot does not
         * create an unnecessary historical version.
         */
        if (snapshotUnchanged) {
          return;
        }

        if (currentSet !== undefined) {
          await tx.nutrientTargetSet.update({
            where: {
              id: currentSet.id,
            },
            data: {
              effectiveTo: effectiveFrom,
            },
          });
        }

        /*
         * items: [] intentionally means "no current nutrient targets".
         * The previous snapshot remains available historically.
         */
        if (normalizedInput.length === 0) {
          return;
        }

        await tx.nutrientTargetSet.create({
          data: {
            personProfileId: profile.id,
            bodyMeasurementId: currentSet?.bodyMeasurementId ?? null,
            activityPeriodId: currentSet?.activityPeriodId ?? null,
            weightGoalId: currentSet?.weightGoalId ?? null,
            source: "MANUAL",
            calculationPolicyVersion: currentSet?.calculationPolicyVersion ?? null,
            restingEnergyKcal: currentSet?.restingEnergyKcal ?? null,
            maintenanceEnergyKcal: currentSet?.maintenanceEnergyKcal ?? null,
            effectiveFrom,
            targets: {
              create: normalizedInput.map((item) => {
                const previous = currentTargetByNutrientId.get(item.nutrientId);
                const unchanged = targetMatches(previous, item);

                return {
                  nutrientId: item.nutrientId,
                  minimumValue: item.minimumValue,
                  targetValue: item.targetValue,
                  maximumValue: item.maximumValue,
                  source: unchanged ? previous!.source : ("MANUAL" as const),
                };
              }),
            },
          },
        });
      });

      return repository.readOwnProfile(userId);
    },

    async recalculateOwnNutrientTargets(userId) {
      await recalculateOwnNutrientTargetsInPrisma(database, userId);

      return repository.readOwnProfile(userId);
    },

    async readManagedProfile(userId, memberId) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      return profileViewById(database, profile.familyId, profile.id);
    },

    async updateManagedProfile(userId, memberId, input) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      await database.personProfile.update({
        where: {
          id: profile.id,
        },

        data: profileData(input),
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async replaceManagedMealTypes(userId, memberId, input) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      await database.$transaction(async (tx) => {
        const availableMealTypes =
          input.mealTypeIds.length === 0
            ? []
            : await tx.mealType.findMany({
                where: {
                  id: {
                    in: [...input.mealTypeIds],
                  },

                  isActive: true,
                },

                select: {
                  id: true,
                },
              });

        if (availableMealTypes.length !== input.mealTypeIds.length) {
          throw new InvalidMealTypesError();
        }

        await tx.personMealTypePreference.deleteMany({
          where: {
            personProfileId: profile.id,
          },
        });

        if (input.mealTypeIds.length > 0) {
          await tx.personMealTypePreference.createMany({
            data: input.mealTypeIds.map((mealTypeId) => ({
              personProfileId: profile.id,
              mealTypeId,
            })),
          });
        }
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async replaceManagedCuisinePreferences(userId, memberId, input) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      await database.$transaction(async (tx) => {
        const availableCuisines =
          input.cuisineIds.length === 0
            ? []
            : await tx.cuisine.findMany({
                where: {
                  id: {
                    in: [...input.cuisineIds],
                  },

                  isActive: true,

                  isPreferenceSelectable: true,
                },

                select: {
                  id: true,
                },
              });

        if (availableCuisines.length !== input.cuisineIds.length) {
          throw new InvalidCuisinePreferencesError();
        }

        await tx.personCuisinePreference.deleteMany({
          where: {
            personProfileId: profile.id,
          },
        });

        if (input.cuisineIds.length > 0) {
          await tx.personCuisinePreference.createMany({
            data: input.cuisineIds.map((cuisineId) => ({
              personProfileId: profile.id,
              cuisineId,
            })),
          });
        }
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async replaceManagedDislikedProducts(userId, memberId, input) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      await database.$transaction(async (tx) => {
        const availableProducts =
          input.productIds.length === 0
            ? []
            : await tx.product.findMany({
                where: {
                  id: {
                    in: [...input.productIds],
                  },

                  status: "ACTIVE",
                },

                select: {
                  id: true,
                },
              });

        if (availableProducts.length !== input.productIds.length) {
          throw new InvalidDislikedProductsError();
        }

        await tx.personDislikedProduct.deleteMany({
          where: {
            personProfileId: profile.id,
          },
        });

        if (input.productIds.length > 0) {
          await tx.personDislikedProduct.createMany({
            data: input.productIds.map((productId) => ({
              personProfileId: profile.id,
              productId,
            })),
          });
        }
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async replaceManagedDietaryRestrictions(userId, memberId, input) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      await database.$transaction(async (tx) => {
        const availableTags =
          input.dietaryTagIds.length === 0
            ? []
            : await tx.dietaryTag.findMany({
                where: {
                  id: {
                    in: [...input.dietaryTagIds],
                  },

                  isActive: true,

                  isRestrictionSelectable: true,
                },

                select: {
                  id: true,
                },
              });

        if (availableTags.length !== input.dietaryTagIds.length) {
          throw new InvalidDietaryRestrictionsError();
        }

        await tx.personDietaryRestriction.deleteMany({
          where: {
            personProfileId: profile.id,
          },
        });

        if (input.dietaryTagIds.length > 0) {
          await tx.personDietaryRestriction.createMany({
            data: input.dietaryTagIds.map((dietaryTagId) => ({
              personProfileId: profile.id,
              dietaryTagId,
            })),
          });
        }
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async replaceManagedAllergies(userId, memberId, input) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      await database.$transaction(async (tx) => {
        const allergenIds = input.items.map((item) => item.allergenId);

        const availableAllergens =
          allergenIds.length === 0
            ? []
            : await tx.allergen.findMany({
                where: {
                  id: {
                    in: allergenIds,
                  },

                  isActive: true,
                },

                select: {
                  id: true,
                },
              });

        if (availableAllergens.length !== allergenIds.length) {
          throw new InvalidAllergiesError();
        }

        await tx.personAllergy.updateMany({
          where: {
            personProfileId: profile.id,
            archivedAt: null,
            ...(allergenIds.length === 0
              ? {}
              : {
                  allergenId: {
                    notIn: allergenIds,
                  },
                }),
          },

          data: {
            archivedAt: new Date(),
          },
        });

        for (const item of input.items) {
          await tx.personAllergy.upsert({
            where: {
              personProfileId_allergenId: {
                personProfileId: profile.id,
                allergenId: item.allergenId,
              },
            },

            create: {
              personProfileId: profile.id,
              allergenId: item.allergenId,
              severity: item.severity,
              source: "MANUAL",
            },

            update: {
              severity: item.severity,
              source: "MANUAL",
              archivedAt: null,
            },
          });
        }
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async appendManagedBodyMeasurement(userId, memberId, input) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      const measuredAt = input.measuredAt === undefined ? new Date() : new Date(input.measuredAt);

      /*
       * BodyMeasurement is append-only history.
       *
       * A new row is always created. When only one value is supplied,
       * the other value is carried forward from the latest snapshot at
       * or before the requested measurement time.
       */
      const previousMeasurement = await database.bodyMeasurement.findFirst({
        where: {
          personProfileId: profile.id,
          measuredAt: {
            lte: measuredAt,
          },
        },

        select: {
          heightCm: true,
          weightKg: true,
        },

        orderBy: [
          {
            measuredAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

      await database.bodyMeasurement.create({
        data: {
          personProfileId: profile.id,
          heightCm: input.heightCm ?? previousMeasurement?.heightCm ?? null,
          weightKg: input.weightKg ?? previousMeasurement?.weightKg ?? null,
          measuredAt,
          source: "MANUAL",
        },
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async appendManagedActivityPeriod(userId, memberId, input) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      const effectiveFrom =
        input.effectiveFrom === undefined ? new Date() : new Date(input.effectiveFrom);

      await database.$transaction(async (tx) => {
        /*
         * Serialize activity-period mutations for the profile so two
         * concurrent requests cannot create overlapping active periods.
         */
        await tx.$queryRaw`
          SELECT id
          FROM person_profiles
          WHERE id = ${profile.id}::uuid
          FOR UPDATE
        `;

        const existingAtSameStart = await tx.personActivityPeriod.findFirst({
          where: {
            personProfileId: profile.id,
            effectiveFrom,
          },

          select: {
            id: true,
          },
        });

        if (existingAtSameStart !== null) {
          throw new ActivityPeriodConflictError();
        }

        const previousPeriod = await tx.personActivityPeriod.findFirst({
          where: {
            personProfileId: profile.id,
            effectiveFrom: {
              lt: effectiveFrom,
            },
          },

          select: {
            id: true,
            effectiveTo: true,
          },

          orderBy: [
            {
              effectiveFrom: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        const nextPeriod = await tx.personActivityPeriod.findFirst({
          where: {
            personProfileId: profile.id,
            effectiveFrom: {
              gt: effectiveFrom,
            },
          },

          select: {
            effectiveFrom: true,
          },

          orderBy: [
            {
              effectiveFrom: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        });

        /*
         * If the new period starts inside the previous interval,
         * close that interval exactly at the new start timestamp.
         */
        if (
          previousPeriod !== null &&
          (previousPeriod.effectiveTo === null || previousPeriod.effectiveTo > effectiveFrom)
        ) {
          await tx.personActivityPeriod.update({
            where: {
              id: previousPeriod.id,
            },

            data: {
              effectiveTo: effectiveFrom,
            },
          });
        }

        /*
         * A backdated period ends when the next known period starts.
         * A latest period remains open-ended and becomes current.
         */
        await tx.personActivityPeriod.create({
          data: {
            personProfileId: profile.id,
            activityLevel: input.activityLevel,
            source: "MANUAL",
            effectiveFrom,
            effectiveTo: nextPeriod?.effectiveFrom ?? null,
          },
        });
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async replaceManagedWeightGoal(userId, memberId, input) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      const startsAt = input.startsAt === undefined ? new Date() : new Date(input.startsAt);

      await database.$transaction(async (tx) => {
        /*
         * Serialize weight-goal lifecycle mutations for the profile.
         * The schema permits multiple historical rows, so the repository
         * guarantees that only one ACTIVE + open-ended goal exists.
         */
        await tx.$queryRaw`
          SELECT id
          FROM person_profiles
          WHERE id = ${profile.id}::uuid
          FOR UPDATE
        `;

        const activeGoal = await tx.personWeightGoal.findFirst({
          where: {
            personProfileId: profile.id,
            status: "ACTIVE",
            endedAt: null,
          },

          select: {
            id: true,
            startsAt: true,
          },

          orderBy: [
            {
              startsAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        /*
         * In the MVP, weight-goal replacement is a forward-moving
         * lifecycle operation. Backdating a replacement before or exactly
         * at the current goal start would make the status history ambiguous.
         */
        if (activeGoal !== null && startsAt <= activeGoal.startsAt) {
          throw new WeightGoalConflictError();
        }

        if (activeGoal !== null) {
          await tx.personWeightGoal.update({
            where: {
              id: activeGoal.id,
            },

            data: {
              status: "SUPERSEDED",
              endedAt: startsAt,
            },
          });
        }

        await tx.personWeightGoal.create({
          data: {
            personProfileId: profile.id,
            type: input.type,
            status: "ACTIVE",
            targetWeightKg: input.targetWeightKg ?? null,
            targetRateKgPerWeek: input.targetRateKgPerWeek ?? null,
            targetDate:
              input.targetDate === undefined || input.targetDate === null
                ? null
                : new Date(`${input.targetDate}T00:00:00.000Z`),
            startsAt,
            endedAt: null,
            source: "MANUAL",
          },
        });
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async completeManagedWeightGoal(userId, memberId) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      await database.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT id
          FROM person_profiles
          WHERE id = ${profile.id}::uuid
          FOR UPDATE
        `;

        const activeGoal = await tx.personWeightGoal.findFirst({
          where: {
            personProfileId: profile.id,
            status: "ACTIVE",
            endedAt: null,
          },

          select: {
            id: true,
          },

          orderBy: [
            {
              startsAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        if (activeGoal === null) {
          throw new ActiveWeightGoalNotFoundError();
        }

        await tx.personWeightGoal.update({
          where: {
            id: activeGoal.id,
          },

          data: {
            status: "COMPLETED",
            endedAt: new Date(),
          },
        });
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async cancelManagedWeightGoal(userId, memberId) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      await database.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT id
          FROM person_profiles
          WHERE id = ${profile.id}::uuid
          FOR UPDATE
        `;

        const activeGoal = await tx.personWeightGoal.findFirst({
          where: {
            personProfileId: profile.id,
            status: "ACTIVE",
            endedAt: null,
          },

          select: {
            id: true,
          },

          orderBy: [
            {
              startsAt: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        });

        if (activeGoal === null) {
          throw new ActiveWeightGoalNotFoundError();
        }

        await tx.personWeightGoal.update({
          where: {
            id: activeGoal.id,
          },

          data: {
            status: "CANCELLED",
            endedAt: new Date(),
          },
        });
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async replaceManagedNutrientTargets(userId, memberId, input) {
      const profile = await managedProfileForMutation(database, userId, memberId);
      const effectiveFrom = new Date();

      await database.$transaction(async (tx) => {
        /*
         * NutrientTargetSet is an immutable/versioned nutrition snapshot.
         *
         * Database invariant:
         *   at most one current set per PersonProfile (effectiveTo IS NULL).
         *
         * PUT replaces the complete current snapshot. If a CALCULATED snapshot
         * is changed by the user, it is closed and a new MANUAL snapshot is
         * created. Unchanged copied targets preserve their individual source;
         * changed/new targets receive source = MANUAL.
         */
        await tx.$queryRaw`
          SELECT id
          FROM person_profiles
          WHERE id = ${profile.id}::uuid
          FOR UPDATE
        `;

        const nutrientIds = input.items.map((item) => item.nutrientId);

        const availableNutrients =
          nutrientIds.length === 0
            ? []
            : await tx.nutrient.findMany({
                where: {
                  id: {
                    in: nutrientIds,
                  },
                  isActive: true,
                  isTargetable: true,
                },
                select: {
                  id: true,
                },
              });

        if (availableNutrients.length !== nutrientIds.length) {
          throw new InvalidNutrientTargetsError();
        }

        const currentSets = await tx.nutrientTargetSet.findMany({
          where: {
            personProfileId: profile.id,
            effectiveTo: null,
          },
          select: {
            id: true,
            source: true,
            bodyMeasurementId: true,
            activityPeriodId: true,
            weightGoalId: true,
            calculationPolicyVersion: true,
            restingEnergyKcal: true,
            maintenanceEnergyKcal: true,
            targets: {
              select: {
                nutrientId: true,
                minimumValue: true,
                targetValue: true,
                maximumValue: true,
                source: true,
              },
            },
          },
          take: 2,
        });

        if (currentSets.length > 1) {
          throw new NutrientTargetConfigurationError();
        }

        const currentSet = currentSets[0];
        const currentTargetByNutrientId = new Map(
          (currentSet?.targets ?? []).map((target) => [target.nutrientId, target]),
        );

        const normalizedInput = input.items.map((item) => ({
          nutrientId: item.nutrientId,
          minimumValue: item.minimumValue ?? null,
          targetValue: item.targetValue ?? null,
          maximumValue: item.maximumValue ?? null,
        }));

        const sameDecimal = (
          persisted: { toString(): string } | null,
          requested: number | null,
        ): boolean => {
          if (persisted === null || requested === null) {
            return persisted === null && requested === null;
          }

          return Number(persisted.toString()) === requested;
        };

        const targetMatches = (
          persisted:
            | {
                minimumValue: { toString(): string } | null;
                targetValue: { toString(): string } | null;
                maximumValue: { toString(): string } | null;
              }
            | undefined,
          requested: {
            minimumValue: number | null;
            targetValue: number | null;
            maximumValue: number | null;
          },
        ): boolean =>
          persisted !== undefined &&
          sameDecimal(persisted.minimumValue, requested.minimumValue) &&
          sameDecimal(persisted.targetValue, requested.targetValue) &&
          sameDecimal(persisted.maximumValue, requested.maximumValue);

        const snapshotUnchanged =
          currentSet !== undefined &&
          currentSet.targets.length === normalizedInput.length &&
          normalizedInput.every((item) =>
            targetMatches(currentTargetByNutrientId.get(item.nutrientId), item),
          );

        /*
         * PUT is idempotent: resubmitting the same complete snapshot does not
         * create an unnecessary historical version.
         */
        if (snapshotUnchanged) {
          return;
        }

        if (currentSet !== undefined) {
          await tx.nutrientTargetSet.update({
            where: {
              id: currentSet.id,
            },
            data: {
              effectiveTo: effectiveFrom,
            },
          });
        }

        /*
         * items: [] intentionally means "no current nutrient targets".
         * The previous snapshot remains available historically.
         */
        if (normalizedInput.length === 0) {
          return;
        }

        await tx.nutrientTargetSet.create({
          data: {
            personProfileId: profile.id,
            bodyMeasurementId: currentSet?.bodyMeasurementId ?? null,
            activityPeriodId: currentSet?.activityPeriodId ?? null,
            weightGoalId: currentSet?.weightGoalId ?? null,
            source: "MANUAL",
            calculationPolicyVersion: currentSet?.calculationPolicyVersion ?? null,
            restingEnergyKcal: currentSet?.restingEnergyKcal ?? null,
            maintenanceEnergyKcal: currentSet?.maintenanceEnergyKcal ?? null,
            effectiveFrom,
            targets: {
              create: normalizedInput.map((item) => {
                const previous = currentTargetByNutrientId.get(item.nutrientId);
                const unchanged = targetMatches(previous, item);

                return {
                  nutrientId: item.nutrientId,
                  minimumValue: item.minimumValue,
                  targetValue: item.targetValue,
                  maximumValue: item.maximumValue,
                  source: unchanged ? previous!.source : ("MANUAL" as const),
                };
              }),
            },
          },
        });
      });

      return profileViewById(database, profile.familyId, profile.id);
    },

    async recalculateManagedNutrientTargets(userId, memberId) {
      const profile = await managedProfileForMutation(database, userId, memberId);

      await recalculateNutrientTargetsForProfileInPrisma(database, profile.id);

      return profileViewById(database, profile.familyId, profile.id);
    },
  };

  return Object.freeze(repository);
}
