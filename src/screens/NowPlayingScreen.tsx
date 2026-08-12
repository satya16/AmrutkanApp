import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ARTWORK_URL } from '../config';
import { SPEED_PRESETS, usePlayer, type SleepOption } from '../player/PlayerContext';
import { useDownloads } from '../DownloadsContext';
import { useTheme } from '../theme/ThemeContext';
import { OptionPopup, type PopupOption } from '../components/OptionPopup';
import { toDevanagari } from '../utils/devanagari';
import type { RootStackParamList } from '../navigation/RootNavigator';

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const SPEED_OPTIONS: PopupOption<number>[] = SPEED_PRESETS.map(v => ({
  value: v,
  label: `${v}×`,
}));

const SLEEP_OPTIONS: PopupOption<SleepOption>[] = [
  { value: 'episode', label: 'भाग संपल्यावर' },
  { value: 15, label: '१५ मिनिटे' },
  { value: 30, label: '३० मिनिटे' },
  { value: 45, label: '४५ मिनिटे' },
  { value: 60, label: '६० मिनिटे' },
  { value: 'off', label: 'बंद' },
];

function sleepLabel(sleepOption: SleepOption, sleepRemainingMinutes: number | null): string {
  if (sleepOption === 'episode') return 'भाग अखेर';
  if (typeof sleepOption === 'number') {
    return `${toDevanagari(sleepRemainingMinutes ?? sleepOption)} मि`;
  }
  return 'टायमर';
}

type Props = NativeStackScreenProps<RootStackParamList, 'NowPlaying'>;

export function NowPlayingScreen({ navigation }: Props) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    hasNext,
    hasPrevious,
    speed,
    sleepOption,
    sleepRemainingMinutes,
    togglePlayPause,
    seekTo,
    playNext,
    playPrevious,
    setSpeed,
    setSleepOption,
  } = usePlayer();
  const { isDownloaded, isDownloading, download, removeDownload } = useDownloads();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activePopup, setActivePopup] = useState<'speed' | 'sleep' | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);

  if (!currentTrack) {
    navigation.goBack();
    return null;
  }

  const filename = currentTrack.episode.filename;
  const downloaded = isDownloaded(filename);
  const downloading = isDownloading(filename);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>आता वाजत आहे</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} aria-label="Minimize player">
          <AntDesign name="minus" size={20} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.artWrap}>
        <Image source={{ uri: ARTWORK_URL }} style={styles.art} />
      </View>
      <View style={styles.meta}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {currentTrack.episode.label}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {currentTrack.bookName} · {currentTrack.chapterLabel}
        </Text>
      </View>
      <View style={styles.progress}>
        <Slider
          minimumValue={0}
          maximumValue={duration || 0}
          value={currentTime}
          onSlidingComplete={seekTo}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
        />
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatTime(currentTime)}</Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatTime(duration)}</Text>
        </View>
      </View>
      <View style={styles.controls}>
        <Pressable onPress={playPrevious} disabled={!hasPrevious} hitSlop={12} aria-label="Previous track">
          <AntDesign
            name="step-backward"
            size={28}
            color={colors.text}
            style={!hasPrevious && styles.disabled}
          />
        </Pressable>
        <Pressable onPress={togglePlayPause} style={[styles.playBtn, { backgroundColor: colors.accent }]} aria-label="Play or pause">
          <AntDesign name={isPlaying ? 'pause-circle' : 'play-circle'} size={40} color="#ffffff" />
        </Pressable>
        <Pressable onPress={playNext} disabled={!hasNext} hitSlop={12} aria-label="Next track">
          <AntDesign name="step-forward" size={28} color={colors.text} style={!hasNext && styles.disabled} />
        </Pressable>
      </View>
      <View style={styles.pillRow}>
        <Pressable
          style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => setActivePopup('speed')}>
          <Text style={[styles.pillText, { color: colors.text }]}>गती {speed}×</Text>
        </Pressable>
        <Pressable
          style={[
            styles.pill,
            { borderColor: colors.border, backgroundColor: colors.surface },
            sleepOption !== 'off' && { borderColor: colors.accent, backgroundColor: colors.fillTertiary },
          ]}
          onPress={() => setActivePopup('sleep')}>
          <Text style={[styles.pillText, { color: colors.text }]}>
            {sleepLabel(sleepOption, sleepRemainingMinutes)}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.pill, styles.pillIconText, { borderColor: colors.border, backgroundColor: colors.surface }]}
          hitSlop={6}
          onPress={() => (downloaded ? removeDownload(filename) : download(currentTrack.episode))}>
          {downloading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <>
              <AntDesign name={downloaded ? 'check-circle' : 'download'} size={14} color={colors.text} />
              <Text style={[styles.pillText, { color: colors.text }]}>डाउनलोड</Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={[styles.pill, styles.pillIcon, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => setHelpVisible(true)}
          aria-label="मदत">
          <AntDesign name="question-circle" size={16} color={colors.text} />
        </Pressable>
      </View>

      <OptionPopup
        visible={activePopup === 'speed'}
        title="गती"
        options={SPEED_OPTIONS}
        selected={speed}
        onSelect={v => {
          setSpeed(v);
          setActivePopup(null);
        }}
        onClose={() => setActivePopup(null)}
      />
      <OptionPopup
        visible={activePopup === 'sleep'}
        title="टायमर"
        options={SLEEP_OPTIONS}
        selected={sleepOption}
        onSelect={v => {
          setSleepOption(v);
          setActivePopup(null);
        }}
        onClose={() => setActivePopup(null)}
      />

      <Modal visible={helpVisible} transparent animationType="fade" onRequestClose={() => setHelpVisible(false)}>
        <Pressable style={styles.helpBackdrop} onPress={() => setHelpVisible(false)}>
          <Pressable style={[styles.helpCard, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.helpTitle, { color: colors.text }]}>मदत</Text>
            <Text style={[styles.helpLine, { color: colors.text }]}>
              <Text style={styles.helpBold}>गती</Text> — निरूपणाची गती
            </Text>
            <Text style={[styles.helpLine, { color: colors.text }]}>
              <Text style={styles.helpBold}>टायमर</Text> — निरूपण बंद करायचा टायमर
            </Text>
            <Text style={[styles.helpLine, { color: colors.text }]}>
              <Text style={styles.helpBold}>डाउनलोड</Text> — भाग डाउनलोड करा
            </Text>
            <Pressable style={[styles.helpClose, { backgroundColor: colors.accent }]} onPress={() => setHelpVisible(false)}>
              <Text style={styles.helpCloseText}>ठीक आहे</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  artWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  art: {
    width: 280,
    height: 280,
    borderRadius: 22,
  },
  meta: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  progress: {
    paddingHorizontal: 26,
    paddingTop: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 30,
  },
  disabled: {
    opacity: 0.3,
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillIcon: {
    paddingHorizontal: 12,
  },
  pillIconText: {
    flexDirection: 'row',
    gap: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  helpBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  helpCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 14,
    padding: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  helpLine: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  helpBold: {
    fontWeight: '700',
  },
  helpClose: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  helpCloseText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
