import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { SettingsProvider } from './src/SettingsContext';
import { DownloadsProvider } from './src/DownloadsContext';
import { ScheduledDownloadsProvider } from './src/ScheduledDownloadsContext';
import { ListenedProvider } from './src/ListenedContext';
import { PlayerProvider } from './src/player/PlayerContext';
import { MiniPlayer } from './src/player/MiniPlayer';
import { RootNavigator, type RootStackParamList } from './src/navigation/RootNavigator';

function AppShell() {
  const { mode, colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={styles.stack}>
        <RootNavigator />
      </View>
      <MiniPlayer onExpand={() => navigation.navigate('NowPlaying')} />
    </View>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SettingsProvider>
            <DownloadsProvider>
              <ScheduledDownloadsProvider>
                <ListenedProvider>
                  <PlayerProvider>
                    <NavigationContainer>
                      <AppShell />
                    </NavigationContainer>
                  </PlayerProvider>
                </ListenedProvider>
              </ScheduledDownloadsProvider>
            </DownloadsProvider>
          </SettingsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stack: {
    flex: 1,
  },
});

export default App;
