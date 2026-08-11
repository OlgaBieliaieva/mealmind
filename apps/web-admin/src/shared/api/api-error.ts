export interface ApiErrorIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export interface ApiClientErrorOptions {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
  readonly requestId?: string;
  readonly issues?: readonly ApiErrorIssue[];
}

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly requestId: string | undefined;
  readonly issues: readonly ApiErrorIssue[];

  constructor(options: ApiClientErrorOptions) {
    super(options.message);

    this.name = "ApiClientError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.requestId = options.requestId;
    this.issues = Object.freeze([...(options.issues ?? [])]);
  }
}

export function isRetryableApiError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  return error instanceof ApiClientError && error.statusCode >= 500;
}

export function getUserFacingErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return "Не вдалося виконати запит. Спробуйте ще раз.";
  }

  switch (error.code) {
    case "AUTHENTICATION_REQUIRED":
      return "Сеанс завершився. Увійдіть у систему повторно.";

    case "ACCOUNT_ACCESS_DENIED":
    case "FAMILY_ACCESS_DENIED":
      return "У вас немає доступу до цієї дії.";

    case "RATE_LIMIT_EXCEEDED":
      return "Забагато запитів. Зачекайте трохи та спробуйте знову.";

    case "VALIDATION_ERROR":
    case "REQUEST_VALIDATION_FAILED":
      return "Перевірте введені дані.";

    case "REFERENCE_CONFLICT":
      return "Таке значення вже існує. Перевірте код, назву або зовнішній ідентифікатор.";

    case "INVALID_REFERENCE_RELATION":
    case "INVALID_REFERENCE_HIERARCHY":
      return "Неможливо застосувати зв’язок: перевірте ієрархію та активність пов’язаних значень.";

    case "REFERENCE_NOT_FOUND":
      return "Значення довідника більше не існує. Оновіть список.";

    default:
      if (error.statusCode >= 500) {
        return "Сервіс тимчасово недоступний. Спробуйте пізніше.";
      }

      return "Не вдалося виконати запит.";
  }
}
