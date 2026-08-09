export abstract class RepositoryError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class WorkNotFoundError extends RepositoryError {
  constructor(readonly id: number) {
    super(`Work ${id} does not exist`);
  }
}

export class RateLimitedError extends RepositoryError {
  constructor(readonly retryAfterSeconds: number | null) {
    super(
      retryAfterSeconds === null
        ? "Rate limited by the upstream API"
        : `Rate limited by the upstream API; retry in ${retryAfterSeconds}s`,
    );
  }
}

export class RepositoryUnavailableError extends RepositoryError {
  constructor(message: string) {
    super(message);
  }
}
