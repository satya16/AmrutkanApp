import { Alert, Platform } from 'react-native';
import { formatBytes } from './downloads';
import { isWifiConnected } from './utils/network';

export type DownloadDecision = 'now' | 'schedule' | 'cancel';

// Shown for every explicit download tap (episode, chapter ZIP, book ZIP) —
// confirms the user actually wants this and shows the size upfront. On
// Android, if the device isn't on Wi-Fi, a second prompt offers scheduling
// the download for whenever Wi-Fi becomes available instead of burning
// mobile data (see ScheduledDownloadsContext for how that queue drains).
// iOS skips the second prompt entirely — only "on android" was asked for.
export async function promptDownload(
  label: string,
  sizeBytes: number | null | undefined,
  wifiOnlyDownloads: boolean,
): Promise<DownloadDecision> {
  const sizeText = sizeBytes ? formatBytes(sizeBytes) : 'आकार अज्ञात';
  const confirmed = await new Promise<boolean>(resolve => {
    Alert.alert(
      'डाउनलोड करायचे?',
      `${label}\nआकार: ${sizeText}`,
      [
        { text: 'रद्द करा', style: 'cancel', onPress: () => resolve(false) },
        { text: 'डाउनलोड करा', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
  if (!confirmed) return 'cancel';

  if (Platform.OS !== 'android') return 'now';
  if (await isWifiConnected()) return 'now';

  return new Promise<DownloadDecision>(resolve => {
    // wifiOnlyDownloads already means "never use mobile data for downloads"
    // (see SettingsScreen) — honor that by not even offering the bypass.
    const buttons = wifiOnlyDownloads
      ? [
          { text: 'रद्द करा', style: 'cancel' as const, onPress: () => resolve('cancel' as const) },
          { text: 'Wi-Fi ची वाट पहा', onPress: () => resolve('schedule' as const) },
        ]
      : [
          { text: 'रद्द करा', style: 'cancel' as const, onPress: () => resolve('cancel' as const) },
          { text: 'Wi-Fi ची वाट पहा', onPress: () => resolve('schedule' as const) },
          { text: 'आताच डाउनलोड करा', onPress: () => resolve('now' as const) },
        ];
    Alert.alert(
      'तुम्ही मोबाईल डेटावर आहात',
      'Wi-Fi उपलब्ध होईपर्यंत थांबायचे की आताच डेटा वापरून डाउनलोड करायचे?',
      buttons,
      { cancelable: true, onDismiss: () => resolve('cancel') },
    );
  });
}
