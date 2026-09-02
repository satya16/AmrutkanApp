import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { AntDesign } from '@expo/vector-icons';
import { useLibrary } from '../useLibrary';
import { usePlayer } from '../player/PlayerContext';
import { useDownloads } from '../DownloadsContext';
import { useListened } from '../ListenedContext';
import { buildBookQueue } from '../bookQueue';
import { useTheme } from '../theme/ThemeContext';
import { API_BASE_URL } from '../config';
import { downloadZip, zipExistsFor, type ZipDownloadProgress } from '../downloads';
import { AppFooter } from '../components/AppFooter';
import { promptDownload } from '../downloadPrompt';
import { episodePlayPath, shareUrl } from '../utils/share';
import { useScheduledDownloads } from '../ScheduledDownloadsContext';
import { useSettings } from '../SettingsContext';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Episode } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Chapter'>;

/** Coarse fixed-length label, matching the website: "22 मि" / "1 ता 05 मि". */
function formatDurationLabel(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '';
  let m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  m = m % 60;
  return h > 0 ? `${h} ता ${String(m).padStart(2, '0')} मि` : `${m} मि`;
}

export function ChapterScreen({ route, navigation }: Props) {
  const { bookId, chapterSlug } = route.params;
  const { library, loading } = useLibrary();
  const { loadQueueAndPlay, currentTrack, isPlaying } = usePlayer();
  const { isDownloaded, progress, download, removeDownload } = useDownloads();
  const { isListened } = useListened();
  const { colors } = useTheme();
  const { wifiOnlyDownloads } = useSettings();
  const { scheduleDownload } = useScheduledDownloads();
  const [zipProgress, setZipProgress] = useState<ZipDownloadProgress | null>(null);
  const [zipDownloaded, setZipDownloaded] = useState(false);

  const book = library?.books.find(b => b.id === bookId);
  const chapter = book?.chapters.find(c => c.slug === chapterSlug);
  const zipFilename = `${bookId}-${chapterSlug}.zip`;

  useLayoutEffect(() => {
    if (chapter) navigation.setOptions({ title: chapter.label });
  }, [chapter, navigation]);

  useEffect(() => {
    zipExistsFor(zipFilename).then(setZipDownloaded);
  }, [zipFilename]);

  if (loading || !book || !chapter) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const playEpisode = (episode: Episode) => {
    const queue = buildBookQueue(book);
    const index = queue.findIndex(ref => ref.episode.filename === episode.filename);
    loadQueueAndPlay(queue, index);
    // Two hops: out of HomeStackNavigator into MainDrawer, then out of
    // MainDrawer into RootStack, where the NowPlaying modal actually lives.
    navigation
      .getParent()
      ?.getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('NowPlaying');
  };

  const handleDownloadZip = async () => {
    const label = `संपूर्ण ${chapter.label} (ZIP)`;
    const decision = await promptDownload(label, chapter.zipSizeBytes, wifiOnlyDownloads);
    if (decision === 'cancel') return;
    if (decision === 'schedule') {
      await scheduleDownload({
        type: 'zip',
        url: `${API_BASE_URL}/download/book/${bookId}/${chapterSlug}`,
        filename: zipFilename,
        label,
      });
      return;
    }
    setZipProgress({ bytesWritten: 0, contentLength: 0 });
    try {
      await downloadZip(
        `${API_BASE_URL}/download/book/${bookId}/${chapterSlug}`,
        zipFilename,
        setZipProgress,
      );
      setZipDownloaded(true);
    } catch {
      // best-effort: leave zipDownloaded false so the user can retry
    } finally {
      setZipProgress(null);
    }
  };

  const handleEpisodeDownload = async (episode: Episode) => {
    const decision = await promptDownload(episode.label, episode.sizeBytes, wifiOnlyDownloads);
    if (decision === 'cancel') return;
    if (decision === 'schedule') {
      await scheduleDownload({ type: 'episode', episode, label: episode.label });
      return;
    }
    download(episode);
  };

  return (
    <FlatList
      data={chapter.episodes}
      keyExtractor={item => item.filename}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Pressable
          style={[styles.zipButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={handleDownloadZip}
          disabled={zipProgress !== null}>
          {zipProgress ? (
            <>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.zipButtonText, { color: colors.text }]}>डाउनलोड होत आहे…</Text>
            </>
          ) : (
            <>
              <AntDesign name={zipDownloaded ? 'check-circle' : 'download'} size={16} color={colors.text} />
              <Text style={[styles.zipButtonText, { color: colors.text }]}>
                संपूर्ण {chapter.label} डाउनलोड करा (ZIP)
              </Text>
            </>
          )}
        </Pressable>
      }
      ListFooterComponent={<AppFooter />}
      renderItem={({ item, index }) => {
        const isCurrent = currentTrack?.episode.filename === item.filename;
        const downloaded = isDownloaded(item.filename);
        const downloadFraction = progress[item.filename];
        const iconName = isCurrent ? (isPlaying ? 'pause-circle' : 'play-circle') : 'play-circle';
        const iconColor = isCurrent ? colors.accent : colors.textSecondary;
        return (
          <Pressable
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => playEpisode(item)}>
            <AntDesign name={iconName} size={22} color={iconColor} />
            <Text
              style={[
                styles.label,
                { color: colors.text },
                isCurrent && [styles.labelPlaying, { color: colors.accent }],
              ]}
              numberOfLines={2}>
              {item.label}
            </Text>
            {isListened(item.filename) && (
              <AntDesign
                name="check-circle"
                size={14}
                color={colors.accent}
                style={styles.listenedTick}
                aria-label="पूर्ण ऐकले"
              />
            )}
            <Pressable
              hitSlop={10}
              style={styles.dlBtn}
              aria-label="शेअर करा"
              onPress={() => shareUrl(episodePlayPath(bookId, chapterSlug, index + 1))}>
              <AntDesign name="share-alt" size={16} color={colors.textSecondary} />
            </Pressable>
            {item.durationSeconds ? (
              <View style={styles.duration}>
                <AntDesign name="clock-circle" size={11} color={colors.textSecondary} />
                <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                  {formatDurationLabel(item.durationSeconds)}
                </Text>
              </View>
            ) : null}
            <Pressable
              hitSlop={10}
              style={styles.dlBtn}
              onPress={() => (downloaded ? removeDownload(item.filename) : handleEpisodeDownload(item))}>
              {downloadFraction !== undefined ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <AntDesign
                  name={downloaded ? 'check-circle' : 'download'}
                  size={16}
                  color={colors.textSecondary}
                />
              )}
            </Pressable>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, flexGrow: 1 },
  zipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 14,
  },
  zipButtonText: { fontSize: 14, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  label: { flex: 1, fontSize: 14 },
  labelPlaying: { fontWeight: '600' },
  listenedTick: { marginLeft: -4 },
  duration: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  durationText: { fontSize: 12 },
  dlBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
