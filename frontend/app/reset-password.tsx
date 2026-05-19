import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { getApiUrl } from '../constants/api';
import Svg, { Path, Rect } from 'react-native-svg';

const { width: W } = Dimensions.get('window');

const LockIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={11} width={18} height={11} rx={2} stroke="#9D4EDD" strokeWidth={2} />
    <Path d="M7 11V7a5 5 0 0110 0v4" stroke="#9D4EDD" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const KeyIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3L15.5 7.5z" stroke="#9D4EDD" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function ResetPasswordScreen() {
  const { token: initialToken } = useLocalSearchParams();
  const [otp, setOtp] = useState(typeof initialToken === 'string' ? initialToken : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password || !confirmPassword || !otp) {
      Alert.alert('Missing Details', 'Please enter the code and new password.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    if (otp.length < 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = await getApiUrl();
      const nodeApiUrl = apiUrl.replace('8000', '3000'); 

      await axios.post(`${nodeApiUrl}/api/auth/reset-password`, {
        token: otp.trim(),
        newPassword: password,
      });

      Alert.alert('Success', 'Your password has been reset successfully.', [
        { text: 'Login', onPress: () => router.replace('/') }
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to reset password. The link might be expired.';
      Alert.alert('Reset Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        
        <View style={styles.headerSection}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter the 6-digit code sent to your email.</Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputRow}>
            <KeyIcon />
            <TextInput
              style={styles.textInput}
              placeholder="6-Digit Reset Code"
              placeholderTextColor="#6B6B8D"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          <View style={styles.inputRow}>
            <LockIcon />
            <TextInput
              style={styles.textInput}
              placeholder="New Password"
              placeholderTextColor="#6B6B8D"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputRow}>
            <LockIcon />
            <TextInput
              style={styles.textInput}
              placeholder="Confirm New Password"
              placeholderTextColor="#6B6B8D"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={true}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.mainButton} onPress={handleReset} activeOpacity={0.85} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainButtonText}>Reset Password</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1A1A2E' },
  container: { flex: 1, paddingHorizontal: W * 0.07, justifyContent: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 40 },
  title: { color: '#FFFFFF', fontSize: W * 0.08, fontWeight: '700', letterSpacing: 1 },
  subtitle: { color: '#6B6B8D', fontSize: W * 0.04, marginTop: 12, textAlign: 'center' },
  formSection: { gap: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16162A', borderWidth: 1, borderColor: '#2D2D44', borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 4, gap: 12 },
  textInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  mainButton: { backgroundColor: '#9D4EDD', borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowColor: '#9D4EDD', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6, marginTop: 8 },
  mainButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  backButton: { marginTop: 24, alignItems: 'center' },
  backButtonText: { color: '#6B6B8D', fontSize: 15 },
});
