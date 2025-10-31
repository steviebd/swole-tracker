import { describe, it, expect, vi, beforeEach } from "vitest";
import { createQueryClient } from "~/trpc/query-client";

describe("createQueryClient", () => {
  let onAuthFailure: () => void;

  beforeEach(() => {
    onAuthFailure = vi.fn();
  });

  describe("query retry logic", () => {
    it("should not retry on UNAUTHORIZED tRPC errors and call onAuthFailure", () => {
      const queryClient = createQueryClient(onAuthFailure);

      const retryFn = queryClient.getDefaultOptions().queries?.retry as (
        failureCount: number,
        error: any,
      ) => boolean;

      const unauthorizedError = {
        data: {
          code: "UNAUTHORIZED",
        },
      };

      const shouldRetry = retryFn(0, unauthorizedError);

      expect(shouldRetry).toBe(false);
      expect(onAuthFailure).toHaveBeenCalledTimes(1);
    });

    it("should not retry on FORBIDDEN tRPC errors and call onAuthFailure", () => {
      const queryClient = createQueryClient(onAuthFailure);

      const retryFn = queryClient.getDefaultOptions().queries?.retry as (
        failureCount: number,
        error: any,
      ) => boolean;

      const forbiddenError = {
        data: {
          code: "FORBIDDEN",
        },
      };

      const shouldRetry = retryFn(0, forbiddenError);

      expect(shouldRetry).toBe(false);
      expect(onAuthFailure).toHaveBeenCalledTimes(1);
    });

    it("should retry once on other errors", () => {
      const queryClient = createQueryClient(onAuthFailure);

      const retryFn = queryClient.getDefaultOptions().queries?.retry as (
        failureCount: number,
        error: any,
      ) => boolean;

      const networkError = new Error("Network error");

      expect(retryFn(0, networkError)).toBe(true); // Should retry on first failure
      expect(retryFn(1, networkError)).toBe(false); // Should not retry on second failure
      expect(onAuthFailure).not.toHaveBeenCalled();
    });

    it("should not call onAuthFailure for non-auth errors", () => {
      const queryClient = createQueryClient(onAuthFailure);

      const retryFn = queryClient.getDefaultOptions().queries?.retry as (
        failureCount: number,
        error: any,
      ) => boolean;

      const notFoundError = {
        data: {
          code: "NOT_FOUND",
        },
      };

      retryFn(0, notFoundError);

      expect(onAuthFailure).not.toHaveBeenCalled();
    });

    it("should handle errors without data property", () => {
      const queryClient = createQueryClient(onAuthFailure);

      const retryFn = queryClient.getDefaultOptions().queries?.retry as (
        failureCount: number,
        error: any,
      ) => boolean;

      const plainError = new Error("Plain error");

      expect(retryFn(0, plainError)).toBe(true);
      expect(onAuthFailure).not.toHaveBeenCalled();
    });
  });

  describe("mutation retry logic", () => {
    it("should not retry on 401 HTTP status and call onAuthFailure", () => {
      const queryClient = createQueryClient(onAuthFailure);

      const retryFn = queryClient.getDefaultOptions().mutations?.retry as (
        failureCount: number,
        error: any,
      ) => boolean;

      const unauthorizedHttpError = {
        status: 401,
      };

      const shouldRetry = retryFn(0, unauthorizedHttpError);

      expect(shouldRetry).toBe(false);
      expect(onAuthFailure).toHaveBeenCalledTimes(1);
    });

    it("should not retry on other 4xx errors but not call onAuthFailure", () => {
      const queryClient = createQueryClient(onAuthFailure);

      const retryFn = queryClient.getDefaultOptions().mutations?.retry as (
        failureCount: number,
        error: any,
      ) => boolean;

      const badRequestError = {
        status: 400,
      };

      const shouldRetry = retryFn(0, badRequestError);

      expect(shouldRetry).toBe(false);
      expect(onAuthFailure).not.toHaveBeenCalled();
    });

    it("should retry once on non-4xx errors", () => {
      const queryClient = createQueryClient(onAuthFailure);

      const retryFn = queryClient.getDefaultOptions().mutations?.retry as (
        failureCount: number,
        error: any,
      ) => boolean;

      const serverError = {
        status: 500,
      };

      expect(retryFn(0, serverError)).toBe(true); // Should retry on first failure
      expect(retryFn(1, serverError)).toBe(false); // Should not retry on second failure
      expect(onAuthFailure).not.toHaveBeenCalled();
    });

    it("should handle errors without status property", () => {
      const queryClient = createQueryClient(onAuthFailure);

      const retryFn = queryClient.getDefaultOptions().mutations?.retry as (
        failureCount: number,
        error: any,
      ) => boolean;

      const plainError = new Error("Plain error");

      expect(retryFn(0, plainError)).toBe(true);
      expect(onAuthFailure).not.toHaveBeenCalled();
    });
  });

  describe("onAuthFailure callback", () => {
    it("should not call onAuthFailure when no callback provided", () => {
      const queryClient = createQueryClient();

      const queryRetryFn = queryClient.getDefaultOptions().queries?.retry as (
        failureCount: number,
        error: any,
      ) => boolean;
      const mutationRetryFn = queryClient.getDefaultOptions().mutations
        ?.retry as (failureCount: number, error: any) => boolean;

      const unauthorizedError = {
        data: {
          code: "UNAUTHORIZED",
        },
      };

      const unauthorizedHttpError = {
        status: 401,
      };

      // Should not throw or call undefined function
      expect(() => queryRetryFn(0, unauthorizedError)).not.toThrow();
      expect(() => mutationRetryFn(0, unauthorizedHttpError)).not.toThrow();
    });

    it("should call onAuthFailure for each auth error", () => {
      const queryClient = createQueryClient(onAuthFailure);

      const queryRetryFn = queryClient.getDefaultOptions().queries?.retry as (
        failureCount: number,
        error: any,
      ) => boolean;
      const mutationRetryFn = queryClient.getDefaultOptions().mutations
        ?.retry as (failureCount: number, error: any) => boolean;

      const unauthorizedError = {
        data: {
          code: "UNAUTHORIZED",
        },
      };

      const unauthorizedHttpError = {
        status: 401,
      };

      queryRetryFn(0, unauthorizedError);
      mutationRetryFn(0, unauthorizedHttpError);

      expect(onAuthFailure).toHaveBeenCalledTimes(2);
    });
  });

  describe("query client configuration", () => {
    it("should have conservative caching settings", () => {
      const queryClient = createQueryClient(onAuthFailure);
      const defaults = queryClient.getDefaultOptions();

      expect(defaults.queries?.staleTime).toBe(10 * 60 * 1000); // 10 minutes
      expect(defaults.queries?.gcTime).toBe(60 * 60 * 1000); // 1 hour
      expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
      expect(defaults.queries?.networkMode).toBe("offlineFirst");
    });

    it("should have conservative mutation settings", () => {
      const queryClient = createQueryClient(onAuthFailure);
      const defaults = queryClient.getDefaultOptions();

      expect(defaults.mutations?.networkMode).toBe("offlineFirst");
    });
  });
});
