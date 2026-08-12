import RNFS from 'react-native-fs';
import { resolveAudioUrl } from './api';
import type { Episode } from './types';

const DOWNLOAD_DIR = `${RNFS.DocumentDirectoryPath}/episodes`;

function localPathFor(filename: string): string {
  return `${DOWNLOAD_DIR}/${filename}`;
}

export async function ensureDownloadDir(): Promise<void> {
  const exists = await RNFS.exists(DOWNLOAD_DIR);
  if (!exists) {
    await RNFS.mkdir(DOWNLOAD_DIR);
  }
}

export async function downloadEpisode(
  episode: Episode,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  await ensureDownloadDir();
  const toFile = localPathFor(episode.filename);
  const fromUrl = resolveAudioUrl(episode.audioUrl);

  const { promise } = RNFS.downloadFile({
    fromUrl,
    toFile,
    progressDivider: 5,
    progress: res => {
      if (onProgress && res.contentLength > 0) {
        onProgress(res.bytesWritten / res.contentLength);
      }
    },
  });

  const result = await promise;
  if (result.statusCode !== 200) {
    // Clean up a partial file so a retry doesn't see a corrupt download as "done".
    await RNFS.unlink(toFile).catch(() => {});
    throw new Error(`Download failed: HTTP ${result.statusCode}`);
  }
  return toFile;
}

export async function deleteDownloadedFile(filename: string): Promise<void> {
  const path = localPathFor(filename);
  const exists = await RNFS.exists(path);
  if (exists) {
    await RNFS.unlink(path);
  }
}

export async function fileExistsFor(filename: string): Promise<boolean> {
  return RNFS.exists(localPathFor(filename));
}

export function localUriFor(filename: string): string {
  return `file://${localPathFor(filename)}`;
}

const ZIP_DIR = `${RNFS.DocumentDirectoryPath}/zips`;

function zipPathFor(filename: string): string {
  return `${ZIP_DIR}/${filename}`;
}

export async function ensureZipDir(): Promise<void> {
  const exists = await RNFS.exists(ZIP_DIR);
  if (!exists) {
    await RNFS.mkdir(ZIP_DIR);
  }
}

export type ZipDownloadProgress = {
  bytesWritten: number;
  // The book/chapter ZIP endpoint streams without a Content-Length header
  // (size isn't known upfront), so this is <= 0 when the total is unknown —
  // callers should fall back to an indeterminate progress indicator then.
  contentLength: number;
};

export async function downloadZip(
  url: string,
  filename: string,
  onProgress?: (progress: ZipDownloadProgress) => void,
): Promise<string> {
  await ensureZipDir();
  const toFile = zipPathFor(filename);

  const { promise } = RNFS.downloadFile({
    fromUrl: url,
    toFile,
    progressDivider: 1,
    progress: res => {
      onProgress?.({ bytesWritten: res.bytesWritten, contentLength: res.contentLength });
    },
  });

  const result = await promise;
  if (result.statusCode !== 200) {
    await RNFS.unlink(toFile).catch(() => {});
    throw new Error(`Download failed: HTTP ${result.statusCode}`);
  }
  return toFile;
}

export async function zipExistsFor(filename: string): Promise<boolean> {
  return RNFS.exists(zipPathFor(filename));
}

async function dirSummary(dir: string): Promise<{ count: number; bytes: number }> {
  const exists = await RNFS.exists(dir);
  if (!exists) return { count: 0, bytes: 0 };
  const items = await RNFS.readDir(dir);
  const files = items.filter(item => item.isFile());
  return { count: files.length, bytes: files.reduce((sum, item) => sum + item.size, 0) };
}

export type DownloadsSummary = {
  episodeCount: number;
  episodeBytes: number;
  zipCount: number;
  zipBytes: number;
  totalBytes: number;
};

export async function getDownloadsSummary(): Promise<DownloadsSummary> {
  const [episodes, zips] = await Promise.all([dirSummary(DOWNLOAD_DIR), dirSummary(ZIP_DIR)]);
  return {
    episodeCount: episodes.count,
    episodeBytes: episodes.bytes,
    zipCount: zips.count,
    zipBytes: zips.bytes,
    totalBytes: episodes.bytes + zips.bytes,
  };
}

export async function clearAllDownloadedFiles(): Promise<void> {
  await Promise.all([
    RNFS.unlink(DOWNLOAD_DIR).catch(() => {}),
    RNFS.unlink(ZIP_DIR).catch(() => {}),
  ]);
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
