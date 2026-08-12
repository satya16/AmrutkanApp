import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export async function isWifiConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.type === 'wifi' && !!state.isConnected;
}

// Shared by the ZIP-download call sites (Book/Chapter screens), which don't
// go through DownloadsContext.download() and so need their own check +
// user-facing alert when the wifi-only setting blocks them.
export async function checkWifiAllowed(wifiOnlyDownloads: boolean): Promise<boolean> {
  if (!wifiOnlyDownloads || (await isWifiConnected())) return true;
  Alert.alert('Wi-Fi आवश्यक', 'डाउनलोड करण्यासाठी Wi-Fi शी कनेक्ट व्हा.');
  return false;
}
