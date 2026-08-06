/** Base for every failure the repository port may raise. */
export abstract class RepositoryError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The work genuinely does not exist. Traversal should skip it and continue. */
export class WorkNotFoundError extends RepositoryError {
  constructor(readonly id: number) {
    super(`Work ${id} does not exist`);
  }
}

/** The upstream API refused us for volume. Traversal must stop, not truncate. */
export class RateLimitedError extends RepositoryError {
  constructor(readonly retryAfterSeconds: number | null) {
    super(
      retryAfterSeconds === null
        ? "Rate limited by the upstream API"
        : `Rate limited by the upstream API; retry in ${retryAfterSeconds}s`,
    );
  }
}

/** Network failure, server error, or a response we could not parse. */
export class RepositoryUnavailableError extends RepositoryError {
  constructor(message: string) {
    super(message);
  }
}
