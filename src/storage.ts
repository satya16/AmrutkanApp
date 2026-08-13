import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Episode, Library } from './types';

const KEYS = {
  library: 'ak_library_cache',
  downloads: 'ak_downloads', // { [filename]: localFilePath }
  settings: 'ak_settings',
  speed: 'ak_speed',
  theme: 'ak_theme',
  listened: 'ak_listened', // { [filename]: true } — episodes played to completion
  pustakProgress: 'ak_pustak_progress', // { [bookId]: lastReadPage } — mirrors the website's key/shape
  scheduledDownloads: 'ak_scheduled_downloads', // queued while on mobile data, drained once Wi-Fi connects
} as const;

export async function cacheLibrary(library: Library): Promise<void> {
  await AsyncStorage.setItem(KEYS.library, JSON.stringify(library));
}

export async function loadCachedLibrary(): Promise<Library | null> {
  const raw = await AsyncStorage.getItem(KEYS.library);
  return raw ? JSON.parse(raw) : null;
}

export type DownloadsMap = Record<string, string>;

export async function loadDownloadsMap(): Promise<DownloadsMap> {
  const raw = await AsyncStorage.getItem(KEYS.downloads);
  return raw ? JSON.parse(raw) : {};
}

export async function saveDownloadsMap(map: DownloadsMap): Promise<void> {
  await AsyncStorage.setItem(KEYS.downloads, JSON.stringify(map));
}

export type Settings = {
  autoDownloadNext5: boolean;
  wifiOnlyDownloads: boolean;
};

const DEFAULT_SETTINGS: Settings = { autoDownloadNext5: false, wifiOnlyDownloads: false };

export async function loadSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(KEYS.settings);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export async function loadSpeed(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.speed);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function saveSpeed(speed: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.speed, String(speed));
}

export type ThemeMode = 'light' | 'dark';

export async function loadThemeMode(): Promise<ThemeMode | null> {
  const raw = await AsyncStorage.getItem(KEYS.theme);
  return raw === 'light' || raw === 'dark' ? raw : null;
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(KEYS.theme, mode);
}

export type ListenedMap = Record<string, true>;

export async function loadListenedMap(): Promise<ListenedMap> {
  const raw = await AsyncStorage.getItem(KEYS.listened);
  return raw ? JSON.parse(raw) : {};
}

export async function saveListenedMap(map: ListenedMap): Promise<void> {
  await AsyncStorage.setItem(KEYS.listened, JSON.stringify(map));
}

export async function loadPustakPage(bookId: string): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEYS.pustakProgress);
  if (!raw) return null;
  try {
    const all = JSON.parse(raw);
    const page = all?.[bookId];
    return typeof page === 'number' && page >= 1 ? page : null;
  } catch {
    return null;
  }
}

export async function savePustakPage(bookId: string, page: number): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.pustakProgress);
  let all: Record<string, number> = {};
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') all = parsed;
  } catch {
    // corrupt value — overwrite with a fresh map below
  }
  all[bookId] = page;
  await AsyncStorage.setItem(KEYS.pustakProgress, JSON.stringify(all));
}

export type ScheduledDownload =
  | { id: string; type: 'episode'; episode: Episode; label: string; queuedAt: number }
  | { id: string; type: 'zip'; url: string; filename: string; label: string; queuedAt: number };

export async function loadScheduledDownloads(): Promise<ScheduledDownload[]> {
  const raw = await AsyncStorage.getItem(KEYS.scheduledDownloads);
  return raw ? JSON.parse(raw) : [];
}

export async function saveScheduledDownloads(items: ScheduledDownload[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.scheduledDownloads, JSON.stringify(items));
}
