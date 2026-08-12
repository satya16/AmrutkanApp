import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { usePlayer } from './PlayerContext';

const CHROME = '#1f1f1f';
const PROGRESS_FILL = '#e8935a';
const PROGRESS_TRAIL = 'rgba(255,255,255,0.2)';

export function MiniPlayer({ onExpand }: { onExpand: () => void }) {
  const { currentTrack, isPlaying, togglePlayPause, currentTime, duration, stop } = usePlayer();
  const insets = useSafeAreaInsets();

  if (!currentTrack) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Pressable
      onPress={onExpand}
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <Pressable onPress={togglePlayPause} hitSlop={10} aria-label="Play or pause">
        <AntDesign name={isPlaying ? 'pause-circle' : 'play-circle'} size={32} color="#ffffff" />
      </Pressable>
      <View style={styles.info}>
        <Text style={styles.label} numberOfLines={1}>
          {currentTrack.episode.label}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progressPct}%` }]} />
        </View>
      </View>
      <Pressable onPress={stop} hitSlop={10} style={styles.closeBtn} aria-label="Close player">
        <AntDesign name="close" size={18} color="rgba(255,255,255,0.75)" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: CHROME,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    color: '#ffffff',
  },
  track: {
    height: 3,
    backgroundColor: PROGRESS_TRAIL,
    borderRadius: 2,
    marginTop: 7,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: PROGRESS_FILL,
  },
  closeBtn: {
    padding: 2,
  },
});
