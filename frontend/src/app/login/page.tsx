'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.push('/');
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || err?.errors?.[0] || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" style={{ width: '3rem', height: '3rem' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            🐦 Trends Bird
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">Sign in to your admin dashboard</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@trendsbird.com"
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full py-2.5"
            >
              {submitting ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-secondary)] text-center">Test Credentials</p>
            <div className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
              <p>Admin: <code className="text-indigo-400">admin@trendsbird.com</code> / <code className="text-indigo-400">Admin@123</code></p>
              <p>Viewer: <code className="text-indigo-400">viewer@trendsbird.com</code> / <code className="text-indigo-400">User@123</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
