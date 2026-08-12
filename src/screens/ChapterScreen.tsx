import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { AntDesign } from '@expo/vector-icons';
import { useLibrary } from '../useLibrary';
import { usePlayer } from '../player/PlayerContext';
import { useDownloads } from '../DownloadsContext';
import { useTheme } from '../theme/ThemeContext';
import { API_BASE_URL } from '../config';
import { downloadZip, zipExistsFor, type ZipDownloadProgress } from '../downloads';
import { AppFooter } from '../components/AppFooter';
import { checkWifiAllowed } from '../utils/network';
import { useSettings } from '../SettingsContext';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Episode, EpisodeRef } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Chapter'>;

export function ChapterScreen({ route, navigation }: Props) {
  const { bookId, chapterSlug } = route.params;
  const { library, loading } = useLibrary();
  const { loadQueueAndPlay, currentTrack, isPlaying } = usePlayer();
  const { isDownloaded, progress, download, removeDownload } = useDownloads();
  const { colors } = useTheme();
  const { wifiOnlyDownloads } = useSettings();
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

  const queue: EpisodeRef[] = chapter.episodes.map(episode => ({
    bookId: book.id,
    bookName: book.name,
    chapterLabel: chapter.label,
    episode,
  }));

  const playEpisode = (episode: Episode) => {
    const index = chapter.episodes.findIndex(e => e.filename === episode.filename);
    loadQueueAndPlay(queue, index);
    // Two hops: out of HomeStackNavigator into MainDrawer, then out of
    // MainDrawer into RootStack, where the NowPlaying modal actually lives.
    navigation
      .getParent()
      ?.getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('NowPlaying');
  };

  const handleDownloadZip = async () => {
    if (!(await checkWifiAllowed(wifiOnlyDownloads))) return;
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
      renderItem={({ item }) => {
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
            <Pressable
              hitSlop={10}
              style={styles.dlBtn}
              onPress={() => (downloaded ? removeDownload(item.filename) : download(item))}>
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
  dlBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
