import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
  useProgress,
  usePlaybackState,
  type Track,
} from 'react-native-track-player';
import { ARTWORK_URL, SITE_ARTIST_NAME } from '../config';
import { useDownloads } from '../DownloadsContext';
import { useListened } from '../ListenedContext';
import { useSettings } from '../SettingsContext';
import { loadSpeed, saveSpeed } from '../storage';
import type { EpisodeRef } from '../types';

export const SPEED_PRESETS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const SKIP_SECONDS = 30;

export type SleepOption = 'off' | 'episode' | 15 | 30 | 45 | 60;

type PlayerContextValue = {
  queue: EpisodeRef[];
  currentIndex: number;
  currentTrack: EpisodeRef | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  hasNext: boolean;
  hasPrevious: boolean;
  speed: number;
  sleepOption: SleepOption;
  sleepRemainingMinutes: number | null;
  loadQueueAndPlay: (queue: EpisodeRef[], startIndex: number) => void;
  // Same as loadQueueAndPlay but leaves playback paused — for opening the
  // Now Playing screen from a shared /play/... deep link, where the user
  // taps play themselves.
  cueQueue: (queue: EpisodeRef[], startIndex: number) => void;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  setSpeed: (value: number) => void;
  setSleepOption: (option: SleepOption) => void;
  stop: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

let setupPromise: Promise<void> | null = null;

// TrackPlayer.setupPlayer() must only be called once per app lifetime (it
// throws 'player_already_initialized' on a second call) and, on Android,
// only while the app is in the foreground — both satisfied by calling this
// once from PlayerProvider's mount effect, which only ever happens while the
// app is starting up in the foreground.
function setupPlayerOnce(): Promise<void> {
  if (!setupPromise) {
    setupPromise = TrackPlayer.setupPlayer()
      .then(() =>
        TrackPlayer.updateOptions({
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
            Capability.JumpForward,
            Capability.JumpBackward,
          ],
          notificationCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
          forwardJumpInterval: SKIP_SECONDS,
          backwardJumpInterval: SKIP_SECONDS,
          progressUpdateEventInterval: 1,
          android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          },
        }),
      )
      .catch(() => {});
  }
  return setupPromise;
}

