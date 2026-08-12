import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { AntDesign } from '@expo/vector-icons';
import { useLibrary } from '../useLibrary';
import { fetchHome, fetchPustake } from '../api';
import { API_BASE_URL } from '../config';
import { useTheme } from '../theme/ThemeContext';
import { toDevanagari } from '../utils/devanagari';
import { BrandIcon } from '../components/BrandIcon';
import { AppFooter } from '../components/AppFooter';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Book, HomeContent, PustakBook } from '../types';

function resolveUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
}

function youtubeThumbnail(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { library, loading, error, isOffline } = useLibrary();
  const [home, setHome] = useState<HomeContent | null>(null);
  const [pustake, setPustake] = useState<PustakBook[] | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    fetchHome().then(setHome).catch(() => {});
    fetchPustake()
      .then(data => setPustake(data.books))
      .catch(() => {});
  }, []);

  if (loading || !home) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !library) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>लायब्ररी लोड करता आली नाही.</Text>
        <Text style={[styles.errorDetail, { color: colors.textSecondary }]}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      {isOffline && (
        <Pressable
          onPress={() => navigation.navigate('Offline')}
          style={[styles.offlineBanner, { backgroundColor: colors.fillTertiary }]}>
          <Text style={{ color: colors.text }}>
            ऑफलाइन — डाउनलोड केलेले भाग ऐकण्यासाठी टॅप करा
          </Text>
        </Pressable>
      )}

      {/* Hero */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.heroCenter}>
          <Image source={{ uri: resolveUrl(home.heroImage) }} style={styles.heroImage} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>अमृतकण</Text>
          <Text style={[styles.heroTagline, { color: colors.textSecondary }]}>{home.tagline}</Text>
          <Pressable
            onPress={() => navigation.navigate('Offline')}
            style={[styles.offlineButton, { backgroundColor: colors.fillTertiary }]}>
            <AntDesign name="download" size={16} color={colors.text} />
            <Text style={[styles.offlineButtonText, { color: colors.text }]}>ऑफलाइन उपलब्ध</Text>
          </Pressable>
        </View>

        <View style={styles.tileGrid}>
          {library.books.map((book: Book) => (
            <Pressable
              key={book.id}
              style={[styles.tile, { backgroundColor: colors.fillTertiary }]}
              onPress={() => navigation.navigate('Book', { bookId: book.id })}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>{book.name}</Text>
              <Text style={[styles.tileCount, { color: colors.textSecondary }]}>
                {toDevanagari(book.totalEpisodes)} भाग
              </Text>
            </Pressable>
          ))}
        </View>

        {home.podcastLinks.length > 0 && (
          <View style={styles.podcastSection}>
            <Text style={[styles.podcastLabel, { color: colors.textSecondary }]}>
              निरूपण इथेही उपलब्ध
            </Text>
            <View style={styles.podcastRow}>
              {home.podcastLinks.map(link => (
                <Pressable
                  key={link.label}
                  style={styles.podcastLink}
                  onPress={() => Linking.openURL(link.url)}>
                  <BrandIcon path={link.path} color={link.color} size={22} />
                  <Text style={[styles.podcastLabelText, { color: colors.text }]}>{link.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* YouTube */}
      <View style={[styles.section, { backgroundColor: colors.fillAlter }]}>
        <View style={styles.sectionHeadCenter}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>यूट्यूब चॅनल</Text>
          <Pressable onPress={() => Linking.openURL(home.youtube.channelUrl)}>
            <Text style={[styles.link, { color: colors.accent }]}>
              {home.youtube.channelHandle} चॅनलला भेट द्या
            </Text>
          </Pressable>
        </View>
        <View style={styles.videoGrid}>
          {home.youtube.videoIds.map(id => (
            <Pressable
              key={id}
              style={styles.videoTile}
              onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${id}`)}>
              <Image source={{ uri: youtubeThumbnail(id) }} style={styles.videoThumb} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* पुस्तके: digital-only book reader, mirrors the website section of
          the same name between YouTube and About. Hidden entirely if the
          fetch hasn't resolved with at least one book yet (e.g. offline on
          first launch), same as the website's guard. */}
      {pustake && pustake.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, styles.centerText, { color: colors.text }]}>पुस्तके</Text>
          <View style={styles.pustakGrid}>
            {pustake.map(book => (
              <Pressable
                key={book.id}
                style={styles.pustakTile}
                onPress={() =>
                  navigation
                    .getParent()
                    ?.getParent<NativeStackNavigationProp<RootStackParamList>>()
                    ?.navigate('PustakReader', { bookId: book.id })
                }>
                <Image source={{ uri: resolveUrl(book.thumbnailUrl) }} style={styles.pustakCover} />
                <Text style={[styles.pustakTitle, { color: colors.text }]} numberOfLines={1}>
                  {book.title}
                </Text>
                {!!book.author && (
                  <Text style={[styles.pustakAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                    {book.author}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* About */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, styles.centerText, { color: colors.text }]}>आमच्याबद्दल</Text>
        <Text style={[styles.paragraph, { color: colors.text }]}>{home.aboutText}</Text>
        <View style={styles.aboutMeCol}>
          <Image source={{ uri: resolveUrl(home.aboutMePhoto) }} style={styles.aboutMePhoto} />
          <Text style={[styles.paragraph, { color: colors.text }]}>{home.aboutMeText}</Text>
        </View>
      </View>

      <AppFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scroll: { flexGrow: 1 },
  errorText: { fontSize: 16, marginBottom: 6, textAlign: 'center' },
  errorDetail: { fontSize: 12, textAlign: 'center' },
  offlineBanner: { alignItems: 'center', paddingVertical: 8 },
  section: { paddingVertical: 32, paddingHorizontal: 20 },
  heroCenter: { alignItems: 'center' },
  heroImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  heroTitle: { fontSize: 32, fontWeight: '800', marginBottom: 8 },
  heroTagline: { fontSize: 16, textAlign: 'center', paddingHorizontal: 16 },
  offlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  offlineButtonText: { fontSize: 14, fontWeight: '600' },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 40 },
  tile: { flexBasis: '47%', flexGrow: 1, borderRadius: 16, paddingVertical: 28, paddingHorizontal: 16, alignItems: 'center' },
  tileTitle: { fontSize: 19, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  tileCount: { fontSize: 13 },
  podcastSection: { marginTop: 40, alignItems: 'center' },
  podcastLabel: { fontSize: 14, marginBottom: 16 },
  podcastRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24 },
  podcastLink: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  podcastLabelText: { fontSize: 14 },
  sectionHeadCenter: { alignItems: 'center' },
  sectionTitle: { fontSize: 22, fontWeight: '700' },
  centerText: { textAlign: 'center', marginBottom: 12 },
  link: { fontSize: 14, marginTop: 8 },
  pustakGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  pustakTile: { width: 130 },
  pustakCover: { width: '100%', aspectRatio: 2 / 3, borderRadius: 8 },
  pustakTitle: { fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  pustakAuthor: { fontSize: 12, textAlign: 'center' },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 },
  videoTile: { flexBasis: '47%', flexGrow: 1, aspectRatio: 16 / 9, borderRadius: 8, overflow: 'hidden' },
  videoThumb: { width: '100%', height: '100%' },
  paragraph: { fontSize: 15, lineHeight: 22 },
  // React Native's Text can't wrap multiple lines around a floated image
  // (no CSS float / TextKit exclusionPaths on cross-platform RN) — stacking
  // the photo above the text avoids squeezing the bio into a narrow column.
  aboutMeCol: { alignItems: 'center', gap: 16, marginTop: 16 },
  aboutMePhoto: { width: 120, height: 156, borderRadius: 14 },
});
