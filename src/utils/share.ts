import { Share } from 'react-native';
import { API_BASE_URL } from '../config';
import type { EpisodeRef } from '../types';

export async function shareUrl(path: string): Promise<void> {
  const url = `${API_BASE_URL}${path}`;
  try {
    await Share.share({ message: url, url });
  } catch {
    // user dismissed the share sheet — not an error
  }
}

/** Site path for an episode's Now Playing deep link:
 * /play/<bookId>/<chapterSlug>/<filename without extension>. Opens the app
 * (Android App Links / iOS Universal Links) when installed, the website
 * otherwise. Mirrors the website's own share button. */
export function episodePlayPath(ref: EpisodeRef): string {
  const stem = ref.episode.filename.replace(/\.(mp3|m4a)$/i, '');
  return `/play/${encodeURIComponent(ref.bookId)}/${encodeURIComponent(
    ref.chapterSlug,
  )}/${encodeURIComponent(stem)}`;
}
