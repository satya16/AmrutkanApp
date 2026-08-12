import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainDrawer } from './MainDrawer';
import { NowPlayingScreen } from '../screens/NowPlayingScreen';
import { PustakReaderScreen } from '../screens/PustakReaderScreen';

export type RootStackParamList = {
  Main: undefined;
  NowPlaying: undefined;
  PustakReader: { bookId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={MainDrawer} options={{ headerShown: false }} />
      <Stack.Screen
        name="NowPlaying"
        component={NowPlayingScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="PustakReader"
        component={PustakReaderScreen}
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
