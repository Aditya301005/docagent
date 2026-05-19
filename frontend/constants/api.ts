import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.select({
  android: 'http://192.168.29.171:8000',
  ios: 'http://192.168.29.171:8000',
  default: 'http://192.168.29.171:8000',
}) as string);

export const DEFAULT_AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL || (Platform.select({
  android: 'http://192.168.29.171:3000',
  ios: 'http://192.168.29.171:3000',
  default: 'http://192.168.29.171:3000',
}) as string);

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
    // If it's a render free service, it might wake up, or just return ok for some health checks
    // But since fetch has a timeout, we should keep it quick
    return false;
  }
}

async function isAuthReachable(url: string): Promise<boolean> {
  try {
    // Check if Express auth health endpoint is reachable (if you have one, or just a get request)
    const response = await fetch(`${url}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer test' }
    });
    // Even if it returns 401 Unauthorized, it means the server is reachable and running
    return response.status === 401 || response.ok;
  } catch {
    return false;
  }
}

export async function getApiUrl(): Promise<string> {
  const saved = (await AsyncStorage.getItem('api_url'))?.trim();
  
  // If there's a production environment variable, use it directly without dynamic fallback checks
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

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

export async function getAuthUrl(): Promise<string> {
  const saved = (await AsyncStorage.getItem('auth_url'))?.trim();

  // If there's a production environment variable, use it directly
  if (process.env.EXPO_PUBLIC_AUTH_URL) {
    return process.env.EXPO_PUBLIC_AUTH_URL;
  }

  if (saved && await isAuthReachable(saved)) {
    return saved;
  }

  // Fallback to local auto-discovery: replace 8000 with 3000 on the active API URL
  const activeApiUrl = await getApiUrl();
  const autodiscoverUrl = activeApiUrl.replace(':8000', ':3000').replace('8000', '3000');
  
  return autodiscoverUrl;
}

export async function setApiUrl(url: string): Promise<void> {
  await AsyncStorage.setItem('api_url', url.trim());
  // Also save the corresponding auth URL
  const authUrl = url.trim().replace(':8000', ':3000').replace('8000', '3000');
  await AsyncStorage.setItem('auth_url', authUrl);
}

