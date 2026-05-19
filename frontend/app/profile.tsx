import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#6366F1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UserIcon = ({ size = 24, color = "#6366F1" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LockIcon = ({ size = 20, color = "#6366F1" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth={2} />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={2} />
  </Svg>
);

const EyeIcon = ({ size = 20, color = "#94A3B8", hidden = false }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {hidden ? (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M1 1l22 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </Svg>
);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadUserData = async () => {
      try {
        const savedName = await AsyncStorage.getItem('user_name');
        const savedEmail = await AsyncStorage.getItem('user_email');
        if (isMounted) {
          if (savedName) setName(savedName || 'User');
          if (savedEmail) setEmail(savedEmail || '');
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadUserData();
    return () => { isMounted = false; };
  }, []);

  const handleUpdateProfile = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Name cannot be empty');
    
    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const { getApiUrl } = require('../constants/api');
      let baseUrl = await getApiUrl();
      
      // Clean baseUrl and ensure we hit port 3000
      baseUrl = baseUrl.split('?')[0].split('#')[0];
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      
      const nodeApiUrl = baseUrl.includes(':8000') 
        ? baseUrl.replace(':8000', ':3000')
        : baseUrl.replace('8000', '3000'); 
        
      const fullUrl = `${nodeApiUrl}/api/auth/me`;
      console.log('Profile update targeting:', fullUrl);
      
      const response = await axios.patch(fullUrl, {
        name: name.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedUser = response.data.user;
      if (updatedUser && updatedUser.name) {
        await AsyncStorage.setItem('user_name', updatedUser.name);
        setName(updatedUser.name);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (err: any) {
      console.error('Profile update error:', err);
      const msg = err.response?.data?.detail || 'Failed to update profile';
      Alert.alert('Error', msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) return Alert.alert('Error', 'Please enter your current password');
    if (newPassword.length < 6) return Alert.alert('Error', 'New password must be at least 6 characters');
    if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    
    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const { getApiUrl } = require('../constants/api');
      let baseUrl = await getApiUrl();
      
      // Clean baseUrl and ensure we hit port 3000
      baseUrl = baseUrl.split('?')[0].split('#')[0];
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      
      const nodeApiUrl = baseUrl.includes(':8000') 
        ? baseUrl.replace(':8000', ':3000')
        : baseUrl.replace('8000', '3000'); 

      const fullUrl = `${nodeApiUrl}/api/auth/change-password`;
      console.log('Targeting Password Change API at:', fullUrl);

      await axios.post(fullUrl, {
        currentPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err: any) {
      console.error('Password change error:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to change password';
      Alert.alert('Error', msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View 
        style={{ flex: 1, paddingTop: insets.top }}
        className="bg-slate-50 dark:bg-slate-900"
      >
        <View className="flex-row items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <BackIcon />
          </TouchableOpacity>
          <Text className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Profile</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
          <View className="items-center mb-8">
            <View className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center border-4 border-white dark:border-slate-800 shadow-sm">
              <Text className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                {name.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-4">{name || 'User'}</Text>
            <Text className="text-slate-500 dark:text-slate-400 font-medium">{email}</Text>
          </View>

          <View className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5 ml-1">Personal Details</Text>
            
            <View className="mb-5">
              <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Full Name</Text>
              <View className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3.5 flex-row items-center">
                <UserIcon size={18} color="#94A3B8" />
                <TextInput 
                  value={name}
                  onChangeText={setName}
                  className="flex-1 ml-3 text-[15px] font-semibold text-slate-900 dark:text-white"
                  placeholder="Enter your name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View className="mb-8">
              <Text className="text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Email Address</Text>
              <View className="bg-slate-100 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3.5 flex-row items-center opacity-60">
                <Text className="flex-1 ml-1 text-[15px] font-semibold text-slate-500 dark:text-slate-400">
                  {email}
                </Text>
                <LockIcon size={16} color="#94A3B8" />
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleUpdateProfile}
              disabled={isUpdating}
              className="bg-indigo-600 h-[58px] rounded-2xl items-center justify-center shadow-md shadow-indigo-200"
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-[16px]">Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5 ml-1">Security</Text>
            
            {!showPasswordSection ? (
              <TouchableOpacity 
                onPress={() => setShowPasswordSection(true)}
                className="flex-row items-center justify-between py-1"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center mr-4">
                    <LockIcon size={18} color="#6366F1" />
                  </View>
                  <Text className="text-[15px] font-bold text-slate-900 dark:text-white">Change Password</Text>
                </View>
                <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">Edit</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View className="mb-4">
                  <View className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl flex-row items-center px-4">
                    <TextInput 
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      className="flex-1 py-3.5 text-[15px] font-semibold text-slate-900 dark:text-white"
                      placeholder="Current Password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showCurrent}
                    />
                    <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} className="p-2">
                      <EyeIcon hidden={!showCurrent} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="mb-4">
                  <View className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl flex-row items-center px-4">
                    <TextInput 
                      value={newPassword}
                      onChangeText={setNewPassword}
                      className="flex-1 py-3.5 text-[15px] font-semibold text-slate-900 dark:text-white"
                      placeholder="New Password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showNew}
                    />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)} className="p-2">
                      <EyeIcon hidden={!showNew} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="mb-5">
                  <View className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl flex-row items-center px-4">
                    <TextInput 
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      className="flex-1 py-3.5 text-[15px] font-semibold text-slate-900 dark:text-white"
                      placeholder="Confirm Password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showConfirm}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} className="p-2">
                      <EyeIcon hidden={!showConfirm} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <TouchableOpacity 
                    onPress={() => setShowPasswordSection(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-700 h-[50px] rounded-xl items-center justify-center"
                  >
                    <Text className="text-slate-900 dark:text-white font-bold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleChangePassword}
                    className="flex-1 bg-indigo-600 h-[50px] rounded-xl items-center justify-center"
                  >
                    <Text className="text-white font-bold">Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View className="h-[1px] bg-slate-50 dark:bg-slate-700 my-5" />

            <TouchableOpacity 
              onPress={() => router.push('/forgot-password')}
              className="flex-row items-center py-1"
            >
              <View className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 items-center justify-center mr-4">
                <Text className="text-rose-500 font-bold">?</Text>
              </View>
              <Text className="text-[15px] font-bold text-slate-900 dark:text-white">Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
