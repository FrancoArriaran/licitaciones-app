/**
 * Expected business failure. The web layer shows `message` to the user as-is,
 * so it must be Spanish, plain, and say what to do next.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly code = "validation_error";

  constructor(
    message: string,
    readonly fieldErrors: Readonly<Record<string, string[]>> = {},
  ) {
    super(message);
  }
}

export class NotAuthorizedError extends DomainError {
  readonly code = "not_authorized";

  constructor(message = "No tienes permiso para realizar esta acción.") {
    super(message);
  }
}

export class NotFoundError extends DomainError {
  readonly code = "not_found";
}
