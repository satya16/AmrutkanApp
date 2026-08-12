import type { Book, EpisodeRef } from './types';

// Whole-book queue, chapters flattened in the same order they appear in the
// UI (book.chapters is already server-ordered) — so playNext/playPrevious
// naturally cross chapter boundaries instead of stopping at the end of
// whichever chapter playback started in.
export function buildBookQueue(book: Book): EpisodeRef[] {
  return book.chapters.flatMap(chapter =>
    chapter.episodes.map(episode => ({
      bookId: book.id,
      bookName: book.name,
      chapterLabel: chapter.label,
      episode,
    })),
  );
}
