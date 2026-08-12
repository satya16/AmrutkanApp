module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Must be listed last — required by react-native-reanimated (v4 ships its
  // actual worklets transform in the separate react-native-worklets package;
  // react-native-reanimated/plugin is now just a thin re-export of this).
  plugins: ['react-native-worklets/plugin'],
};
