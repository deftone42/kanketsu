import { describe, it, expect } from "vitest";
import {
  RepositoryError,
  WorkNotFoundError,
  RateLimitedError,
  RepositoryUnavailableError,
} from "./repository-errors";

describe("repository errors", () => {
  it("distinguishes a missing work from a rate limit", () => {
    const notFound = new WorkNotFoundError(9183);
    const limited = new RateLimitedError(60);

    expect(notFound).toBeInstanceOf(WorkNotFoundError);
    expect(notFound).not.toBeInstanceOf(RateLimitedError);
    expect(limited).toBeInstanceOf(RateLimitedError);
  });

  it("shares a common base so callers can catch broadly", () => {
    expect(new WorkNotFoundError(1)).toBeInstanceOf(RepositoryError);
    expect(new RateLimitedError(null)).toBeInstanceOf(RepositoryError);
    expect(new RepositoryUnavailableError("boom")).toBeInstanceOf(
      RepositoryError,
    );
  });

  it("carries the id that was not found", () => {
    expect(new WorkNotFoundError(9183).id).toBe(9183);
  });

  it("carries the retry hint, which may be absent", () => {
    expect(new RateLimitedError(42).retryAfterSeconds).toBe(42);
    expect(new RateLimitedError(null).retryAfterSeconds).toBeNull();
  });

  it("sets a readable name on each error", () => {
    expect(new WorkNotFoundError(1).name).toBe("WorkNotFoundError");
    expect(new RateLimitedError(null).name).toBe("RateLimitedError");
  });
});
