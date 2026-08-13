import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { downloadZip } from './downloads';
import { useDownloads } from './DownloadsContext';
import {
  loadScheduledDownloads,
  saveScheduledDownloads,
  type ScheduledDownload,
} from './storage';
import type { Episode } from './types';

type ScheduleInput =
  | { type: 'episode'; episode: Episode; label: string }
  | { type: 'zip'; url: string; filename: string; label: string };

type ScheduledDownloadsContextValue = {
  scheduled: ScheduledDownload[];
  scheduleDownload: (item: ScheduleInput) => Promise<void>;
  cancelScheduled: (id: string) => Promise<void>;
};

const ScheduledDownloadsContext = createContext<ScheduledDownloadsContextValue | null>(null);

export function ScheduledDownloadsProvider({ children }: { children: React.ReactNode }) {
  const { download: downloadEpisode } = useDownloads();
  const [scheduled, setScheduled] = useState<ScheduledDownload[]>([]);
  const [loaded, setLoaded] = useState(false);
  const scheduledRef = useRef<ScheduledDownload[]>([]);
  const processingRef = useRef(false);

  useEffect(() => {
    scheduledRef.current = scheduled;
  }, [scheduled]);

  useEffect(() => {
    (async () => {
      setScheduled(await loadScheduledDownloads());
      setLoaded(true);
    })();
  }, []);

  const removeFromQueue = useCallback(async (id: string) => {
    setScheduled(prev => {
      const next = prev.filter(item => item.id !== id);
      saveScheduledDownloads(next);
      return next;
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    const pending = scheduledRef.current;
    if (pending.length === 0) return;
    processingRef.current = true;
    let succeeded = 0;
    try {
      for (const item of pending) {
        try {
          if (item.type === 'episode') {
            await downloadEpisode(item.episode, { silent: true });
          } else {
            await downloadZip(item.url, item.filename);
          }
          await removeFromQueue(item.id);
          succeeded += 1;
        } catch {
          // Left in the queue — a network hiccup mid-download shouldn't
          // drop the request; it'll retry next time Wi-Fi connects.
        }
      }
    } finally {
      processingRef.current = false;
    }
    if (succeeded > 0) {
      Alert.alert(
        'नियोजित डाउनलोड्स पूर्ण',
        `Wi-Fi वर ${succeeded} डाउनलोड${succeeded > 1 ? 'स' : ''} पूर्ण झाले.`,
      );
    }
  }, [downloadEpisode, removeFromQueue]);

  useEffect(() => {
    if (!loaded) return;
    // Covers both "Wi-Fi just connected" and "app opened while already on
    // Wi-Fi with items left over from a previous session".
    processQueue();
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.type === 'wifi' && state.isConnected) processQueue();
    });
    return unsubscribe;
  }, [loaded, processQueue]);

  const scheduleDownload = useCallback(async (item: ScheduleInput) => {
    const entry = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      queuedAt: Date.now(),
    } as ScheduledDownload;
    setScheduled(prev => {
      const next = [...prev, entry];
      saveScheduledDownloads(next);
      return next;
    });
  }, []);

  const cancelScheduled = useCallback(
    async (id: string) => {
      await removeFromQueue(id);
    },
    [removeFromQueue],
  );

  const value = useMemo<ScheduledDownloadsContextValue>(
    () => ({ scheduled, scheduleDownload, cancelScheduled }),
    [scheduled, scheduleDownload, cancelScheduled],
  );

  if (!loaded) return null;

  return (
    <ScheduledDownloadsContext.Provider value={value}>{children}</ScheduledDownloadsContext.Provider>
  );
}

export function useScheduledDownloads(): ScheduledDownloadsContextValue {
  const ctx = useContext(ScheduledDownloadsContext);
  if (!ctx) throw new Error('useScheduledDownloads must be used within ScheduledDownloadsProvider');
  return ctx;
}
