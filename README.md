# AmrutkanApp

React Native (Expo-managed) mobile app for [amrutkan.org](https://amrutkan.org) —
audio playback (`react-native-track-player`) and reading, with offline
downloads and continue-listening/reading state.

## Run

```sh
npm install
npx expo start
```

`package.json`'s own `start`/`android`/`ios` scripts still invoke plain
`react-native` CLI commands, but `metro.config.js` is Expo-managed
(`expo/metro-config`) — use `npx expo start`, not `npm start`.

Android emulator setup (sudo/group steps): `./setup-sudo-steps.sh`.
