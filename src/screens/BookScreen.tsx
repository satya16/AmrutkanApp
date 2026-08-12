import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AntDesign } from '@expo/vector-icons';
import { useLibrary } from '../useLibrary';
import { useTheme } from '../theme/ThemeContext';
import { API_BASE_URL } from '../config';
import { downloadZip, zipExistsFor, type ZipDownloadProgress } from '../downloads';
import { AppFooter } from '../components/AppFooter';
import { toDevanagari } from '../utils/devanagari';
import { checkWifiAllowed } from '../utils/network';
import { useSettings } from '../SettingsContext';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import type { Chapter } from '../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Book'>;

export function BookScreen({ route, navigation }: Props) {
  const { bookId } = route.params;
  const { library, loading } = useLibrary();
  const { colors } = useTheme();
  const { wifiOnlyDownloads } = useSettings();
  const book = library?.books.find(b => b.id === bookId);
  const [zipProgress, setZipProgress] = useState<ZipDownloadProgress | null>(null);
  const [zipDownloaded, setZipDownloaded] = useState(false);

  useLayoutEffect(() => {
    if (book) navigation.setOptions({ title: book.name });
  }, [book, navigation]);

  useEffect(() => {
    zipExistsFor(`${bookId}.zip`).then(setZipDownloaded);
  }, [bookId]);

  if (loading || !book) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const handleDownloadZip = async () => {
    if (!(await checkWifiAllowed(wifiOnlyDownloads))) return;
    setZipProgress({ bytesWritten: 0, contentLength: 0 });
    try {
      await downloadZip(`${API_BASE_URL}/download/book/${book.id}`, `${book.id}.zip`, setZipProgress);
      setZipDownloaded(true);
    } catch {
      // best-effort: leave zipDownloaded false so the user can retry
    } finally {
      setZipProgress(null);
    }
  };

  return (
    <FlatList
      data={book.chapters}
      keyExtractor={item => item.slug}
      numColumns={2}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.row}
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
                संपूर्ण ग्रंथ डाउनलोड करा (ZIP)
              </Text>
            </>
          )}
        </Pressable>
      }
      ListFooterComponent={<AppFooter />}
      renderItem={({ item }: { item: Chapter }) => {
        const single = item.episodeCount === 1;
        return (
          <Pressable
            style={[styles.tile, { backgroundColor: colors.fillTertiary }]}
            onPress={() => navigation.navigate('Chapter', { bookId, chapterSlug: item.slug })}>
            <View style={styles.tileHead}>
              <AntDesign name={single ? 'play-circle' : 'folder'} size={16} color={colors.accent} />
              <Text style={[styles.tileLabel, { color: colors.text }]} numberOfLines={2}>
                {item.label}
              </Text>
            </View>
            {!single && (
              <Text style={[styles.tileCount, { color: colors.textSecondary }]}>
                {toDevanagari(item.episodeCount)} भाग
              </Text>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, gap: 10, flexGrow: 1 },
  row: { gap: 10 },
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
  tile: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 10,
    minHeight: 74,
    justifyContent: 'center',
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  tileLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  tileCount: { fontSize: 10, marginTop: 4, textAlign: 'center' },
});
