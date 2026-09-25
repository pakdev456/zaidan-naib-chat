import { supabase } from './supabase/client';
import type { SessionUser } from './types';

const SESSION_KEY = 'chat_session';

export function saveSession(user: SessionUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export async function verifyLogin(username: string, password: string): Promise<SessionUser | null> {
  const timeout = new Promise<{ data: null; error: Error }>((resolve) => {
    setTimeout(() => {
      resolve({
        data: null,
        error: new Error('Login request timed out'),
      });
    }, 10000);
  });

  const { data, error } = await Promise.race([
    supabase.rpc('verify_login', { p_username: username, p_password: password }),
    timeout,
  ]);

  if (error || !data || data.length === 0) {
    return null;
  }

  const user = data[0];
  return {
    id: user.id,
    username: user.username,
    status_message: user.status_message,
    is_admin: user.is_admin,
  };
}
