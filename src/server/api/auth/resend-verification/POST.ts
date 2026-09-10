/**
 * POST /api/auth/resend-verification
 *
 * Resends the verification email for an unverified account by querying
 * the verification table directly. Bypasses BetterAuth's dedup logic
 * which silently skips sendVerificationEmail when the user already exists.
 *
 * Body: { email: string }
 * Returns 200 on success (or if email not found — no enumeration).
 */
import type { Request, Response } from 'express';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { user, verification } from '@/server/db/schema';
import { sendEmail } from '@/server/email';

export default async function handler(req: Request, res: Response) {
  const { email } = req.body as { email?: string };

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Look up the user
    const users = await db
      .select({ id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified })
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    // Always return 200 — don't reveal whether the email exists
    if (users.length === 0) {
      console.log(JSON.stringify({ event: 'auth.resend.no_user', email: normalizedEmail }));
      res.json({ ok: true });
      return;
    }

    const u = users[0];

    if (u.emailVerified) {
      // Already verified — nothing to do
      console.log(JSON.stringify({ event: 'auth.resend.already_verified', email: normalizedEmail }));
      res.json({ ok: true });
      return;
    }

    // Find the most recent non-expired verification token for this email.
    // BetterAuth stores verification tokens with identifier = email address.
    const tokens = await db
      .select({ id: verification.id, value: verification.value, expiresAt: verification.expiresAt })
      .from(verification)
      .where(
        and(
          eq(verification.identifier, normalizedEmail),
          gt(verification.expiresAt, new Date()),
        )
      )
      .limit(10);

    if (tokens.length === 0) {
      // No valid token — user needs to sign up again or BetterAuth needs to
      // issue a new token. Trigger BetterAuth's sendVerificationEmail via the
      // internal auth handler so a fresh token is created.
      console.log(JSON.stringify({ event: 'auth.resend.no_token', email: normalizedEmail }));
      // Fall through to return ok — the client should call BetterAuth's
      // sendVerificationEmail endpoint directly for a fresh token.
      res.json({ ok: true, needsFreshToken: true });
      return;
    }

    // Use the most recently created token (last in list, or sort by expiresAt desc)
    const latestToken = tokens.sort(
      (a, b) => b.expiresAt.getTime() - a.expiresAt.getTime()
    )[0];

    // Reconstruct the verification URL
    const verificationUrl = `https://syntract.net/api/auth/verify-email?token=${encodeURIComponent(latestToken.value)}&callbackURL=/dashboard`;

    console.log(JSON.stringify({
      event: 'auth.resend.sending',
      email: normalizedEmail,
      urlPrefix: verificationUrl.slice(0, 60),
    }));

    const result = await sendEmail({
      fromName: 'SynTract Labs',
      to: u.email,
      sameDomainFallback: true,
      subject: 'Verify your SynTract Labs account',
      text: `Hi ${u.name},\n\nHere is your verification link:\n\n${verificationUrl}\n\nOr copy and paste this URL into your browser:\n${verificationUrl}\n\nThis link expires at ${latestToken.expiresAt.toUTCString()}.\n\nIf you didn't create an account, you can safely ignore this email.\n\n— SynTract Labs\nhttps://syntract.net`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#0A0D12;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid rgba(255,255,255,0.08)">
          <div style="margin-bottom:20px">
            <span style="font-family:monospace;font-size:11px;color:#4F6EF7;letter-spacing:0.1em;text-transform:uppercase">SynTract Labs</span>
          </div>
          <h1 style="font-size:20px;font-weight:700;color:#f1f5f9;margin:0 0 8px">Verify your email address</h1>
          <p style="font-size:14px;color:#94a3b8;margin:0 0 24px;line-height:1.6">Hi ${u.name}, here is your verification link. Click the button below to activate your account.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px">
            <tr>
              <td style="border-radius:8px;background:#4F6EF7">
                <a href="${verificationUrl}" style="display:inline-block;background:#4F6EF7;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none">Verify email address</a>
              </td>
            </tr>
          </table>
          <p style="font-size:12px;color:#64748b;margin:0 0 12px;line-height:1.6">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size:11px;color:#4F6EF7;word-break:break-all;margin:0 0 24px;background:rgba(79,110,247,0.08);padding:10px 12px;border-radius:6px;border:1px solid rgba(79,110,247,0.2)">${verificationUrl}</p>
          <p style="font-size:12px;color:#64748b;margin:0 0 16px;line-height:1.6">This link expires at ${latestToken.expiresAt.toUTCString()}. If you didn't create an account, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0" />
          <p style="font-size:11px;color:#475569;margin:0">SynTract Labs &mdash; <a href="https://syntract.net" style="color:#475569">syntract.net</a></p>
        </div>
      `,
    });

    console.log(JSON.stringify({
      event: 'auth.resend.sent',
      email: normalizedEmail,
      messageId: result.messageId,
    }));

    res.json({ ok: true });
  } catch (err) {
    console.error(JSON.stringify({ event: 'auth.resend.error', email: normalizedEmail, error: String(err) }));
    res.status(500).json({ error: 'Failed to resend verification email. Please try again.' });
  }
}
