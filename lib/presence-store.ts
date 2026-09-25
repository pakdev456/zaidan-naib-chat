'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PresenceState {
  [userId: string]: boolean;
}

let globalPresence: PresenceState = {};
const listeners = new Set<(p: PresenceState) => void>();

export function setPresence(userId: string, online: boolean) {
  globalPresence = { ...globalPresence, [userId]: online };
  listeners.forEach((l) => l(globalPresence));
}

export function setBulkPresence(presence: PresenceState) {
  globalPresence = { ...globalPresence, ...presence };
  listeners.forEach((l) => l(globalPresence));
}

export function usePresence() {
  const [presence, setPresenceState] = useState<PresenceState>(globalPresence);

  useEffect(() => {
    listeners.add(setPresenceState);
    return () => {
      listeners.delete(setPresenceState);
    };
  }, []);

  return presence;
}
