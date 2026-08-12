import { API_BASE_URL } from './config';
import type { HomeContent, Library } from './types';

export async function fetchLibrary(): Promise<Library> {
  const res = await fetch(`${API_BASE_URL}/api/library`);
  if (!res.ok) {
    throw new Error(`Failed to load library: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchHome(): Promise<HomeContent> {
  const res = await fetch(`${API_BASE_URL}/api/home`);
  if (!res.ok) {
    throw new Error(`Failed to load home content: HTTP ${res.status}`);
  }
  return res.json();
}

export function resolveAudioUrl(audioUrl: string): string {
  return audioUrl.startsWith('http') ? audioUrl : `${API_BASE_URL}${audioUrl}`;
}
