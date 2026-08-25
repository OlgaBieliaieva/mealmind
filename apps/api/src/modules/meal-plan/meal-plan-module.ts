import type { DatabaseClient } from "@mealmind/db";
import type { Router } from "express";

import type { AuthenticationService } from "../../application/authentication/authentication-service.js";
import { createActiveFamilyContextResolver } from "../../application/family-context/active-family-context.js";
import { createMealPlanService } from "./application/meal-plan-service.js";
import { createPrismaMealPlanRepository } from "./infrastructure/prisma-meal-plan-repository.js";
import { createMealPlanRouter } from "./transport/meal-plan-router.js";

export interface MealPlanModule {
  readonly router: Router;
}

export function createMealPlanModule(
  database: DatabaseClient,
  authenticationService: AuthenticationService,
): MealPlanModule {
  return Object.freeze({
    router: createMealPlanRouter(
      createMealPlanService(
        createPrismaMealPlanRepository(database),
        createActiveFamilyContextResolver(database),
      ),
      authenticationService,
    ),
  });
}
