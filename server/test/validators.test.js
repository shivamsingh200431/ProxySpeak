import test from "node:test";
import assert from "node:assert/strict";

import { validateJoinWorldPayload } from "../src/socket/validators.js";

test("validateJoinWorldPayload", async (t) => {
  await t.test("accepts a valid name and trims surrounding whitespace", () => {
    assert.deepEqual(
      validateJoinWorldPayload({ name: "  Shivam  " }),
      {
        valid: true,
        name: "Shivam",
      }
    );
  });

  await t.test("rejects a null payload", () => {
    const result = validateJoinWorldPayload(null);

  assert.equal(result.valid, false);
  assert.equal(result.code, "INVALID_PAYLOAD");
  assert.equal(typeof result.message, "string");
});

  await t.test("rejects arrays", () => {
    const result = validateJoinWorldPayload(null);

assert.equal(result.valid, false);
assert.equal(result.code, "INVALID_PAYLOAD");
assert.equal(typeof result.message, "string");
  });

  await t.test("rejects a missing or non-string name", () => {
    assert.equal(
      validateJoinWorldPayload({}).valid,
      false
    );

    assert.equal(
      validateJoinWorldPayload({}).code,
      "INVALID_NAME"
    );

    assert.equal(
      validateJoinWorldPayload({ name: 123 }).valid,
      false
    );

    assert.equal(
      validateJoinWorldPayload({ name: 123 }).code,
      "INVALID_NAME"
    );
  });

  await t.test("rejects blank names", () => {
    assert.equal(
      validateJoinWorldPayload({ name: "   " }).valid,
      false
    );

    assert.equal(
      validateJoinWorldPayload({ name: "   " }).code,
      "INVALID_NAME"
    );
  });

  await t.test("rejects names longer than 20 characters", () => {
    assert.equal(
      validateJoinWorldPayload({
        name: "123456789012345678901",
      }).valid,
      false
    );

    assert.equal(
      validateJoinWorldPayload({
        name: "123456789012345678901",
      }).code,
      "INVALID_NAME"
    );
  });
});