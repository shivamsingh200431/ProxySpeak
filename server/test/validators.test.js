import { describe, expect, it, beforeEach } from "vitest";
import { validateJoinWorldPayload } from "../src/socket/validators.js";

describe("validateJoinWorldPayload", () => {
  it("accepts a valid name and trims surrounding whitespace", () => {
    expect(validateJoinWorldPayload({ name: "  Shivam  " })).toEqual({
      valid: true,
      name: "Shivam",
    });
  });

  it("rejects a null payload", () => {
    expect(validateJoinWorldPayload(null)).toMatchObject({
      valid: false,
      code: "INVALID_PAYLOAD",
    });
  });

  it("rejects arrays", () => {
    expect(validateJoinWorldPayload([])).toMatchObject({
      valid: false,
      code: "INVALID_PAYLOAD",
    });
  });

  it("rejects a missing or non-string name", () => {
    expect(validateJoinWorldPayload({})).toMatchObject({
      valid: false,
      code: "INVALID_NAME",
    });

    expect(validateJoinWorldPayload({ name: 123 })).toMatchObject({
      valid: false,
      code: "INVALID_NAME",
    });
  });

  it("rejects blank names", () => {
    expect(validateJoinWorldPayload({ name: "   " })).toMatchObject({
      valid: false,
      code: "INVALID_NAME",
    });
  });

  it("rejects names longer than 20 characters", () => {
    expect(validateJoinWorldPayload({ name: "123456789012345678901" })).toMatchObject({
      valid: false,
      code: "INVALID_NAME",
    });
  });
});
