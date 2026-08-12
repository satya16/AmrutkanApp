import type { Book, Chapter, Episode, Library } from './types';
import type { ListenedMap } from './storage';

interface FlatEntry {
  book: Book;
  chapter: Chapter;
  episode: Episode;
}

// Whole-library sequence, both books back to back in library order
// (ज्ञानेश्वरी then चांगदेव पासष्टी) — the single source of "what's next"
// for the homepage widget below, same idea as the website's
// resolveContinueListening but built from ak_listened (a simple
// {filename: true} completed-episodes set the app already maintains, see
// ListenedContext) rather than a single "last played" pointer with a
// resume time. The app has no per-episode resume-position tracking yet,
// so "next to listen" is defined as the first episode in this sequence
// that isn't marked listened — that also gets book-boundary crossing for
// free: once every ज्ञानेश्वरी episode is listened, the first unlistened
// entry is naturally चांगदेव पासष्टी's first episode.
function flattenLibrary(library: Library): FlatEntry[] {
  return library.books.flatMap(book =>
    book.chapters.flatMap(chapter => chapter.episodes.map(episode => ({ book, chapter, episode }))),
  );
}

export type ContinueState =
  | { mode: 'first'; book: Book; chapter: Chapter; episode: Episode }
  | { mode: 'next'; book: Book; chapter: Chapter; episode: Episode }
  | { mode: 'finished' };

export function resolveContinueListening(library: Library, listened: ListenedMap): ContinueState | null {
  const flat = flattenLibrary(library);
  if (flat.length === 0) return null;

  const nextEntry = flat.find(entry => !listened[entry.episode.filename]);
  if (!nextEntry) return { mode: 'finished' };

  // "first" vs "next" is purely about which caption to show — whether
  // *anything* has been listened to yet, not which episode is next.
  const hasListenedAnything = Object.keys(listened).length > 0;
  return {
    mode: hasListenedAnything ? 'next' : 'first',
    book: nextEntry.book,
    chapter: nextEntry.chapter,
    episode: nextEntry.episode,
  };
}
