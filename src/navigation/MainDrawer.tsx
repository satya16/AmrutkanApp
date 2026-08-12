import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { AntDesign } from '@expo/vector-icons';
import { HomeStackNavigator } from './HomeStackNavigator';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HeaderActions } from '../components/HeaderActions';
import { DrawerMenuButton } from '../components/DrawerMenuButton';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../theme/ThemeContext';

export type DrawerParamList = {
  HomeTab: undefined;
  Settings: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

function HomeDrawerIcon({ color, size }: { color: string; size: number }) {
  return <AntDesign name="home" size={size} color={color} />;
}

function SettingsDrawerIcon({ color, size }: { color: string; size: number }) {
  return <AntDesign name="setting" size={size} color={color} />;
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { colors } = useTheme();
  const activeRouteName = props.state.routeNames[props.state.index];

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: colors.surface }}>
      <DrawerItem
        label="मुख्यपृष्ठ"
        icon={HomeDrawerIcon}
        focused={activeRouteName === 'HomeTab'}
        activeTintColor={colors.accent}
        inactiveTintColor={colors.text}
        onPress={() => props.navigation.navigate('HomeTab')}
      />
      <DrawerItem
        label="सेटिंग्ज"
        icon={SettingsDrawerIcon}
        focused={activeRouteName === 'Settings'}
        activeTintColor={colors.accent}
        inactiveTintColor={colors.text}
        onPress={() => props.navigation.navigate('Settings')}
      />
      <View style={[styles.divider, { borderTopColor: colors.border }]} />
      <View style={styles.themeRow}>
        <Text style={[styles.themeLabel, { color: colors.text }]}>डार्क मोड</Text>
        <ThemeToggle />
      </View>
    </DrawerContentScrollView>
  );
}

export function MainDrawer() {
  const { colors } = useTheme();
  const renderHeaderRight = useCallback(() => <HeaderActions />, []);
  const renderDrawerMenuButton = useCallback(() => <DrawerMenuButton />, []);
  const renderDrawerContent = useCallback((props: DrawerContentComponentProps) => <CustomDrawerContent {...props} />, []);

  return (
    <Drawer.Navigator
      drawerContent={renderDrawerContent}
      screenOptions={{
        headerStyle: { backgroundColor: colors.chrome },
        headerTintColor: colors.chromeText,
        headerRight: renderHeaderRight,
      }}>
      <Drawer.Screen name="HomeTab" component={HomeStackNavigator} options={{ headerShown: false }} />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'सेटिंग्ज', headerLeft: renderDrawerMenuButton }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  divider: { borderTopWidth: 1, marginTop: 8, paddingTop: 12 },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  themeLabel: { fontSize: 15 },
});
