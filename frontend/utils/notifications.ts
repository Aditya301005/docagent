import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
      lightColor: '#6366F1',
    });
  }
  
  return true;
}

// 1. Processing Status Notifications
export async function notifyProcessing(filename: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Processing Document',
      body: `📄 "${filename}" uploaded successfully. AI is extracting key fields...`,
      data: { type: 'processing' },
    },
    trigger: null, // trigger immediately
  });
}

export async function notifySuccess(message: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Processing Complete',
      body: message,
      data: { type: 'success' },
    },
    trigger: null,
  });
}

// 2. Export / Download Notifications
export async function notifyExport(message: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⬇ Export Ready',
      body: message,
      data: { type: 'export' },
    },
    trigger: null,
  });
}

// 3. Error / Retry Notifications
export async function notifyError(message: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '❌ Extraction Failed',
      body: `⚠ ${message}`,
      data: { type: 'error' },
    },
    trigger: null,
  });
}

// 4. Security Notifications
export async function notifySecurity(message: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔐 Security Alert',
      body: message,
      data: { type: 'security' },
    },
    trigger: null,
  });
}

// 5. Activity History
export async function notifyActivity(message: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Activity Log',
      body: message,
      data: { type: 'activity' },
    },
    trigger: null,
  });
}
