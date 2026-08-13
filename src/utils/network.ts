import NetInfo from '@react-native-community/netinfo';

export async function isWifiConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.type === 'wifi' && !!state.isConnected;
}
