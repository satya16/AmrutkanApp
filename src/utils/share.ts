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
