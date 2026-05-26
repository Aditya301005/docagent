import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNotificationStore } from '../store/useNotificationStore';

// Request permissions for local notifications
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00C896',
    });
  }
  
  return true;
}

// Helper to save to store and trigger OS push
async function triggerNotification(
  title: string,
  body: string,
  type: 'processing' | 'success' | 'export' | 'error' | 'security' | 'activity'
) {
  // Save to in-app store
  useNotificationStore.getState().addNotification({ title, body, type });
  
  // Show OS level push notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type },
    },
    trigger: null,
  });
}

// 1. Processing Status Notifications
export async function notifyProcessing(filename: string) {
  await triggerNotification(
    'Processing Document',
    `📄 "${filename}" uploaded successfully. AI is extracting key fields...`,
    'processing'
  );
}

export async function notifySuccess(message: string) {
  await triggerNotification('✅ Processing Complete', message, 'success');
}

// 2. Export / Download Notifications
export async function notifyExport(message: string) {
  await triggerNotification('⬇ Export Ready', message, 'export');
}

// 3. Error / Retry Notifications
export async function notifyError(message: string) {
  await triggerNotification('❌ Extraction Failed', `⚠ ${message}`, 'error');
}

// 4. Security Notifications
export async function notifySecurity(message: string) {
  await triggerNotification('🔐 Security Alert', message, 'security');
}

// 5. Activity History
export async function notifyActivity(message: string) {
  await triggerNotification('Activity Log', message, 'activity');
}
