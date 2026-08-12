import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { usePlayer } from '../player/PlayerContext';
import { useListened } from '../ListenedContext';
import { buildBookQueue } from '../bookQueue';
import { resolveContinueListening } from '../continueListening';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import type { Library } from '../types';

type Props = {
  library: Library;
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Home'>;
};

export function ContinueListening({ library, navigation }: Props) {
  const { colors } = useTheme();
  const { listenedMap } = useListened();
  const player = usePlayer();

  // Recomputed on every render (not cached) — listenedMap already changes
  // whenever an episode finishes, and this component re-renders with it,
  // same reasoning as the website's version reading localStorage fresh
  // each time rather than caching at mount.
  const state = resolveContinueListening(library, listenedMap);
  if (!state) return null;

  if (state.mode === 'finished') {
    return (
      <View style={[styles.button, { backgroundColor: colors.fillTertiary }]}>
        <AntDesign name="check-circle" size={22} color={colors.textSecondary} />
        <View style={styles.textCol}>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>सर्व निरूपण पूर्ण झाले</Text>
          <Text style={[styles.title, { color: colors.textSecondary }]}>तुम्ही संपूर्ण संग्रह ऐकला आहे</Text>
        </View>
      </View>
    );
  }

  const caption = state.mode === 'first' ? 'पहिला भाग ऐका' : 'पुढचा भाग ऐका';

  const handlePress = () => {
    const queue = buildBookQueue(state.book);
    const index = queue.findIndex(ref => ref.episode.filename === state.episode.filename);
    player.loadQueueAndPlay(queue, index);
    // Same two-hop pattern as ChapterScreen: out of HomeStackNavigator into
    // MainDrawer, then out of MainDrawer into RootStack, where the
    // NowPlaying modal actually lives.
    navigation
      .getParent()
      ?.getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('NowPlaying');
  };

  return (
    <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={handlePress}>
      <AntDesign name="play-circle" size={26} color="#ffffff" />
      <View style={styles.textCol}>
        <Text style={styles.captionOnAccent}>{caption}</Text>
        <Text style={styles.titleOnAccent} numberOfLines={1}>
          {state.episode.label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 420,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
  },
  textCol: { flexShrink: 1 },
  caption: { fontSize: 12, opacity: 0.85 },
  title: { fontSize: 15, fontWeight: '700' },
  captionOnAccent: { fontSize: 12, opacity: 0.85, color: '#ffffff' },
  titleOnAccent: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
