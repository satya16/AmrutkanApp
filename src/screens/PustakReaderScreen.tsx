import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchPustake, resolvePustakPageUrl } from '../api';
import { loadPustakPage, savePustakPage } from '../storage';
import { useTheme } from '../theme/ThemeContext';
import { toDevanagari } from '../utils/devanagari';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { PustakBook } from '../types';

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

// Pinch to zoom, double-tap to toggle zoom, pan to explore once zoomed,
// swipe left/right to turn the page once back at the default zoom — the
// mobile-native equivalents of the website reader's zoom buttons and
// touch-swipe handler. No on-screen zoom buttons here: pinch/double-tap is
// the idiomatic mobile pattern, unlike the website which had no pinch
// gesture available to it in a browser without also fighting the page's
// own native pinch-zoom.
const ZOOM_MAX = 3;
const DOUBLE_TAP_ZOOM = 2.5;
const SWIPE_THRESHOLD = 50;

type Props = NativeStackScreenProps<RootStackParamList, 'PustakReader'>;

export function PustakReaderScreen({ route, navigation }: Props) {
  const { bookId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const [book, setBook] = useState<PustakBook | null | undefined>(undefined);
  // null while the saved page is still being read from AsyncStorage — kept
  // separate from "no book" so the very first image fetch is already for
  // the right page instead of fetching page 1 and correcting afterward.
  const [page, setPage] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    fetchPustake()
      .then(data => {
        if (!cancelled) setBook(data.books.find(b => b.id === bookId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setBook(null);
      });
    loadPustakPage(bookId).then(saved => {
      if (!cancelled) setPage(saved ?? 1);
    });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const resetZoom = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  useEffect(() => {
    if (page === null) return;
    resetZoom();
    setImageLoaded(false);
    if (book) savePustakPage(book.id, page);
    // resetZoom reads/writes shared values, not reactive state — safe to
    // omit from deps, it doesn't need to re-run on its own account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, page]);

  useEffect(() => {
    if (!book || page === null || page >= book.pageCount) return;
    Image.prefetch(resolvePustakPageUrl(book.id, page + 1)).catch(() => {});
  }, [book, page]);

  const goNext = () => setPage(p => (p !== null && book ? Math.min(book.pageCount, p + 1) : p));
  const goPrev = () => setPage(p => (p !== null ? Math.max(1, p - 1) : p));
  // Shared by the chapter list and the progress slider below — both jump
  // straight to an arbitrary page, unlike goNext/goPrev's one-step moves.
  const goToPage = (target: number) => {
    if (!book) return;
    setPage(Math.max(1, Math.min(book.pageCount, target)));
  };

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = clamp(savedScale.value * e.scale, 1, ZOOM_MAX);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate(e => {
      if (savedScale.value > 1.01) {
        const maxX = (winW * (savedScale.value - 1)) / 2;
        const maxY = (winH * (savedScale.value - 1)) / 2;
        translateX.value = clamp(savedTranslateX.value + e.translationX, -maxX, maxX);
        translateY.value = clamp(savedTranslateY.value + e.translationY, -maxY, maxY);
      }
    })
    .onEnd(e => {
      if (savedScale.value > 1.01) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        return;
      }
      // Not zoomed: a horizontal drag here means "turn the page", not "pan
      // around" — same threshold/shape check as the website's swipe
      // handler (mostly-horizontal, past a minimum distance).
      const dx = e.translationX;
      const dy = e.translationY;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) runOnJS(goNext)();
        else runOnJS(goPrev)();
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1.01) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(DOUBLE_TAP_ZOOM);
        savedScale.value = DOUBLE_TAP_ZOOM;
      }
    });

  // Double-tap is tried first; anything it doesn't recognize (a single
  // tap, or a pinch/pan gesture) falls through to pinch+pan running
  // together.
  const composedGesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  if (book === undefined || page === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (book === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>पुस्तक सापडले नाही</Text>
        <Pressable style={[styles.closeButton, { backgroundColor: colors.accent }]} onPress={() => navigation.goBack()}>
          <Text style={styles.closeButtonText}>मागे जा</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {book.title}
        </Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} aria-label="बंद करा">
          <AntDesign name="close" size={22} color="#ffffff" />
        </Pressable>
      </View>

      <GestureDetector gesture={composedGesture}>
        <View style={styles.imageArea}>
          {!imageLoaded && <ActivityIndicator color={colors.accent} size="large" style={StyleSheet.absoluteFill} />}
          <Animated.Image
            key={page}
            source={{ uri: resolvePustakPageUrl(book.id, page) }}
            style={[styles.pageImage, animatedStyle]}
            resizeMode="contain"
            onLoadEnd={() => setImageLoaded(true)}
          />
        </View>
      </GestureDetector>

      {/* Seekable progress bar — same seek-slider pattern as the audio
          player (NowPlayingScreen.tsx), scrubbing pages instead of
          seconds. Only commits to `page` on release (onSlidingComplete),
          so dragging across the book doesn't fetch every page in between. */}
      <View style={styles.sliderRow}>
        <Slider
          minimumValue={1}
          maximumValue={book.pageCount}
          step={1}
          value={page}
          onSlidingComplete={goToPage}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor="rgba(255,255,255,0.25)"
          thumbTintColor={colors.accent}
        />
      </View>

      <View style={styles.footer}>
        {book.chapters.length > 0 && (
          <Pressable onPress={() => setTocVisible(true)} hitSlop={12} aria-label="अनुक्रमणिका">
            <AntDesign name="unordered-list" size={20} color="#ffffff" />
          </Pressable>
        )}
        <Pressable onPress={goPrev} disabled={page <= 1} hitSlop={12} aria-label="मागील पान">
          <AntDesign name="left" size={22} color={page <= 1 ? 'rgba(255,255,255,0.3)' : '#ffffff'} />
        </Pressable>
        <Text style={styles.pageText}>
          पृष्ठ {toDevanagari(page)} / {toDevanagari(book.pageCount)}
        </Text>
        <Pressable onPress={goNext} disabled={page >= book.pageCount} hitSlop={12} aria-label="पुढील पान">
          <AntDesign name="right" size={22} color={page >= book.pageCount ? 'rgba(255,255,255,0.3)' : '#ffffff'} />
        </Pressable>
      </View>

      <Modal visible={tocVisible} transparent animationType="slide" onRequestClose={() => setTocVisible(false)}>
        <Pressable style={styles.tocBackdrop} onPress={() => setTocVisible(false)}>
          <Pressable style={styles.tocSheet} onPress={() => {}}>
            <Text style={styles.tocTitle}>अनुक्रमणिका</Text>
            <FlatList
              data={book.chapters}
              keyExtractor={item => String(item.page)}
              renderItem={({ item, index }) => {
                const next = book.chapters[index + 1];
                const isCurrent = page >= item.page && (!next || page < next.page);
                return (
                  <Pressable
                    style={[styles.tocItem, isCurrent && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                    onPress={() => {
                      goToPage(item.page);
                      setTocVisible(false);
                    }}>
                    <Text style={[styles.tocItemText, isCurrent && styles.tocItemTextCurrent]}>{item.title}</Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Always black regardless of the app's light/dark toggle — same reasoning
// as the website's fullscreen reader: a dedicated reading view reads
// better with a neutral dark frame around the page than with the
// day-to-day app chrome, and it means page images (mostly white paper)
// keep consistent contrast either way.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  notFoundText: { color: '#ffffff', fontSize: 16, marginBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 12 },
  imageArea: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pageImage: { width: '100%', height: '100%' },
  sliderRow: { paddingHorizontal: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingVertical: 14 },
  pageText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  closeButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  closeButtonText: { color: '#ffffff', fontWeight: '600' },
  tocBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  tocSheet: {
    maxHeight: '70%',
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  tocTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 },
  tocItem: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginHorizontal: 8 },
  tocItemText: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  tocItemTextCurrent: { color: '#ffffff', fontWeight: '700' },
});
