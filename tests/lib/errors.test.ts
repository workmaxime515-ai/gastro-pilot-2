import { describe, it, expect } from "vitest";
import { AppError, ValidationError, NotFoundError, ConflictError, handleApiError } from "@/lib/errors";

describe("AppError", () => {
  it("creates error with defaults", () => {
    const err = new AppError("test");
    expect(err.message).toBe("test");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("INTERNAL_ERROR");
  });

  it("creates error with custom status and code", () => {
    const err = new AppError("custom", 418, "TEAPOT");
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe("TEAPOT");
  });
});

describe("ValidationError", () => {
  it("has 400 status", () => {
    const err = new ValidationError("bad input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
  });
});

describe("NotFoundError", () => {
  it("has 404 status", () => {
    const err = new NotFoundError("Produkt");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Produkt nicht gefunden");
  });
});

describe("ConflictError", () => {
  it("has 409 status", () => {
    const err = new ConflictError("already exists");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });
});

describe("handleApiError", () => {
  it("handles AppError correctly", () => {
    const err = new ValidationError("bad");
    const response = handleApiError(err);
    expect(response.status).toBe(400);
  });

  it("handles Prisma P2025 (not found)", () => {
    const prismaErr = { code: "P2025" };
    const response = handleApiError(prismaErr);
    expect(response.status).toBe(404);
  });

  it("handles Prisma P2002 (duplicate)", () => {
    const prismaErr = { code: "P2002" };
    const response = handleApiError(prismaErr);
    expect(response.status).toBe(409);
  });

  it("handles unknown errors with 500", () => {
    const response = handleApiError(new Error("unknown"));
    expect(response.status).toBe(500);
  });

  it("handles non-Error objects", () => {
    const response = handleApiError("string error");
    expect(response.status).toBe(500);
  });
});
