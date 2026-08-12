import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSettings } from '../SettingsContext';
import { useDownloads } from '../DownloadsContext';
import { useTheme } from '../theme/ThemeContext';
import { formatBytes, getDownloadsSummary, type DownloadsSummary } from '../downloads';
import { toDevanagari } from '../utils/devanagari';

export function SettingsScreen() {
  const { autoDownloadNext5, setAutoDownloadNext5, wifiOnlyDownloads, setWifiOnlyDownloads } =
    useSettings();
  const { clearAllDownloads } = useDownloads();
  const { colors } = useTheme();
  const [summary, setSummary] = useState<DownloadsSummary | null>(null);
  const [clearing, setClearing] = useState(false);

  const refreshSummary = useCallback(async () => {
    setSummary(await getDownloadsSummary());
  }, []);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  const handleClearAll = () => {
    Alert.alert(
      'सर्व डाउनलोड्स काढून टाकायचे?',
      'डाउनलोड केलेले सर्व भाग आणि ZIP फाइल्स हटवल्या जातील. हे परत करता येणार नाही.',
      [
        { text: 'रद्द करा', style: 'cancel' },
        {
          text: 'काढून टाका',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            await clearAllDownloads();
            await refreshSummary();
            setClearing(false);
          },
        },
      ],
    );
  };

  const itemCount = summary ? summary.episodeCount + summary.zipCount : 0;
  const hasDownloads = itemCount > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>पुढील ५ भाग आपोआप डाउनलोड करा</Text>
          <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
            एखादा भाग ऐकताना, पुढील ५ भाग आपोआप डाउनलोड होतील — ऑफलाइन ऐकण्यासाठी.
          </Text>
        </View>
        <Switch
          value={autoDownloadNext5}
          onValueChange={setAutoDownloadNext5}
          trackColor={{ true: colors.accent }}
          thumbColor="#ffffff"
        />
      </View>

      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>Wi-Fi वरच डाउनलोड करा</Text>
          <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
            मोबाईल डेटावर डाउनलोड सुरू होणार नाही.
          </Text>
        </View>
        <Switch
          value={wifiOnlyDownloads}
          onValueChange={setWifiOnlyDownloads}
          trackColor={{ true: colors.accent }}
          thumbColor="#ffffff"
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>डाउनलोड्स</Text>
      <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.rowText}>
          {summary ? (
            <>
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                एकूण जागा वापरली: {formatBytes(summary.totalBytes)}
              </Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                {toDevanagari(summary.episodeCount)} भाग · {toDevanagari(summary.zipCount)} ZIP
              </Text>
            </>
          ) : (
            <ActivityIndicator size="small" color={colors.accent} />
          )}
        </View>
      </View>
      <Pressable
        style={[
          styles.clearButton,
          { borderColor: colors.border },
          (!hasDownloads || clearing) && styles.clearButtonDisabled,
        ]}
        onPress={handleClearAll}
        disabled={!hasDownloads || clearing}>
        {clearing ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Text style={[styles.clearButtonText, { color: colors.accent }]}>
            सर्व डाउनलोड्स काढून टाका
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 14,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  rowDescription: { fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  clearButtonDisabled: { opacity: 0.4 },
  clearButtonText: { fontSize: 14, fontWeight: '600' },
});
