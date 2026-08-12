import React, { useCallback } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { BookScreen } from '../screens/BookScreen';
import { ChapterScreen } from '../screens/ChapterScreen';
import { HeaderActions } from '../components/HeaderActions';
import { DrawerMenuButton } from '../components/DrawerMenuButton';
import { useTheme } from '../theme/ThemeContext';
import { ARTWORK_URL } from '../config';

export type HomeStackParamList = {
  Home: undefined;
  Book: { bookId: string };
  Chapter: { bookId: string; chapterSlug: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

function HomeTitle() {
  return (
    <View style={styles.homeTitle}>
      <Image source={{ uri: ARTWORK_URL }} style={styles.logo} />
      <Text style={styles.logoText}>अमृतकण</Text>
    </View>
  );
}

export function HomeStackNavigator() {
  const { colors } = useTheme();
  const renderHeaderRight = useCallback(() => <HeaderActions />, []);
  const renderHomeTitle = useCallback(() => <HomeTitle />, []);
  const renderDrawerMenuButton = useCallback(() => <DrawerMenuButton />, []);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.chrome },
        headerTintColor: colors.chromeText,
        headerRight: renderHeaderRight,
      }}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerTitle: renderHomeTitle, headerLeft: renderDrawerMenuButton }}
      />
      <Stack.Screen name="Book" component={BookScreen} options={{ title: '' }} />
      <Stack.Screen name="Chapter" component={ChapterScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  homeTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 32, height: 32, borderRadius: 16 },
  logoText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
});
