import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function AppFooter() {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.copyright, { color: colors.textSecondary }]}>
        © {new Date().getFullYear()} अमृतकण. सर्व हक्क राखीव.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 24 },
  copyright: { fontSize: 12 },
});
