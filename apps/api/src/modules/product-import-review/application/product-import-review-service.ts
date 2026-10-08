import {
  ProductImportCandidateNotFoundError,
  ProductImportReviewConflictError,
  ProductImportReviewInvariantError,
} from "./product-import-review-errors.js";
import type {
  JsonObject,
  ProductImportCandidateDetails,
  ProductImportCandidateListQuery,
  ProductImportCandidatePage,
  ProductImportCandidateStatus,
  ProductImportCatalogMatch,
  ProductImportReviewDecision,
  ProductImportReviewRepository,
} from "../domain/product-import-review-repository.js";

export interface ProductImportCandidateReviewDetails {
  readonly candidate: ProductImportCandidateDetails;
  readonly catalogMatches: readonly ProductImportCatalogMatch[];
}

export interface ReviewMutationInput {
  readonly expectedUpdatedAt: string;
  readonly comment?: string | null | undefined;
}

export interface UpdateReviewDraftInput extends ReviewMutationInput {
  readonly patch: JsonObject;
}

export interface DecideReviewInput extends ReviewMutationInput {
  readonly decision: ProductImportReviewDecision;
}

export interface ProductImportReviewService {
  list(query: ProductImportCandidateListQuery): Promise<ProductImportCandidatePage>;
  get(id: string): Promise<ProductImportCandidateReviewDetails>;
  start(
    id: string,
    input: ReviewMutationInput,
    actorUserId: string,
  ): Promise<ProductImportCandidateReviewDetails>;
  updateDraft(
    id: string,
    input: UpdateReviewDraftInput,
    actorUserId: string,
  ): Promise<ProductImportCandidateReviewDetails>;
  decide(
    id: string,
    input: DecideReviewInput,
    actorUserId: string,
  ): Promise<ProductImportCandidateReviewDetails>;
  reopen(
    id: string,
    input: ReviewMutationInput,
    actorUserId: string,
  ): Promise<ProductImportCandidateReviewDetails>;
}

export function createProductImportReviewService(
  repository: ProductImportReviewRepository,
  now: () => Date = () => new Date(),
): ProductImportReviewService {
  async function getCandidate(id: string): Promise<ProductImportCandidateDetails> {
    const candidate = await repository.findById(id);
    if (candidate === null) throw new ProductImportCandidateNotFoundError();
    return candidate;
  }

  async function details(
    candidate: ProductImportCandidateDetails,
  ): Promise<ProductImportCandidateReviewDetails> {
    return Object.freeze({
      candidate,
      catalogMatches: await repository.findCatalogMatches(candidate),
    });
  }

  async function mutate(
    candidate: ProductImportCandidateDetails,
    mutation: Parameters<ProductImportReviewRepository["mutate"]>[0],
  ): Promise<ProductImportCandidateReviewDetails> {
    const updated = await repository.mutate(mutation);
    if (updated === null) {
      throw new ProductImportReviewConflictError(
        "Candidate changed after it was loaded; refresh the review before retrying",
      );
    }
    return details(updated);
  }

  const service: ProductImportReviewService = {
    list: (query) => repository.list(query),

    async get(id) {
      return details(await getCandidate(id));
    },

    async start(id, input, actorUserId) {
      const candidate = await getCandidate(id);
      assertRevision(candidate, input.expectedUpdatedAt);

      if (candidate.status === "IN_REVIEW") {
        if (candidate.reviewedByUserId !== actorUserId) {
          throw new ProductImportReviewConflictError(
            "Candidate is already being reviewed by another administrator",
          );
        }
        return details(candidate);
      }
      if (candidate.status !== "PENDING" && candidate.status !== "DEFERRED") {
        throw invalidTransition(candidate.status, "IN_REVIEW");
      }

      return mutate(candidate, {
        id,
        actorUserId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        fromStatus: candidate.status,
        toStatus: "IN_REVIEW",
        action: "REVIEW_STARTED",
        comment: input.comment,
        reviewedAt: null,
      });
    },

    async updateDraft(id, input, actorUserId) {
      const candidate = await getCandidate(id);
      assertOwnedActiveReview(candidate, actorUserId, input.expectedUpdatedAt);
      const reviewDraft = Object.freeze({ ...candidate.reviewDraft, ...input.patch });

      return mutate(candidate, {
        id,
        actorUserId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        fromStatus: "IN_REVIEW",
        toStatus: "IN_REVIEW",
        action: "UPDATED",
        reviewDraft,
        changeSet: Object.freeze({ patch: input.patch }),
        comment: input.comment,
      });
    },

    async decide(id, input, actorUserId) {
      const candidate = await getCandidate(id);
      assertOwnedActiveReview(candidate, actorUserId, input.expectedUpdatedAt);
      if (input.decision === "REJECT" && !input.comment?.trim()) {
        throw new ProductImportReviewInvariantError("A rejection comment is required");
      }
      const target = decisionTarget(input.decision);

      return mutate(candidate, {
        id,
        actorUserId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        fromStatus: "IN_REVIEW",
        toStatus: target.status,
        action: target.action,
        changeSet: Object.freeze({ decision: input.decision }),
        comment: input.comment,
        reviewedAt: now(),
      });
    },

    async reopen(id, input, actorUserId) {
      const candidate = await getCandidate(id);
      assertRevision(candidate, input.expectedUpdatedAt);
      if (
        candidate.status !== "APPROVED" &&
        candidate.status !== "REJECTED" &&
        candidate.status !== "DEFERRED"
      ) {
        throw invalidTransition(candidate.status, "IN_REVIEW");
      }

      return mutate(candidate, {
        id,
        actorUserId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        fromStatus: candidate.status,
        toStatus: "IN_REVIEW",
        action: "REOPENED",
        comment: input.comment,
        reviewedAt: null,
      });
    },
  };

  return Object.freeze(service);
}

function assertRevision(candidate: ProductImportCandidateDetails, expectedUpdatedAt: string): void {
  if (candidate.updatedAt !== expectedUpdatedAt) {
    throw new ProductImportReviewConflictError(
      "Candidate changed after it was loaded; refresh the review before retrying",
    );
  }
}

function assertOwnedActiveReview(
  candidate: ProductImportCandidateDetails,
  actorUserId: string,
  expectedUpdatedAt: string,
): void {
  assertRevision(candidate, expectedUpdatedAt);
  if (candidate.status !== "IN_REVIEW") throw invalidTransition(candidate.status, "IN_REVIEW");
  if (candidate.reviewedByUserId !== actorUserId) {
    throw new ProductImportReviewConflictError(
      "Candidate is being reviewed by another administrator",
    );
  }
}

function invalidTransition(from: ProductImportCandidateStatus, to: ProductImportCandidateStatus) {
  return new ProductImportReviewConflictError(`Candidate cannot transition from ${from} to ${to}`);
}

function decisionTarget(decision: ProductImportReviewDecision): {
  readonly status: "APPROVED" | "REJECTED" | "DEFERRED";
  readonly action: "APPROVED" | "REJECTED" | "DEFERRED";
} {
  if (decision === "APPROVE") return { status: "APPROVED", action: "APPROVED" };
  if (decision === "REJECT") return { status: "REJECTED", action: "REJECTED" };
  return { status: "DEFERRED", action: "DEFERRED" };
}
