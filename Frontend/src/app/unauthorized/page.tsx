'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slateDepth px-6 text-center text-textNeutral">
      <div className="text-6xl opacity-40">🚫</div>
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="max-w-md text-sm text-textNeutral/60">
        {user
          ? `Your account (${user.role}) doesn't have permission to view this page.`
          : "You don't have permission to view this page."}
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg bg-amberCommand px-4 py-2 text-sm font-semibold text-black hover:bg-amberCommand/90"
        >
          Back to Dashboard
        </Link>
        {user && (
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border border-panelNight/40 px-4 py-2 text-sm text-textNeutral/70 hover:bg-panelNight"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
