import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadSettings, saveSettings, type Settings } from './storage';

type SettingsContextValue = {
  autoDownloadNext5: boolean;
  setAutoDownloadNext5: (value: boolean) => void;
  wifiOnlyDownloads: boolean;
  setWifiOnlyDownloads: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    autoDownloadNext5: false,
    wifiOnlyDownloads: false,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      setSettings(await loadSettings());
      setLoaded(true);
    })();
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const setAutoDownloadNext5 = useCallback(
    (value: boolean) => update({ autoDownloadNext5: value }),
    [update],
  );
  const setWifiOnlyDownloads = useCallback(
    (value: boolean) => update({ wifiOnlyDownloads: value }),
    [update],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      autoDownloadNext5: settings.autoDownloadNext5,
      setAutoDownloadNext5,
      wifiOnlyDownloads: settings.wifiOnlyDownloads,
      setWifiOnlyDownloads,
    }),
    [settings.autoDownloadNext5, settings.wifiOnlyDownloads, setAutoDownloadNext5, setWifiOnlyDownloads],
  );

  if (!loaded) return null;

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
