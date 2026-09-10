/**
 * BetterAuth Server Configuration
 *
 * Supports both Email/Password and OAuth authentication.
 * Enable/disable methods by uncommenting the relevant sections.
 *
 * Secrets (via getSecret from #airo/secrets):
 * - BETTER_AUTH_SECRET: Session encryption key (auto-generated during install)
 * - OAuth credentials (GOOGLE_CLIENT_ID, etc.) for social login
 *
 * CORS/Trusted Origins:
 * - Only trusts origins matching the server's hostname
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '@/server/db/client';
import { user, session, account, verification } from '@/server/db/schema';
import { getSecret } from '#airo/secrets';
import { sendEmail } from '@/server/email';

// Lazy singleton — betterAuth() must NOT run at module init time. (v2 — expires_at fix)
//
// The BETTER_AUTH_SECRET is loaded from the alloc config at runtime, so the
// auth instance must be constructed after the secrets are available (i.e. on
// the first HTTP request, not at import time).
let _auth: ReturnType<typeof betterAuth> | null = null;

export function resetAuth() { _auth = null; }

export function getAuth(_baseURL?: string) {
  if (_auth) return _auth;
  const resolvedBase = 'https://syntract.net';

  const authSecret = getSecret('BETTER_AUTH_SECRET');
  if (!authSecret || typeof authSecret !== 'string') {
    throw new Error('BETTER_AUTH_SECRET is not set or invalid — run requestSecrets() first');
  }

  if (!db) {
    throw new Error('Database not configured. Install the database skill first, then configure auth.');
  }

  const auth = betterAuth({
    // Schema passed explicitly — avoids BetterAuth's runtime schema inference.
    database: drizzleAdapter(db, {
      provider: 'mysql',
      schema: { user, session, account, verification },
    }),

    secret: authSecret,

    // Base URL — derived from the incoming request so it works in all environments
    // (local dev, preview iframe, published). Passed in by the auth middleware.
    baseURL: resolvedBase,

    // Protect admin status field from user input
    user: {
      additionalFields: {
        isAdmin: {
          type: 'boolean',
          defaultValue: false,
          input: false,  // Prevent clients from writing this field
          returned: true,
        },
      },
    },

    // CORS: Static list — evaluated correctly on every request.
    trustedOrigins: [
      'https://syntract.net',
      'https://www.syntract.net',
      'https://syntract.io',
      'https://vpr31t9gem.preview.c36.airoapp.ai',
      'http://localhost:3000',
      'http://localhost:5173',
    ],

    // In preview mode the site runs in an iframe embedded by the builder on a different
    // origin, so cookies need SameSite=None + Secure + Partitioned (CHIPS) for cross-site
    // access. In publish mode (standalone) we use the safer SameSite=Lax default.
    ...(process.env.AIRO_PREVIEW === 'true' && {
      advanced: {
        defaultCookieAttributes: {
          sameSite: 'none' as const,
          secure: true,
          partitioned: true,
        },
      },
    }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      callbackURL: '/dashboard',
      sendVerificationEmail: async ({ user: u, url }) => {
        console.log(JSON.stringify({ event: 'auth.verification_email.sending', email: u.email, urlPrefix: url.slice(0, 60) }));
        try {
          const result = await sendEmail({
            fromName: 'SynTract Labs',
            to: u.email,
            sameDomainFallback: true,
            subject: 'Verify your SynTract Labs account',
            text: `Hi ${u.name},\n\nPlease verify your email address by clicking the link below:\n\n${url}\n\nOr copy and paste this URL into your browser:\n${url}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.\n\n— SynTract Labs\nhttps://syntract.net`,
            html: `
              <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0A0D12;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid rgba(255,255,255,0.08)">
                <div style="margin-bottom:20px">
                  <span style="font-family:monospace;font-size:11px;color:#4F6EF7;letter-spacing:0.1em;text-transform:uppercase">SynTract Labs</span>
                </div>
                <h1 style="font-size:20px;font-weight:700;color:#f1f5f9;margin:0 0 8px">Verify your email address</h1>
                <p style="font-size:14px;color:#94a3b8;margin:0 0 24px;line-height:1.6">Hi ${u.name}, thanks for signing up. Click the button below to verify your email and activate your account.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px">
                  <tr>
                    <td style="border-radius:8px;background:#4F6EF7">
                      <a href="${url}" style="display:inline-block;background:#4F6EF7;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none">Verify email address</a>
                    </td>
                  </tr>
                </table>
                <p style="font-size:12px;color:#64748b;margin:0 0 12px;line-height:1.6">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size:11px;color:#4F6EF7;word-break:break-all;margin:0 0 24px;background:rgba(79,110,247,0.08);padding:10px 12px;border-radius:6px;border:1px solid rgba(79,110,247,0.2)">${url}</p>
                <p style="font-size:12px;color:#64748b;margin:0;line-height:1.6">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
                <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0" />
                <p style="font-size:11px;color:#475569;margin:0">SynTract Labs &mdash; <a href="https://syntract.net" style="color:#475569">syntract.net</a></p>
              </div>
            `,
          });
          console.log(JSON.stringify({ event: 'auth.verification_email.sent', email: u.email, messageId: result.messageId }));
        } catch (err) {
          console.error(JSON.stringify({ event: 'auth.verification_email.failed', email: u.email, error: String(err) }));
          // Re-throw so BetterAuth surfaces the error to the client instead of
          // silently succeeding while no email was actually sent.
          throw err;
        }
      },
    },

    // Disable the built-in rate limiter — the platform handles rate limiting
    // at the edge. The default BetterAuth limiter is too aggressive for normal
    // usage (blocks after a handful of failed attempts per window).
    rateLimit: {
      enabled: false,
    },

    // socialProviders: {
    //   google: {
    //     clientId: getSecret('GOOGLE_CLIENT_ID') as string,
    //     clientSecret: getSecret('GOOGLE_CLIENT_SECRET') as string,
    //   },
    //   github: {
    //     clientId: getSecret('GITHUB_CLIENT_ID') as string,
    //     clientSecret: getSecret('GITHUB_CLIENT_SECRET') as string,
    //   },
    // },
  });

  _auth = auth as unknown as ReturnType<typeof betterAuth>;
  return auth;
}

export type Session = ReturnType<typeof getAuth>['$Infer']['Session'];
export type User = ReturnType<typeof getAuth>['$Infer']['Session']['user'];
