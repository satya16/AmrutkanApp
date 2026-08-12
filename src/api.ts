import { API_BASE_URL } from './config';
import type { HomeContent, Library, PustakBook } from './types';

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

export async function fetchPustake(): Promise<{ books: PustakBook[] }> {
  const res = await fetch(`${API_BASE_URL}/api/pustake`);
  if (!res.ok) {
    throw new Error(`Failed to load books: HTTP ${res.status}`);
  }
  return res.json();
}

// Pages are served one at a time, never the source PDF — see
// serve_pustak_page in the website's app.py. No local caching/download of
// these on the app side (yet); matches the website's approach of not
// exposing the whole book as a single downloadable file.
export function resolvePustakPageUrl(bookId: string, page: number): string {
  return `${API_BASE_URL}/pustak/${bookId}/page/${page}.jpg`;
}
