import type { DatabaseClient } from "@mealmind/db";

import {
  NutritionCalculationUnavailableError,
  NutrientTargetConfigurationError,
  PersonProfileNotFoundError,
} from "../application/family-errors.js";

import { calculateNutritionTargets } from "../application/nutrient-target-calculator.js";

export async function recalculateNutrientTargetsForProfileInPrisma(
  database: DatabaseClient,
  personProfileId: string,
): Promise<void> {
  await database.$transaction(async (tx) => {
    await tx.$queryRaw`
        SELECT id
        FROM person_profiles
        WHERE id = ${personProfileId}::uuid
          AND archived_at IS NULL
        FOR UPDATE
      `;

    const profile = await tx.personProfile.findUnique({
      where: {
        id: personProfileId,
      },

      select: {
        id: true,
        archivedAt: true,
        birthDate: true,
        biologicalSex: true,

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
      },
    });

    if (profile === null || profile.archivedAt !== null) {
      throw new PersonProfileNotFoundError();
    }

    const measurement = profile.bodyMeasurements[0];

    const activity = profile.activityPeriods[0];

    if (
      profile.birthDate === null ||
      (profile.biologicalSex !== "MALE" && profile.biologicalSex !== "FEMALE") ||
      measurement === undefined ||
      measurement.heightCm === null ||
      measurement.weightKg === null ||
      activity === undefined
    ) {
      throw new NutritionCalculationUnavailableError();
    }

    const calculatedAt = new Date();

    const calculation = calculateNutritionTargets(
      {
        birthDate: profile.birthDate.toISOString().slice(0, 10),

        biologicalSex: profile.biologicalSex,

        heightCm: Number(measurement.heightCm),

        weightKg: Number(measurement.weightKg),

        activityLevel: activity.activityLevel,
      },
      calculatedAt,
    );

    if (calculation === null) {
      throw new NutritionCalculationUnavailableError();
    }

    const nutrientCodes = calculation.targets.map((target) => target.nutrientCode);

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

    const nutrientIdByCode = new Map(nutrients.map((nutrient) => [nutrient.code, nutrient.id]));

    for (const code of nutrientCodes) {
      if (!nutrientIdByCode.has(code)) {
        throw new NutrientTargetConfigurationError();
      }
    }

    /*
     * Close the currently effective snapshot before
     * creating the new one. This keeps the
     * nutrient_target_sets_one_current invariant valid.
     */
    await tx.nutrientTargetSet.updateMany({
      where: {
        personProfileId: profile.id,

        effectiveTo: null,
      },

      data: {
        effectiveTo: calculatedAt,
      },
    });

    await tx.nutrientTargetSet.create({
      data: {
        personProfileId: profile.id,

        bodyMeasurementId: measurement.id,

        activityPeriodId: activity.id,

        source: "CALCULATED",

        calculationPolicyVersion: calculation.policyVersion,

        restingEnergyKcal: calculation.restingEnergyKcal,

        maintenanceEnergyKcal: calculation.maintenanceEnergyKcal,

        effectiveFrom: calculatedAt,

        targets: {
          create: calculation.targets.map((target) => {
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
  });
}

export async function recalculateOwnNutrientTargetsInPrisma(
  database: DatabaseClient,
  userId: string,
): Promise<void> {
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

  await recalculateNutrientTargetsForProfileInPrisma(database, profile.id);
}
