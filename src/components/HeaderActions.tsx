import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { shareUrl } from '../utils/share';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';

function currentSharePath(routeName: string, params: object | undefined): string {
  if (routeName === 'Book') {
    const { bookId } = (params ?? {}) as HomeStackParamList['Book'];
    return `/book/${bookId}`;
  }
  if (routeName === 'Chapter') {
    const { bookId, chapterSlug } = (params ?? {}) as HomeStackParamList['Chapter'];
    return `/book/${bookId}/${chapterSlug}`;
  }
  return '/';
}

export function HeaderActions() {
  const route = useRoute();
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => shareUrl(currentSharePath(route.name, route.params))}
        hitSlop={10}
        style={styles.iconBtn}>
        <AntDesign name="share-alt" size={18} color={colors.chromeText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4 },
});