async function requestNotificationPermission() {
  if (Platform.OS !== 'android' || Platform.Version < 33) return;
  try {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  } catch {
    // Non-fatal — playback still works, just without a visible notification.
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { getPlayableUri, isDownloaded, isDownloading, download } = useDownloads();
  const { markListened } = useListened();
  const { autoDownloadNext5 } = useSettings();

  const progress = useProgress(500);
  const playbackState = usePlaybackState();

  const [queue, setQueue] = useState<EpisodeRef[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [speed, setSpeedState] = useState(1);
  const sleepEndAtRef = useRef(0);
  const [sleepOption, setSleepOptionState] = useState<SleepOption>('off');

  // Mirrors the latest queue/index/sleepOption into refs so the event
  // listeners below (registered once) always see current values instead of
  // whatever was captured on first render.
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const sleepOptionRef = useRef(sleepOption);
  sleepOptionRef.current = sleepOption;
  const durationRef = useRef(0);
  durationRef.current = progress.duration;

  useEffect(() => {
    loadSpeed().then(setSpeedState);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await requestNotificationPermission();
      await setupPlayerOnce();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSleepOption = useCallback((option: SleepOption) => {
    setSleepOptionState(option);
    sleepEndAtRef.current = typeof option === 'number' ? Date.now() + option * 60000 : 0;
  }, []);

  // Fires when the active track changes for any reason: manual skip, a
  // track finishing and RNTP auto-advancing to the next one, or the queue
  // being reset. lastPosition lets us tell "finished naturally" (within a
  // second of that track's duration) apart from "skipped early" — the same
  // distinction expo-audio's didJustFinish gave us directly.
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, event => {
      if (event.index !== undefined) {
        setCurrentIndex(event.index);
      }
      if (!event.lastTrack) return;
      const finishedNaturally = event.lastPosition >= durationRef.current - 1;
      if (finishedNaturally) {
        markListened(event.lastTrack.id as string);
        if (sleepOptionRef.current === 'episode') {
          TrackPlayer.pause();
          setSleepOption('off');
        }
      }
    });
    return () => sub.remove();
  }, [markListened, setSleepOption]);

  // Sleep countdown check, piggybacking on the existing 500ms progress tick.
  useEffect(() => {
    if (typeof sleepOption !== 'number' || !sleepEndAtRef.current) return;
    if (Date.now() >= sleepEndAtRef.current) {
      TrackPlayer.pause();
      setSleepOption('off');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.position]);

  const setSpeed = useCallback((value: number) => {
    setSpeedState(value);
    TrackPlayer.setRate(value);
    saveSpeed(value);
  }, []);

  const loadQueue = useCallback(
    async (q: EpisodeRef[], startIndex: number, autoplay: boolean) => {
      const track = q[startIndex];
      if (!track) return;
      setQueue(q);
      setCurrentIndex(startIndex);

      await setupPlayerOnce();
      const tracks: Track[] = q.map(ref => ({
        id: ref.episode.filename,
        url: getPlayableUri(ref.episode),
        title: ref.episode.label,
        artist: SITE_ARTIST_NAME,
        album: `${ref.bookName} · ${ref.chapterLabel}`,
        artwork: ARTWORK_URL,
      }));
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      await TrackPlayer.skip(startIndex);
      await TrackPlayer.setRate(speed);
      if (autoplay) await TrackPlayer.play();

      // Only warm the next few downloads once the user has actually
      // committed to listening — not for a link they've merely opened.
      if (autoplay && autoDownloadNext5) {
        q.slice(startIndex + 1, startIndex + 6).forEach(ref => {
          if (!isDownloaded(ref.episode.filename) && !isDownloading(ref.episode.filename)) {
            download(ref.episode, { silent: true }).catch(() => {});
          }
        });
      }
    },
    [getPlayableUri, speed, autoDownloadNext5, isDownloaded, isDownloading, download],
  );

  const loadQueueAndPlay = useCallback(
    (q: EpisodeRef[], startIndex: number) => loadQueue(q, startIndex, true),
    [loadQueue],
  );
  const cueQueue = useCallback(
    (q: EpisodeRef[], startIndex: number) => loadQueue(q, startIndex, false),
    [loadQueue],
  );

  const playNext = useCallback(() => {
    if (currentIndexRef.current >= queueRef.current.length - 1) return;
    TrackPlayer.skipToNext().catch(() => {});
  }, []);

  const playPrevious = useCallback(() => {
    if (currentIndexRef.current <= 0) return;
    TrackPlayer.skipToPrevious().catch(() => {});
  }, []);

  const togglePlayPause = useCallback(() => {
    if (currentIndexRef.current < 0) return;
    if (playbackState.state === State.Playing) TrackPlayer.pause();
    else TrackPlayer.play();
  }, [playbackState.state]);

  const seekTo = useCallback((seconds: number) => {
    TrackPlayer.seekTo(seconds);
  }, []);

  const stop = useCallback(() => {
    TrackPlayer.reset().catch(() => {});
    sleepEndAtRef.current = 0;
    setSleepOptionState('off');
    setQueue([]);
    setCurrentIndex(-1);
  }, []);

  const isBuffering =
    playbackState.state === State.Buffering || playbackState.state === State.Loading;

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      currentIndex,
      currentTrack: currentIndex >= 0 ? (queue[currentIndex] ?? null) : null,
      isPlaying: playbackState.state === State.Playing,
      isBuffering,
      currentTime: progress.position,
      duration: progress.duration,
      buffered: progress.buffered,
      hasNext: currentIndex >= 0 && currentIndex < queue.length - 1,
      hasPrevious: currentIndex > 0,
      speed,
      sleepOption,
      sleepRemainingMinutes:
        typeof sleepOption === 'number' && sleepEndAtRef.current
          ? Math.max(0, Math.ceil((sleepEndAtRef.current - Date.now()) / 60000))
          : null,
      loadQueueAndPlay,
      cueQueue,
      togglePlayPause,
      seekTo,
      playNext,
      playPrevious,
      setSpeed,
      setSleepOption,
      stop,
    }),
    [
      queue,
      currentIndex,
      playbackState.state,
      isBuffering,
      progress.position,
      progress.duration,
      progress.buffered,
      speed,
      sleepOption,
      loadQueueAndPlay,
      cueQueue,
      togglePlayPause,
      seekTo,
      playNext,
      playPrevious,
      setSpeed,
      setSleepOption,
      stop,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
