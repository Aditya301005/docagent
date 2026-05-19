import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const DEFAULT_API_URL = Platform.select({
  android: 'http://192.168.29.171:8000',
  ios: 'http://192.168.29.171:8000',
  default: 'http://192.168.29.171:8000',
}) as string;

const API_URL_CANDIDATES = Array.from(
  new Set([
    DEFAULT_API_URL,
    'http://192.168.29.171:8000',
    'http://10.0.2.2:8000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
  ])
);

function getExpoLanApiCandidate(): string | null {
  const debuggerHost =
    (Constants as any)?.expoConfig?.hostUri ||
    (Constants as any)?.expoGoConfig?.debuggerHost ||
    null;

  if (!debuggerHost || typeof debuggerHost !== 'string') {
    return null;
  }

  const host = debuggerHost.split(':')[0];
  if (!host) {
    return null;
  }

  return `http://${host}:8000`;
}

async function isReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getApiUrl(): Promise<string> {
  const saved = (await AsyncStorage.getItem('api_url'))?.trim();
  if (saved && await isReachable(saved)) {
    return saved;
  }

  const lanCandidate = getExpoLanApiCandidate();
  const candidates = lanCandidate
    ? Array.from(new Set([saved, lanCandidate, ...API_URL_CANDIDATES].filter(Boolean) as string[]))
    : API_URL_CANDIDATES;

  for (const candidate of candidates) {
    if (await isReachable(candidate)) {
      await AsyncStorage.setItem('api_url', candidate);
      return candidate;
    }
  }

  return DEFAULT_API_URL;
}

export async function setApiUrl(url: string): Promise<void> {
  await AsyncStorage.setItem('api_url', url.trim());
}
