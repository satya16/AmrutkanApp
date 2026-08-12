import TrackPlayer, { Event } from 'react-native-track-player';

// Registered once from index.js via TrackPlayer.registerPlaybackService — runs
// outside the React tree (including when the app is backgrounded/killed on
// Android with a foreground service active), so it must not depend on any
// component state and should only ever call TrackPlayer's own imperative API.
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext().catch(() => {}));
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious().catch(() => {}));
  TrackPlayer.addEventListener(Event.RemoteSeek, event => TrackPlayer.seekTo(event.position));
  TrackPlayer.addEventListener(Event.RemoteJumpForward, event => TrackPlayer.seekBy(event.interval));
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, event => TrackPlayer.seekBy(-event.interval));
  TrackPlayer.addEventListener(Event.RemoteDuck, ({ paused, permanent }) => {
    if (permanent) {
      TrackPlayer.pause();
      return;
    }
    if (paused) TrackPlayer.pause();
    else TrackPlayer.play();
  });
}
