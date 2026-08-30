export type Episode = {
  filename: string;
  label: string;
  audioUrl: string;
  sizeBytes: number;
  /** Playback length in whole seconds; null when not in the server's duration cache. */
  durationSeconds: number | null;
};

export type Chapter = {
  slug: string;
  label: string;
  isSpecial: boolean;
  episodeCount: number;
  episodes: Episode[];
  zipSizeBytes: number | null;
};

export type Book = {
  id: string;
  name: string;
  unit: string;
  totalEpisodes: number;
  chapters: Chapter[];
  zipSizeBytes: number | null;
};

export type Library = {
  books: Book[];
  artworkUrl: string;
};

export type PodcastLink = {
  label: string;
  url: string;
  color: string;
  path: string;
};

export type HomeContent = {
  tagline: string;
  siteDescription: string;
  tilakImage: string;
  tilakText: string;
  heroImage: string;
  aboutHeading: string;
  aboutText: string;
  aboutMeHeading: string;
  aboutMePhoto: string;
  aboutMeText: string;
  podcastLinks: PodcastLink[];
  youtube: {
    channelUrl: string;
    channelHandle: string;
    videoIds: string[];
  };
};

export type PustakChapter = {
  title: string;
  page: number;
};

export type PustakBook = {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  pageCount: number;
  thumbnailUrl: string;
  chapters: PustakChapter[];
};

// Identifies an episode within its book/chapter context, e.g. for playback
// queues and download bookkeeping — filename alone is unique site-wide today,
// but carrying the context avoids relying on that never changing.
export type EpisodeRef = {
  bookId: string;
  bookName: string;
  chapterLabel: string;
  episode: Episode;
};
