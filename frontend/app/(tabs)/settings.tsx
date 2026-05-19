import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useDocStore } from '../../store/useDocStore';

export default function SettingsScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('Guest');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const clearDocs = useDocStore((state) => state.clearAll);
  const setCurrentUserKey = useDocStore((state) => state.setCurrentUserKey);
  const insets = useSafeAreaInsets();
  
  const { colorScheme, toggleColorScheme } = useColorScheme();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('user_email');
      if (savedEmail) setEmail(savedEmail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await AsyncStorage.multiRemove(['auth_token', 'user_email', 'user_name']);
            setCurrentUserKey('guest');
            setEmail('Guest');
            router.replace('/login');
          } catch (error) {
            Alert.alert('Sign Out Failed', 'Unable to clear your local session. Please try again.');
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear All History',
      'This will permanently delete all scanned documents and insights. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            clearDocs();
            Alert.alert('Cleared', 'All document history has been deleted.');
          },
        },
      ]
    );
  };

  return (
    <View 
      style={{ flex: 1, paddingTop: insets.top }}
      className="bg-slate-50 dark:bg-slate-900"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View className="px-6 pt-5 pb-2">
          <Text className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</Text>
        </View>

        {/* 0. Appearance */}
        <View className="mt-6 px-6">
          <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">
            Appearance
          </Text>
          <View className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 px-5 py-4 flex-row justify-between items-center">
             <View>
                <Text className="text-base font-bold text-slate-900 dark:text-white">Dark Mode</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Toggle dark theme manually</Text>
              </View>
              <Switch
                value={colorScheme === 'dark'}
                onValueChange={toggleColorScheme}
                trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
              />
          </View>
        </View>

        {/* 2. Account */}
        <View className="mt-8 px-6">
          <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">
            Account
          </Text>
          <View className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
            <View className="flex-row justify-between items-center bg-slate-50 dark:bg-slate-900/50 px-4 py-3.5 rounded-xl border border-slate-100 dark:border-slate-700 mb-4">
              <Text className="text-slate-500 dark:text-slate-400 font-medium text-[15px]">Email</Text>
              <Text className="text-slate-900 dark:text-white font-bold text-[15px]">{email}</Text>
            </View>
            
            <TouchableOpacity 
              onPress={() => router.push('/profile')}
              className="bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center py-3.5 rounded-xl mb-3 border border-indigo-100 dark:border-indigo-800"
            >
              <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-[15px]">Manage Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSignOut}
              disabled={isSigningOut}
              className="bg-slate-100 dark:bg-slate-700 items-center justify-center py-3.5 rounded-xl"
            >
              <Text className="text-slate-900 dark:text-white font-bold text-[15px]">
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Developer Mode */}
        <View className="mt-8 px-6">
          <Text className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 ml-1">
            Developer & Data
          </Text>
          <View className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
            <TouchableOpacity onPress={handleClearHistory} className="flex-row items-center py-1">
              <Text className="text-rose-500 font-bold text-[15px]">Clear All History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. App Info */}
        <View className="mt-10 mb-8 items-center justify-center opacity-60">
          <Text className="text-slate-900 dark:text-white font-bold text-base tracking-tight mb-1">DocAgent AI</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-xs font-medium">Version 1.0.0</Text>
          <Text className="text-slate-400 dark:text-slate-500 text-[11px] mt-1">Built with React Native + Expo</Text>
        </View>

      </ScrollView>
    </View>
  );
}
