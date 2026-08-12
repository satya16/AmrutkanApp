import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

// Mirrors the website's antd <Switch checkedChildren={<MoonOutlined/>}
// unCheckedChildren={<SunOutlined/>} /> — RN's core Switch can't hold icon
// children, so this reproduces that exact look (icon-in-thumb pill) by hand,
// since a bare Switch gave no indication of what it toggles.
export function ThemeToggle() {
  const { mode, toggle, colors } = useTheme();
  const isDark = mode === 'dark';
  // Neutral mid-gray for the "off" track (not colors.border/fillTertiary —
  // both are too close to colors.surface's own white/near-black to read as
  // a visible pill against it in either theme).
  const trackColor = isDark ? colors.accent : 'rgba(128,128,128,0.4)';

  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel="Toggle dark mode"
      style={[styles.track, { backgroundColor: trackColor }]}>
      <View style={[styles.thumb, isDark && styles.thumbChecked]}>
        <AntDesign name={isDark ? 'moon' : 'sun'} size={12} color={isDark ? '#ffffff' : '#d48806'} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbChecked: {
    alignSelf: 'flex-end',
  },
});
