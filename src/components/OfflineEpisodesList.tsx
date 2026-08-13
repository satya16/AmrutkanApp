import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useLibrary } from '../useLibrary';
import { useDownloads } from '../DownloadsContext';
import { useListened } from '../ListenedContext';
import { usePlayer } from '../player/PlayerContext';
import { useTheme } from '../theme/ThemeContext';
import { buildBookQueue } from '../bookQueue';
import type { Book, Chapter, Episode } from '../types';

type Group = { book: Book; chapter: Chapter; episodes: Episode[] };

type Props = {
  // Shown both in Settings (drawer) and on the dedicated Offline screen
  // (home stack) — each host passes its own onPlay so this stays
  // navigation-agnostic (the two hosts sit at different depths in the tree).
  onPlay?: () => void;
  // Settings shows a separate "total space used" summary that isn't backed
  // by DownloadsContext's own state, so it won't notice a deletion made
  // here on its own — this lets that host refresh it.
  onDelete?: () => void;
};

export function OfflineEpisodesList({ onPlay, onDelete }: Props) {
  const { library } = useLibrary();
  const { isDownloaded, removeDownload } = useDownloads();
  const { isListened } = useListened();
  const { loadQueueAndPlay, currentTrack, isPlaying } = usePlayer();
  const { colors } = useTheme();

  if (!library) return null;

  const groups: Group[] = [];
  for (const book of library.books) {
    for (const chapter of book.chapters) {
      const episodes = chapter.episodes.filter(e => isDownloaded(e.filename));
      if (episodes.length) groups.push({ book, chapter, episodes });
    }
  }

  if (groups.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textSecondary }]}>
        अजून कोणतेही भाग डाउनलोड केलेले नाहीत.
      </Text>
    );
  }

  // Queue spans the whole book (crossing chapters, same order as the UI)
  // but filtered to only what's actually downloaded, so next/prev never
  // tries to stream a remote URL that won't resolve offline.
  const playEpisode = (book: Book, episode: Episode) => {
    const queue = buildBookQueue(book).filter(ref => isDownloaded(ref.episode.filename));
    const index = queue.findIndex(ref => ref.episode.filename === episode.filename);
    if (index === -1) return;
    loadQueueAndPlay(queue, index);
    onPlay?.();
  };

  return (
    <View>
      {groups.map(({ book, chapter, episodes }) => (
        <View key={`${book.id}-${chapter.slug}`} style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
            {book.name} · {chapter.label}
          </Text>
          {episodes.map(episode => {
            const isCurrent = currentTrack?.episode.filename === episode.filename;
            return (
              <Pressable
                key={episode.filename}
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => playEpisode(book, episode)}>
                <AntDesign
                  name={isCurrent && isPlaying ? 'pause-circle' : 'play-circle'}
                  size={20}
                  color={isCurrent ? colors.accent : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.label,
                    { color: colors.text },
                    isCurrent && [styles.labelPlaying, { color: colors.accent }],
                  ]}
                  numberOfLines={2}>
                  {episode.label}
                </Text>
                {isListened(episode.filename) && (
                  <AntDesign name="check-circle" size={14} color={colors.accent} />
                )}
                <Pressable
                  hitSlop={10}
                  style={styles.dlBtn}
                  onPress={() => {
                    removeDownload(episode.filename);
                    onDelete?.();
                  }}
                  aria-label="डाउनलोड काढून टाका">
                  <AntDesign name="delete" size={16} color={colors.textSecondary} />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  group: { marginBottom: 8 },
  groupTitle: { fontSize: 12, fontWeight: '600', paddingHorizontal: 4, paddingTop: 16, paddingBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  label: { flex: 1, fontSize: 14 },
  labelPlaying: { fontWeight: '600' },
  dlBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
