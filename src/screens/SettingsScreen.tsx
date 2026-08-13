import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSettings } from '../SettingsContext';
import { useDownloads } from '../DownloadsContext';
import { useScheduledDownloads } from '../ScheduledDownloadsContext';
import { useTheme } from '../theme/ThemeContext';
import { formatBytes, getDownloadsSummary, type DownloadsSummary } from '../downloads';
import { toDevanagari } from '../utils/devanagari';
import { OfflineEpisodesList } from '../components/OfflineEpisodesList';
import type { DrawerParamList } from '../navigation/MainDrawer';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = DrawerScreenProps<DrawerParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { autoDownloadNext5, setAutoDownloadNext5, wifiOnlyDownloads, setWifiOnlyDownloads } =
    useSettings();
  const { clearAllDownloads } = useDownloads();
  const { scheduled, cancelScheduled } = useScheduledDownloads();
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

  const goToNowPlaying = () => {
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('NowPlaying');
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}>
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

      {scheduled.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            नियोजित डाउनलोड्स (Wi-Fi ची वाट पाहत आहेत)
          </Text>
          {scheduled.map(item => (
            <View
              key={item.id}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                  Wi-Fi उपलब्ध झाल्यावर आपोआप डाउनलोड होईल
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => cancelScheduled(item.id)}>
                <Text style={[styles.rowLabel, { color: colors.accent }]}>रद्द करा</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}

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

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>डाउनलोड केलेले भाग</Text>
      <OfflineEpisodesList onPlay={goToNowPlaying} onDelete={refreshSummary} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
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
