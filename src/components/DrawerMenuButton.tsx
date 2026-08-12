import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

// dispatch() bubbles up to the nearest ancestor navigator that can handle the
// action, so this works from any screen nested inside the drawer (e.g. Book/
// Chapter, several levels deep) without a manual getParent() chain.
export function DrawerMenuButton() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      hitSlop={10}
      style={styles.btn}
      aria-label="Open menu">
      <AntDesign name="bars" size={20} color={colors.chromeText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4 },
});
