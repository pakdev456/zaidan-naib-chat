'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { setBulkPresence } from '@/lib/presence-store';

export function usePresenceTracker(userId: string | null) {
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const goOnline = async () => {
      await supabase
        .from('presence')
        .upsert(
          {
            user_id: userId,
            chat_id: null,
            is_online: true,
            last_seen: new Date().toISOString(),
          },
          { onConflict: 'user_id,chat_id' }
        );
    };

    const goOffline = async () => {
      await supabase
        .from('presence')
        .upsert(
          {
            user_id: userId,
            chat_id: null,
            is_online: false,
            last_seen: new Date().toISOString(),
          },
          { onConflict: 'user_id,chat_id' }
        );
    };

    goOnline();

    heartbeatRef.current = setInterval(goOnline, 20000);

    const handleVisibility = () => {
      if (document.hidden) {
        goOffline();
      } else {
        goOnline();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', goOffline);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', goOffline);
      goOffline();
    };
  }, [userId]);
}

export function usePresenceSubscription() {
  useEffect(() => {
    const channel = supabase
      .channel('presence-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presence' },
        (payload) => {
          const record = payload.new as { user_id: string; is_online: boolean };
          setBulkPresence({ [record.user_id]: record.is_online });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

export async function fetchInitialPresence(): Promise<Record<string, boolean>> {
  const { data } = await supabase
    .from('presence')
    .select('user_id, is_online')
    .eq('is_online', true);

  const result: Record<string, boolean> = {};
  if (data) {
    data.forEach((row: { user_id: string; is_online: boolean }) => {
      result[row.user_id] = row.is_online;
    });
  }
  return result;
}
