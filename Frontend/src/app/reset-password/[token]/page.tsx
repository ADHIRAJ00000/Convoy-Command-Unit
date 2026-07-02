'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api`;

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slateDepth p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amberCommand text-black font-bold text-xl">
            🦅
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amberCommand">HawkRoute</h1>
            <p className="text-xs uppercase tracking-wider text-textNeutral/60">Convoy Command</p>
          </div>
        </div>

        <div className="rounded-xl border border-panelNight/40 bg-panelNight/60 backdrop-blur-md p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-textNeutral mb-2">Set New Password</h2>
            <p className="text-sm text-textNeutral/60">Choose a new password for your account.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success ? (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3">
              <p className="text-sm text-emerald-400">Password reset! Redirecting to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-xs uppercase text-textNeutral/60 mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral placeholder:text-textNeutral/40 focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs uppercase text-textNeutral/60 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral placeholder:text-textNeutral/40 focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-amberCommand px-4 py-3 text-sm font-semibold text-black transition hover:bg-amberCommand/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-textNeutral/60">
            <Link href="/login" className="text-amberCommand hover:text-amberCommand/80 font-semibold">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
