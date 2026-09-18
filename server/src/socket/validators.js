/**
 * Payload validators for the real-time event layer.
 * Owner: Sagar — real-time events & validation (Week 1).
 */

export const MIN_NAME_LENGTH = 1;
export const MAX_NAME_LENGTH = 20;

/**
 * Validates the payload sent with a `join-world` event.
 * Expected shape: { name: string }
 *
 * @param {*} payload - raw payload received from the client, untrusted.
 * @returns {{ valid: true, name: string } | { valid: false, code: string, message: string }}
 */
export function validateJoinWorldPayload(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      code: 'INVALID_PAYLOAD',
      message: 'join-world payload must be an object.',
    };
  }

  const { name } = payload;

  if (typeof name !== 'string') {
    return {
      valid: false,
      code: 'INVALID_NAME',
      message: 'name must be a string.',
    };
  }

  const trimmed = name.trim();

  if (trimmed.length < MIN_NAME_LENGTH || trimmed.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      code: 'INVALID_NAME',
      message: `name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`,
    };
  }

  return { valid: true, name: trimmed };
}
