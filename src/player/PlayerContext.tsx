import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createAudioPlayer,
  requestNotificationPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayerStatus,
  type AudioPlayer,
} from 'expo-audio';
import { ARTWORK_URL, SITE_ARTIST_NAME } from '../config';
import { useDownloads } from '../DownloadsContext';
import { useListened } from '../ListenedContext';
import { useSettings } from '../SettingsContext';
import { loadSpeed, saveSpeed } from '../storage';
import type { EpisodeRef } from '../types';

export const SPEED_PRESETS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type SleepOption = 'off' | 'episode' | 15 | 30 | 45 | 60;

type PlayerContextValue = {
  queue: EpisodeRef[];
  currentIndex: number;
  currentTrack: EpisodeRef | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  hasNext: boolean;
  hasPrevious: boolean;
  speed: number;
  sleepOption: SleepOption;
  sleepRemainingMinutes: number | null;
  loadQueueAndPlay: (queue: EpisodeRef[], startIndex: number) => void;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  setSpeed: (value: number) => void;
  setSleepOption: (option: SleepOption) => void;
  stop: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { getPlayableUri, isDownloaded, isDownloading, download } = useDownloads();
  const { markListened } = useListened();
  const { autoDownloadNext5 } = useSettings();
  // Lazy-initialized: useRef's initializer argument is evaluated on every
  // render even though only the first result is kept, so passing
  // createAudioPlayer(...) directly would construct (and immediately
  // discard) a real native player/media-session on every re-render.
  const playerRef = useRef<AudioPlayer | null>(null);
  if (playerRef.current === null) {
    playerRef.current = createAudioPlayer(null, { updateInterval: 500 });
  }
  const player = playerRef.current;
  const status = useAudioPlayerStatus(player);

  const [queue, setQueue] = useState<EpisodeRef[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [speed, setSpeedState] = useState(1);
  // Sleep countdown target lives in a ref (not state) since nothing renders it
  // directly — only the derived `sleepRemainingMinutes` below, recomputed off
  // the player's own 500ms status tick.
  const sleepEndAtRef = useRef(0);
  // Deliberately defaults to 'off', not 'episode' like the reference website —
  // this app's default is always-auto-advance (see the didJustFinish effect
  // below), and sleep state intentionally does not persist across restarts.
  const [sleepOption, setSleepOptionState] = useState<SleepOption>('off');

  useEffect(() => {
    loadSpeed().then(setSpeedState);
  }, []);

  useEffect(() => {
    setAudioModeAsync({
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      playsInSilentMode: true,
    }).catch(() => {});
    requestNotificationPermissionsAsync().catch(() => {});
    return () => {
      player.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSpeed = useCallback(
    (value: number) => {
      setSpeedState(value);
      player.setPlaybackRate(value);
      saveSpeed(value);
    },
    [player],
  );

  const setSleepOption = useCallback((option: SleepOption) => {
    setSleepOptionState(option);
    sleepEndAtRef.current = typeof option === 'number' ? Date.now() + option * 60000 : 0;
  }, []);

  const loadTrackAt = useCallback(
    (q: EpisodeRef[], index: number) => {
      const track = q[index];
      if (!track) return;
      const uri = getPlayableUri(track.episode);
      player.replace({ uri, name: track.episode.label });
      player.setPlaybackRate(speed);
      player.play();
      player.setActiveForLockScreen(true, {
        title: track.episode.label,
        artist: SITE_ARTIST_NAME,
        albumTitle: `${track.bookName} · ${track.chapterLabel}`,
        artworkUrl: ARTWORK_URL,
      });
      if (autoDownloadNext5) {
        q.slice(index + 1, index + 6).forEach(ref => {
          if (!isDownloaded(ref.episode.filename) && !isDownloading(ref.episode.filename)) {
            download(ref.episode, { silent: true }).catch(() => {});
          }
        });
      }
    },
    [getPlayableUri, player, speed, autoDownloadNext5, isDownloaded, isDownloading, download],
  );

  const loadQueueAndPlay = useCallback(
    (q: EpisodeRef[], startIndex: number) => {
      setQueue(q);
      setCurrentIndex(startIndex);
      loadTrackAt(q, startIndex);
    },
    [loadTrackAt],
  );

  const playNext = useCallback(() => {
    setCurrentIndex(idx => {
      const next = idx + 1;
      if (next >= queue.length) return idx;
      loadTrackAt(queue, next);
      return next;
    });
  }, [queue, loadTrackAt]);

  const playPrevious = useCallback(() => {
    setCurrentIndex(idx => {
      const prev = idx - 1;
      if (prev < 0) return idx;
      loadTrackAt(queue, prev);
      return prev;
    });
  }, [queue, loadTrackAt]);

  // Auto-advance when a track ends, mirroring the web player's default
  // ("stop at end of episode" is intentionally not the default here — unlike
  // the web app, this queue is always a single chapter's episode list, so
  // auto-advancing to the next episode is the expected podcast-like behavior)
  // — unless the user armed the sleep timer's "stop at end of episode"
  // option, in which case this is a one-shot: it's consumed here and later
  // tracks resume normal auto-advance.
  useEffect(() => {
    if (!status.didJustFinish) return;
    const finishedTrack = queue[currentIndex];
    if (finishedTrack) markListened(finishedTrack.episode.filename);
    if (sleepOption === 'episode') {
      setSleepOption('off');
      return;
    }
    playNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  // Sleep countdown check, piggybacking on the player's existing 500ms status
  // tick instead of a separate setInterval. Naturally freezes while paused
  // (currentTime stops changing), matching the reference website's
  // timeupdate-driven equivalent.
  useEffect(() => {
    if (typeof sleepOption !== 'number' || !sleepEndAtRef.current) return;
    if (Date.now() >= sleepEndAtRef.current) {
      player.pause();
      setSleepOption('off');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.currentTime]);

  const togglePlayPause = useCallback(() => {
    if (currentIndex < 0) return;
    if (player.playing) player.pause();
    else player.play();
  }, [player, currentIndex]);

  const seekTo = useCallback(
    (seconds: number) => {
      player.seekTo(seconds);
    },
    [player],
  );

  const stop = useCallback(() => {
    // player.replace(null) is deliberately not called here: despite what its
    // TS signature (shared with createAudioPlayer's constructor arg) implies,
    // the native binding rejects a null source for replace() specifically.
    // Pausing and clearing the app-level queue/index is enough — currentTrack
    // becomes null, which is what actually drives the UI hiding the player.
    player.pause();
    player.setActiveForLockScreen(false);
    sleepEndAtRef.current = 0;
    setSleepOptionState('off');
    setQueue([]);
    setCurrentIndex(-1);
  }, [player]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      currentIndex,
      currentTrack: currentIndex >= 0 ? (queue[currentIndex] ?? null) : null,
      isPlaying: status.playing,
      isBuffering: status.isBuffering,
      currentTime: status.currentTime,
      duration: status.duration,
      hasNext: currentIndex >= 0 && currentIndex < queue.length - 1,
      hasPrevious: currentIndex > 0,
      speed,
      sleepOption,
      sleepRemainingMinutes:
        typeof sleepOption === 'number' && sleepEndAtRef.current
          ? Math.max(0, Math.ceil((sleepEndAtRef.current - Date.now()) / 60000))
          : null,
      loadQueueAndPlay,
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
      status.playing,
      status.isBuffering,
      status.currentTime,
      status.duration,
      speed,
      sleepOption,
      loadQueueAndPlay,
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
