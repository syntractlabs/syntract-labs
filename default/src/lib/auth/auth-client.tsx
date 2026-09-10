/**
 * BetterAuth Client + Components
 *
 * BetterAuth handles session context internally via cookies and the useSession hook.
 * No explicit React context provider is needed - the authClient manages session state.
 */

import { createAuthClient } from 'better-auth/react';
import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from "react-router";
// Auth client — use no baseURL so requests are relative to the current page's
// origin. This works correctly in all environments:
//   • Local dev: requests go to localhost
//   • Preview iframe: requests go to the preview app's own server (not the builder frame)
//   • Published: requests go to the production domain
// Explicitly setting baseURL to window.location.origin breaks the preview because
// the iframe's window.location is the builder's origin, not the app's origin.
const _authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  fetchOptions: {
    credentials: 'include'
  }
});
export const authClient = _authClient;
export const {
  signIn,
  signUp,
  signOut
} = _authClient;

/**
 * useSession — null-safe session hook.
 *
 * Returns `user` as a top-level nullable field and `isAuthenticated` as a
 * boolean so components naturally handle the unauthenticated state:
 *
 *   const { user, isAuthenticated, isPending } = useSession();
 *   if (isPending) return <Spinner />;
 *   return isAuthenticated ? <span>{user.name}</span> : <a href="/login">Sign In</a>;
 */
export function useSession() {
  const {
    data: session,
    isPending,
    error
  } = _authClient.useSession();
  return {
    session,
    user: session?.user ?? null,
    isPending,
    error,
    // Only mark as authenticated when we have a confirmed session.
    // An error (e.g. 500 from server) is NOT the same as "not logged in" —
    // treat it as unauthenticated so ProtectedRoute can handle it gracefully.
    isAuthenticated: !isPending && !error && !!session?.user
  };
}

// Alias for useSession (common naming convention)
export const useAuth = useSession;

/**
 * SessionProvider - Wrapper for compatibility with common auth patterns.
 *
 * BetterAuth manages session state internally through cookies and the useSession hook,
 * so no React context is needed. This component is provided for API compatibility
 * with apps that expect a provider wrapper pattern (e.g., migrating from NextAuth).
 *
 * You can safely wrap your app with this, but it's optional.
 */
export function SessionProvider({
  children
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

// Alias for SessionProvider (common naming convention in auth libraries)
export const AuthProvider = SessionProvider;

// Session timeout for loading state (30 seconds)
const SESSION_TIMEOUT_MS = 30000;

// ProtectedRoute component with timeout handling
export function ProtectedRoute({
  children
}: {
  children: ReactNode;
}) {
  const {
    isAuthenticated,
    isPending,
    error
  } = useSession();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!isPending) return;
    const timeout = setTimeout(() => setTimedOut(true), SESSION_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [isPending]);

  // Server error (e.g. 500) — show retry rather than bouncing to /login,
  // which would create an infinite redirect loop if the server is broken.
  if (error && !isPending) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Could not verify your session. Please try again.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">
          Retry
        </button>
      </div>;
  }
  if (timedOut) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Session check timed out. Please try again.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90">
          Retry
        </button>
      </div>;
  }
  if (isPending) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{
      from: location
    }} replace />;
  }
  return <>{children}</>;
}

/**
 * LogoutButton - Button to sign out the user
 *
 * Handles the sign-out process and redirects to login page.
 * Can be customized with className prop.
 */
export function LogoutButton({
  className = '',
  children = 'Logout'
}: {
  className?: string;
  children?: ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(false);
  async function handleLogout() {
    setIsLoading(true);
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoading(false);
    }
  }
  return <button onClick={handleLogout} disabled={isLoading} className={className || 'px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50'}>
      {isLoading ? 'Logging out...' : children}
    </button>;
}
