const FUNNEL_SESSION_KEY = 'airo-funnel-session-id';
const CHECKOUT_SNAPSHOT_KEY = 'stripe-checkout-snapshot';
/** Sibling key holding the snapshot's save time (ms). Kept separate from the
 *  snapshot JSON so the snapshot object stays exactly as emitted — this
 *  timestamp is never spread into an analytics payload. */
const CHECKOUT_SNAPSHOT_AT_KEY = 'stripe-checkout-snapshot-at';
/** Attribution-only TTL. Stripe Checkout sessions can stay completable much
 *  longer (~24h); after this window we suppress snapshot fields on terminal
 *  pages so a stale abandoned checkout is not attached to an unrelated visit.
 *  Cart clear on verified pay must not depend on a fresh snapshot. Expired
 *  cart snapshots also stop funnel rotation in getFunnelSessionId (intentional:
 *  TTL means we no longer treat the tab as mid-checkout). */
const CHECKOUT_SNAPSHOT_TTL_MS = 60 * 60 * 1000;

export interface CheckoutSnapshot {
  checkout_source: string;
  currency: string;
  line_count: number;
  quantity_total: number;
  amount_total: number;
  amount_total_display: string;
  line_items_json: string;
  funnel_session_id: string;
  stripe_mode?: 'test' | 'live';
}

/**
 * Derives whether a Stripe session is test or live from its ID prefix.
 * cs_test_* = sandbox/test mode, cs_live_* = real payments.
 * Used to filter out test purchases from revenue metrics.
 */
export function getStripeMode(sessionId: string): 'test' | 'live' {
  return sessionId.startsWith('cs_test_') ? 'test' : 'live';
}

function mintFunnelSessionId(): string {
  const id = crypto.randomUUID();
  sessionStorage.setItem(FUNNEL_SESSION_KEY, id);
  return id;
}

function clearCheckoutSnapshot(): void {
  sessionStorage.removeItem(CHECKOUT_SNAPSHOT_KEY);
  sessionStorage.removeItem(CHECKOUT_SNAPSHOT_AT_KEY);
}

/** Parse snapshot JSON without applying TTL (for terminal cleanup decisions). */
function readCheckoutSnapshotRaw(): CheckoutSnapshot | null {
  const saved = sessionStorage.getItem(CHECKOUT_SNAPSHOT_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as CheckoutSnapshot;
  } catch {
    return null;
  }
}

function isCheckoutSnapshotExpired(): boolean {
  const atRaw = sessionStorage.getItem(CHECKOUT_SNAPSHOT_AT_KEY);
  // Legacy snapshots without AT key fail closed (treat as expired).
  if (atRaw == null) return true;
  const savedAt = Number(atRaw);
  return !Number.isFinite(savedAt) || Date.now() - savedAt > CHECKOUT_SNAPSHOT_TTL_MS;
}

/**
 * Mints a new browsing funnel id and drops the checkout snapshot. Use when a
 * prior shopping attempt should not merge with the next one.
 */
export function startNewFunnelSession(): string {
  if (typeof window === 'undefined') return '';
  clearCheckoutSnapshot();
  return mintFunnelSessionId();
}

/**
 * Returns the browsing/cart funnel id for this tab, creating one if none
 * exists. Shared by add_to_cart and cart checkout so they form one funnel.
 *
 * If a checkout snapshot owned by THIS id is still present, the shopper
 * redirected to Stripe for a cart checkout and never hit cancel/success (i.e.
 * abandoned it), so a fresh funnel is started to avoid merging the abandoned
 * attempt into new browse/cart activity. A snapshot owned by a detached Buy
 * Now (a different id) is left untouched so it never disturbs the cart funnel.
 */
export function getFunnelSessionId(): string {
  if (typeof window === 'undefined') return '';
  const existing = sessionStorage.getItem(FUNNEL_SESSION_KEY);
  const snapshot = getCheckoutSnapshot();
  if (snapshot && snapshot.funnel_session_id === existing) {
    return startNewFunnelSession();
  }
  if (existing) return existing;
  return mintFunnelSessionId();
}

/**
 * One-off funnel id for Buy Now — never stored in FUNNEL_SESSION_KEY, so cart
 * and Buy Now stay distinct funnels. Each call mints a fresh id (a retry after
 * checkout_error is a new funnel; there's no add_to_cart history to preserve).
 */
export function createDetachedFunnelSessionId(): string {
  if (typeof window === 'undefined') return '';
  return crypto.randomUUID();
}

/**
 * Saves the cart snapshot before redirecting to Stripe.
 * Used by cancel and success pages to read back the cart state after the redirect.
 */
export function saveCheckoutSnapshot(snapshot: CheckoutSnapshot): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CHECKOUT_SNAPSHOT_KEY, JSON.stringify(snapshot));
  sessionStorage.setItem(CHECKOUT_SNAPSHOT_AT_KEY, String(Date.now()));
}

/**
 * Reads the saved checkout snapshot. Returns null if none exists (e.g. direct
 * navigation to success/cancel) or if it is older than CHECKOUT_SNAPSHOT_TTL_MS
 * — a stale snapshot from an abandoned checkout must not attach to a later
 * unrelated terminal page. Expired keys are removed on read.
 */
export function getCheckoutSnapshot(): CheckoutSnapshot | null {
  if (typeof window === 'undefined') return null;
  const raw = readCheckoutSnapshotRaw();
  if (!raw) return null;
  if (isCheckoutSnapshotExpired()) {
    clearCheckoutSnapshot();
    return null;
  }
  return raw;
}

/**
 * Clears the checkout snapshot after a terminal funnel event (verified / not
 * verified / cancel). Clears the browsing funnel id only for a cart checkout
 * (or when no snapshot is present) — a completed/cancelled Buy Now runs on a
 * detached id, so it must not wipe the cart's funnel.
 * Peeks source even when the snapshot is TTL-expired so a slow Buy Now success
 * does not incorrectly reset the cart funnel id.
 * Must be called after firing the terminal analytics event, not before.
 */
export function clearFunnelSession(): void {
  if (typeof window === 'undefined') return;
  const snapshot = readCheckoutSnapshotRaw();
  if (!snapshot || snapshot.checkout_source === 'cart') {
    sessionStorage.removeItem(FUNNEL_SESSION_KEY);
  }
  clearCheckoutSnapshot();
}
