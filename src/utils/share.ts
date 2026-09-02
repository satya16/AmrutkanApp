import { Share } from 'react-native';
import { API_BASE_URL } from '../config';

export async function shareUrl(path: string): Promise<void> {
  const url = `${API_BASE_URL}${path}`;
  try {
    await Share.share({ message: url, url });
  } catch {
    // user dismissed the share sheet — not an error
  }
}

/** Site path for an episode's Now Playing deep link:
 * /play/<bookId>/<chapterSlug>/<n>, where n is the episode's 1-based
 * position within its chapter. Opens the app (Android App Links / iOS
 * Universal Links) when installed, the website otherwise. Mirrors the
 * website's own share button. */
export function episodePlayPath(bookId: string, chapterSlug: string, episodeNumber: number): string {
  return `/play/${encodeURIComponent(bookId)}/${encodeURIComponent(chapterSlug)}/${episodeNumber}`;
}
