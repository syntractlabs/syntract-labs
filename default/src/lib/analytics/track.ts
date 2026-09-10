declare global {
  interface Window {
    _signalsDataLayer?: unknown[];
  }
}

const COOKIE_CONSENT_KEY = 'c2_analytics_consent';
const COOKIE_CONSENT_EXPIRES_DAYS = 365;

interface CookieConsent {
  analytics: boolean;
  timestamp: number;
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return false;
    const consent = JSON.parse(raw) as CookieConsent;
    if (consent.analytics !== true) return false;
    if (typeof consent.timestamp !== 'number' || Number.isNaN(consent.timestamp)) {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
      return false;
    }
    const daysSinceConsent = (Date.now() - consent.timestamp) / (1000 * 60 * 60 * 24);
    if (daysSinceConsent > COOKIE_CONSENT_EXPIRES_DAYS) {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const PURCHASE_VERIFIED_KEY_PREFIX = 'airo-stripe-verified:';
/** Claims older than this are pruned so the key set stays bounded. */
const PURCHASE_VERIFIED_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Best-effort removal of expired purchase-verified claim keys so localStorage
 * does not grow unbounded (otherwise one key per purchase lives forever).
 * A legacy '1' value parses to epoch+1ms and is treated as expired.
 */
function prunePurchaseVerifiedKeys(): void {
  try {
    const now = Date.now();
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PURCHASE_VERIFIED_KEY_PREFIX)) continue;
      const claimedAt = Number(localStorage.getItem(key));
      if (!Number.isFinite(claimedAt) || now - claimedAt > PURCHASE_VERIFIED_TTL_MS) {
        stale.push(key);
      }
    }
    for (const key of stale) localStorage.removeItem(key);
  } catch {
    // Housekeeping is best-effort; never block emission on a prune failure.
  }
}

/**
 * One-time claim to emit purchase_verified for a Stripe session (localStorage dedupe;
 * sessionId is a local key, never sent). False without consent or if already claimed.
 */
export function claimPurchaseVerifiedEmission(sessionId: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!sessionId || !hasAnalyticsConsent()) return false;
  try {
    const key = `${PURCHASE_VERIFIED_KEY_PREFIX}${sessionId}`;
    if (localStorage.getItem(key) !== null) return false;
    prunePurchaseVerifiedKeys();
    localStorage.setItem(key, String(Date.now()));
    return true;
  } catch {
    // Storage blocked — prefer emitting over silently dropping revenue.
    return true;
  }
}

/**
 * Pushes a Stripe commerce event to the GoDaddy Signals data layer.
 * No-ops when analytics consent is missing/expired or on the server.
 */
export function track(
  eid: string,
  type: string,
  label: string,
  properties?: Record<string, unknown>,
): void {
  if (!hasAnalyticsConsent()) return;
  window._signalsDataLayer = window._signalsDataLayer || [];
  window._signalsDataLayer.push({
    schema: 'add_event',
    version: 'v1',
    data: {
      eid,
      type,
      event_label: label,
      custom_properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        source: 'airo-app-builder',
      },
    },
  });
}
