'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, LockKeyhole, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { verifyLogin, saveSession, getSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) {
      router.replace(session.is_admin ? '/admin' : '/');
    } else {
      setChecking(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const user = await verifyLogin(username.trim(), password);
      if (!user) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }
      saveSession(user);
      router.replace(user.is_admin ? '/admin' : '/');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.09),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(120,120,120,0.08),transparent_30%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900 shadow-[0_0_35px_rgba(255,255,255,0.08)]">
            <MessageSquare className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            ChatGabut
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sign in to start chatting
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="username" className="text-neutral-300">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600 focus:border-neutral-600"
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-neutral-300">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCapsLockOn(e.getModifierState('CapsLock'))}
                placeholder="Enter your password"
                className="border-neutral-800 bg-neutral-900 pr-11 text-white placeholder:text-neutral-600 focus:border-neutral-600"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {capsLockOn && (
              <p className="flex items-center gap-1.5 text-xs text-amber-300 animate-fade-in">
                <LockKeyhole className="h-3.5 w-3.5" /> Caps Lock is on
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 animate-fade-in">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black hover:bg-neutral-200 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-neutral-600">
          <LockKeyhole className="h-3.5 w-3.5" />
          <span>Your conversations stay private</span>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-600">
          Don&apos;t have an account? Ask an admin to create one for you.
        </p>
      </div>
    </div>
  );
}
