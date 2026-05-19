import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getAuthUrl } from '../constants/api';
import Svg, { Path, Rect } from 'react-native-svg';
import { useDocStore } from '../store/useDocStore';

const { width: W, height: H } = Dimensions.get('window');

const KeyIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="#9D4EDD" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const setCurrentUserKey = useDocStore((state) => state.setCurrentUserKey);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const nodeApiUrl = await getAuthUrl();

      const response = await axios.post(`${nodeApiUrl}/api/auth/verify-email`, {
        email: email,
        otp: otp.trim(),
      });

      if (response.data.access_token) {
        await AsyncStorage.setItem('auth_token', response.data.access_token);
        await AsyncStorage.setItem('user_email', response.data.email);
        if (response.data.name) {
          await AsyncStorage.setItem('user_name', response.data.name);
        }
        setCurrentUserKey(response.data.email || email || 'guest');
        
        Alert.alert('Success', 'Email verified successfully!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') }
        ]);
      } else {
        Alert.alert('Success', 'Email verified successfully! You can now log in.', [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]);
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Verification failed. The code might be expired or incorrect.';
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.headerSection}>
            <Text style={styles.title}>Verify Email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to <Text style={styles.boldText}>{email}</Text>. Please enter it below.
            </Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputRow}>
              <KeyIcon />
              <TextInput
                style={styles.textInput}
                placeholder="6-digit OTP"
                placeholderTextColor="#6B6B8D"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.mainButton} onPress={handleVerify} activeOpacity={0.85} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainButtonText}>Verify Code</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/login')}>
            <Text style={styles.secondaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1A1A2E' },
  flex: { flex: 1 },
  scrollContainer: { flexGrow: 1, paddingHorizontal: W * 0.07, paddingTop: H * 0.06, paddingBottom: H * 0.04, justifyContent: 'center' },
  headerSection: { alignItems: 'center', marginBottom: H * 0.05 },
  title: { color: '#FFFFFF', fontSize: W * 0.08, fontWeight: '700', letterSpacing: 1 },
  subtitle: { color: '#6B6B8D', fontSize: W * 0.04, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  boldText: { color: '#C77DFF', fontWeight: '600' },
  formSection: { gap: 16, marginBottom: H * 0.04 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16162A', borderWidth: 1, borderColor: '#2D2D44', borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 4, gap: 12 },
  textInput: { flex: 1, color: '#FFFFFF', fontSize: 18, letterSpacing: 4, textAlign: 'center' },
  mainButton: { backgroundColor: '#9D4EDD', borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowColor: '#9D4EDD', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6, marginBottom: 16 },
  mainButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  secondaryButton: { paddingVertical: 15, alignItems: 'center' },
  secondaryButtonText: { color: '#6B6B8D', fontSize: 16 },
});
