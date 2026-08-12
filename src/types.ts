export type Episode = {
  filename: string;
  label: string;
  audioUrl: string;
};

export type Chapter = {
  slug: string;
  label: string;
  isSpecial: boolean;
  episodeCount: number;
  episodes: Episode[];
};

export type Book = {
  id: string;
  name: string;
  unit: string;
  totalEpisodes: number;
  chapters: Chapter[];
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
  heroImage: string;
  aboutText: string;
  aboutMePhoto: string;
  aboutMeText: string;
  podcastLinks: PodcastLink[];
  youtube: {
    channelUrl: string;
    channelHandle: string;
    videoIds: string[];
  };
};

export type PustakBook = {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  pageCount: number;
  thumbnailUrl: string;
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
