/**
 * Per-browser voter id for upvote deduplication.
 *
 * This is best-effort anti-duplication, not security: it is a random id stored
 * in localStorage, so it resets if storage is cleared and can be varied by a
 * determined client. We intentionally do NOT hash device characteristics
 * (user agent, screen size, timezone) — that added passive fingerprinting
 * without improving dedup, since a random component was already required for
 * uniqueness. A plain random id is both more private and equally effective.
 */

const FINGERPRINT_KEY = 'freestuff_voter_id';

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

/**
 * Get or create a persistent voter id for this browser.
 */
export function getFingerprint(): string {
  let fingerprint = localStorage.getItem(FINGERPRINT_KEY);
  if (!fingerprint) {
    fingerprint = randomId();
    localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  }
  return fingerprint;
}

/** Clear the stored voter id (useful for testing). */
export function clearFingerprint(): void {
  localStorage.removeItem(FINGERPRINT_KEY);
}
