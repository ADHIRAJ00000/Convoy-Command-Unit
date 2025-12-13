'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'FIELD_OFFICER',
    rank: '',
    unit: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.username || !formData.password) {
      setError('All fields marked with * are required');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      await register(registerData);
      // Redirect happens in AuthContext after successful registration
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
            Join the Command Network
          </h2>
          
          <p className="text-textNeutral/70 mb-6">
            Create your account to access advanced military logistics intelligence and convoy management systems.
          </p>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-amberCommand/20 bg-amberCommand/5 p-4">
              <h3 className="font-semibold text-amberCommand mb-2">Role Descriptions:</h3>
              <div className="space-y-2 text-textNeutral/70">
                <div>
                  <span className="font-semibold text-textNeutral">Admin:</span> Full system access & control
                </div>
                <div>
                  <span className="font-semibold text-textNeutral">Operator:</span> Convoy monitoring & route optimization
                </div>
                <div>
                  <span className="font-semibold text-textNeutral">Field Officer:</span> Field operations & event management
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
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

          {/* Register Card */}
          <div className="rounded-xl border border-panelNight/40 bg-panelNight/60 backdrop-blur-md p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-textNeutral mb-2">Create Account</h2>
              <p className="text-sm text-textNeutral/60">Register for command center access</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-xs uppercase text-textNeutral/60 mb-2">
                  Full Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral placeholder:text-textNeutral/40 focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                />
              </div>

              {/* Email & Username */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="email" className="block text-xs uppercase text-textNeutral/60 mb-2">
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="john@mil.gov"
                    className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral placeholder:text-textNeutral/40 focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                  />
                </div>
                <div>
                  <label htmlFor="username" className="block text-xs uppercase text-textNeutral/60 mb-2">
                    Username *
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="johndoe"
                    className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral placeholder:text-textNeutral/40 focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="password" className="block text-xs uppercase text-textNeutral/60 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral placeholder:text-textNeutral/40 focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-textNeutral/60 hover:text-textNeutral"
                    >
                      {showPassword ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs uppercase text-textNeutral/60 mb-2">
                    Confirm *
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral placeholder:text-textNeutral/40 focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-textNeutral/60 hover:text-textNeutral"
                    >
                      {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label htmlFor="role" className="block text-xs uppercase text-textNeutral/60 mb-2">
                  Role *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                >
                  <option value="FIELD_OFFICER">Field Officer</option>
                  <option value="OPERATOR">Convoy Operator</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              {/* Rank & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rank" className="block text-xs uppercase text-textNeutral/60 mb-2">
                    Rank (Optional)
                  </label>
                  <input
                    id="rank"
                    name="rank"
                    type="text"
                    value={formData.rank}
                    onChange={handleChange}
                    placeholder="Captain"
                    className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral placeholder:text-textNeutral/40 focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                  />
                </div>
                <div>
                  <label htmlFor="unit" className="block text-xs uppercase text-textNeutral/60 mb-2">
                    Unit (Optional)
                  </label>
                  <input
                    id="unit"
                    name="unit"
                    type="text"
                    value={formData.unit}
                    onChange={handleChange}
                    placeholder="Alpha-1"
                    className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-3 text-textNeutral placeholder:text-textNeutral/40 focus:border-amberCommand focus:outline-none focus:ring-2 focus:ring-amberCommand/20"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2 cursor-pointer text-sm">
                <input 
                  type="checkbox" 
                  required
                  className="mt-1 rounded border-panelNight/40 bg-slateDepth text-amberCommand focus:ring-amberCommand" 
                />
                <span className="text-textNeutral/60">
                  I agree to the <span className="text-amberCommand">terms of service</span> and acknowledge this is a classified military system
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-amberCommand px-4 py-3 text-sm font-semibold text-black transition hover:bg-amberCommand/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
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

            {/* Login Link */}
            <p className="text-center text-sm text-textNeutral/60">
              Already have an account?{' '}
              <Link href="/login" className="text-amberCommand hover:text-amberCommand/80 font-semibold">
                Sign in here
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