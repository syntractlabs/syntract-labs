/**
 * SynTract Native Build Pipeline™ — Provider Registry
 *
 * The registry is the single source of truth for all available build providers.
 * The pipeline never imports a concrete provider directly — it always resolves
 * through this registry, which makes swapping or adding providers zero-touch
 * for the rest of the system.
 */

import type { BuildProvider, Platform } from './types';
import { WebLocalProvider } from './providers/web-local';
import { ExpoEasProvider } from './providers/expo-eas';
import { CodemagicProvider } from './providers/codemagic';
import { GitHubActionsProvider } from './providers/github-actions';

// ─── Registered providers ────────────────────────────────────────────────────
// Add new providers here. Order determines the default preference when multiple
// providers support the same platform.

const PROVIDERS: BuildProvider[] = [
  new WebLocalProvider(),
  new ExpoEasProvider(),
  new CodemagicProvider(),
  new GitHubActionsProvider(),
];

// ─── Registry API ─────────────────────────────────────────────────────────────

/** Return all registered providers */
export function getAllProviders(): BuildProvider[] {
  return PROVIDERS;
}

/** Look up a provider by its unique name */
export function getProvider(name: string): BuildProvider | undefined {
  return PROVIDERS.find((p) => p.name === name);
}

/** Return all providers that support a given platform */
export function getProvidersForPlatform(platform: Platform): BuildProvider[] {
  return PROVIDERS.filter((p) => p.supportedPlatforms.includes(platform));
}

/**
 * Return the best provider for a given platform.
 * Prefers providers that don't require credentials (i.e. work out of the box)
 * unless a specific provider name is requested.
 */
export function resolveProvider(
  platform: Platform,
  preferredName?: string,
): BuildProvider {
  if (preferredName) {
    const p = getProvider(preferredName);
    if (!p) throw new Error(`Unknown build provider: "${preferredName}"`);
    if (!(p.supportedPlatforms as ReadonlyArray<string>).includes(platform)) {
      throw new Error(
        `Provider "${preferredName}" does not support platform "${platform}". ` +
          `Supported: ${p.supportedPlatforms.join(', ')}`,
      );
    }
    return p;
  }

  const candidates = getProvidersForPlatform(platform);
  if (candidates.length === 0) {
    throw new Error(`No registered provider supports platform "${platform}"`);
  }

  // Prefer no-credential providers first, then fall back to the first match
  return candidates.find((p) => !p.requiresCredentials) ?? candidates[0];
}

/**
 * Serialisable summary of a provider — safe to send to the frontend.
 */
export interface ProviderSummary {
  name: string;
  displayName: string;
  supportedPlatforms: readonly Platform[];
  requiresCredentials: boolean;
  description: string;
}

export function summariseProviders(): ProviderSummary[] {
  return PROVIDERS.map((p) => ({
    name: p.name,
    displayName: p.displayName,
    supportedPlatforms: p.supportedPlatforms,
    requiresCredentials: p.requiresCredentials,
    description: p.description,
  }));
}
