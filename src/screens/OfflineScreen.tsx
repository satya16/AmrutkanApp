import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { OfflineEpisodesList } from '../components/OfflineEpisodesList';
import { AppFooter } from '../components/AppFooter';
import { useTheme } from '../theme/ThemeContext';
import type { HomeStackParamList } from '../navigation/HomeStackNavigator';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<HomeStackParamList, 'Offline'>;

export function OfflineScreen({ navigation }: Props) {
  const { colors } = useTheme();

  const goToNowPlaying = () => {
    // Same two-hop pattern as ChapterScreen: out of HomeStackNavigator into
    // MainDrawer, then out of MainDrawer into RootStack, where NowPlaying lives.
    navigation
      .getParent()
      ?.getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.navigate('NowPlaying');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      <OfflineEpisodesList onPlay={goToNowPlaying} />
      <AppFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, flexGrow: 1 },
});
