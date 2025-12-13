'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Redirect happens in AuthContext after successful login
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slateDepth">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-panelNight to-slateDepth items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-amberCommand text-black font-bold text-2xl">
              🦅
            </div>
            <div>
              <h1 className="text-3xl font-bold text-amberCommand">HawkRoute</h1>
              <p className="text-sm uppercase tracking-wider text-textNeutral/60">Convoy Command System</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-semibold text-textNeutral mb-4">
            Secure Military Logistics Intelligence
          </h2>
          
          <p className="text-textNeutral/70 mb-6">
            Advanced convoy tracking, route optimization, and real-time threat assessment for military operations.
          </p>

          <div className="space-y-3 text-sm text-textNeutral/60">
            <div className="flex items-center gap-2">
              <span className="text-amberCommand">✓</span>
              <span>Real-time convoy tracking and monitoring</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amberCommand">✓</span>
              <span>AI-powered route optimization</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amberCommand">✓</span>
              <span>Threat detection and risk assessment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amberCommand">✓</span>
              <span>Secure role-based access control</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amberCommand text-black font-bold text-xl">
              🦅
            </div>
            <div>
              <h1 className="text-2xl font-bold text-amberCommand">HawkRoute</h1>
              <p className="text-xs uppercase tracking-wider text-textNeutral/60">Convoy Command</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="rounded-xl border border-panelNight/40 bg-panelNight/60 backdrop-blur-md p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-textNeutral mb-2">Welcome Back</h2>
              <p className="text-sm text-textNeutral/60">Sign in to access the command center</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-xs uppercase text-textNeutral/60 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="commander@hawkroute.mil"
                  className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral placeholder:text-textNeutral/40 focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-xs uppercase text-textNeutral/60 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral placeholder:text-textNeutral/40 focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textNeutral/60 hover:text-textNeutral"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-panelNight/40 bg-slateDepth text-amberCommand focus:ring-amberCommand" />
                  <span className="text-textNeutral/60">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-amberCommand hover:text-amberCommand/80">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-amberCommand px-4 py-3 text-sm font-semibold text-black transition hover:bg-amberCommand/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-panelNight/40" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-panelNight/60 px-2 text-textNeutral/40">Or</span>
              </div>
            </div>

            {/* Register Link */}
            <p className="text-center text-sm text-textNeutral/60">
              Don't have an account?{' '}
              <Link href="/register" className="text-amberCommand hover:text-amberCommand/80 font-semibold">
                Register here
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-textNeutral/40">
            Classified System - Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}