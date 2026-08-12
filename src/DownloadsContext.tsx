import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { resolveAudioUrl } from './api';
import {
  clearAllDownloadedFiles,
  deleteDownloadedFile,
  downloadEpisode,
  fileExistsFor,
  localUriFor,
} from './downloads';
import { loadDownloadsMap, saveDownloadsMap, type DownloadsMap } from './storage';
import { useSettings } from './SettingsContext';
import { isWifiConnected } from './utils/network';
import type { Episode } from './types';

type DownloadOptions = {
  // Auto-download-next-5 shouldn't pop an alert every time it's blocked by
  // the Wi-Fi-only setting — only explicit user taps should.
  silent?: boolean;
};

type DownloadsContextValue = {
  downloads: DownloadsMap;
  progress: Record<string, number>;
  isDownloaded: (filename: string) => boolean;
  isDownloading: (filename: string) => boolean;
  download: (episode: Episode, options?: DownloadOptions) => Promise<void>;
  removeDownload: (filename: string) => Promise<void>;
  getPlayableUri: (episode: Episode) => string;
  clearAllDownloads: () => Promise<void>;
};

const DownloadsContext = createContext<DownloadsContextValue | null>(null);

export function DownloadsProvider({ children }: { children: React.ReactNode }) {
  const { wifiOnlyDownloads } = useSettings();
  const [downloads, setDownloads] = useState<DownloadsMap>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const map = await loadDownloadsMap();
      // Drop entries whose file vanished (app storage cleared, etc.) so the
      // UI doesn't claim something is downloaded when it can't actually play offline.
      const verified: DownloadsMap = {};
      for (const [filename] of Object.entries(map)) {
        if (await fileExistsFor(filename)) {
          verified[filename] = localUriFor(filename);
        }
      }
      setDownloads(verified);
      setLoaded(true);
      if (Object.keys(verified).length !== Object.keys(map).length) {
        await saveDownloadsMap(verified);
      }
    })();
  }, []);

  const download = useCallback(
    async (episode: Episode, options?: DownloadOptions) => {
      if (wifiOnlyDownloads && !(await isWifiConnected())) {
        if (!options?.silent) {
          Alert.alert('Wi-Fi आवश्यक', 'डाउनलोड करण्यासाठी Wi-Fi शी कनेक्ट व्हा.');
        }
        return;
      }
      setProgress(p => ({ ...p, [episode.filename]: 0 }));
      try {
        const localPath = await downloadEpisode(episode, fraction => {
          setProgress(p => ({ ...p, [episode.filename]: fraction }));
        });
        const uri = `file://${localPath}`;
        setDownloads(prev => {
          const next = { ...prev, [episode.filename]: uri };
          saveDownloadsMap(next);
          return next;
        });
      } finally {
        setProgress(p => {
          const rest = { ...p };
          delete rest[episode.filename];
          return rest;
        });
      }
    },
    [wifiOnlyDownloads],
  );

  const removeDownload = useCallback(async (filename: string) => {
    await deleteDownloadedFile(filename);
    setDownloads(prev => {
      const rest = { ...prev };
      delete rest[filename];
      saveDownloadsMap(rest);
      return rest;
    });
  }, []);

  const clearAllDownloads = useCallback(async () => {
    await clearAllDownloadedFiles();
    setDownloads({});
    await saveDownloadsMap({});
  }, []);

  const isDownloaded = useCallback(
    (filename: string) => !!downloads[filename],
    [downloads],
  );
  const isDownloading = useCallback(
    (filename: string) => progress[filename] !== undefined,
    [progress],
  );
  const getPlayableUri = useCallback(
    (episode: Episode) => downloads[episode.filename] ?? resolveAudioUrl(episode.audioUrl),
    [downloads],
  );

  const value = useMemo<DownloadsContextValue>(
    () => ({
      downloads,
      progress,
      isDownloaded,
      isDownloading,
      download,
      removeDownload,
      getPlayableUri,
      clearAllDownloads,
    }),
    [
      downloads,
      progress,
      isDownloaded,
      isDownloading,
      download,
      removeDownload,
      getPlayableUri,
      clearAllDownloads,
    ],
  );

  if (!loaded) return null;

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloads(): DownloadsContextValue {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error('useDownloads must be used within DownloadsProvider');
  return ctx;
}
