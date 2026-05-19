import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import axios from 'axios';
import { getApiUrl } from '../constants/api';
import Svg, { Path } from 'react-native-svg';

const { width: W } = Dimensions.get('window');

const EmailIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#9D4EDD" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 6l-10 7L2 6" stroke="#9D4EDD" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResetRequest = async () => {
    if (!email) {
      Alert.alert('Missing Details', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = await getApiUrl();
      const nodeApiUrl = apiUrl.replace('8000', '3000'); 

      await axios.post(`${nodeApiUrl}/api/auth/forgot-password`, {
        email: email.trim().toLowerCase(),
      });

      setSent(true);
      Alert.alert('Code Sent', 'We have sent a 6-digit reset code to your email.', [
        { text: 'Enter Code', onPress: () => router.push({ pathname: '/reset-password', params: { email: email.trim().toLowerCase() } }) }
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Failed to send reset link. Please try again.';
      Alert.alert('Request Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        
        <View style={styles.headerSection}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            {sent 
              ? "We've sent a 6-digit reset code to your email." 
              : "Enter your email address and we'll send you a 6-digit code to reset your password."}
          </Text>
        </View>

        {!sent ? (
          <View style={styles.formSection}>
            <View style={styles.inputRow}>
              <EmailIcon />
              <TextInput
                style={styles.textInput}
                placeholder="Email address"
                placeholderTextColor="#6B6B8D"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.mainButton} onPress={handleResetRequest} activeOpacity={0.85} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainButtonText}>Send Reset Link</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.mainButton} onPress={() => router.push({ pathname: '/reset-password', params: { email } })} activeOpacity={0.85}>
            <Text style={styles.mainButtonText}>Enter Reset Code</Text>
          </TouchableOpacity>
        )}

        {!sent && (
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1A1A2E' },
  container: { flex: 1, paddingHorizontal: W * 0.07, justifyContent: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 40 },
  title: { color: '#FFFFFF', fontSize: W * 0.08, fontWeight: '700', letterSpacing: 1 },
  subtitle: { color: '#6B6B8D', fontSize: W * 0.04, marginTop: 12, textAlign: 'center', lineHeight: 22 },
  formSection: { gap: 24 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16162A', borderWidth: 1, borderColor: '#2D2D44', borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 4, gap: 12 },
  textInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  mainButton: { backgroundColor: '#9D4EDD', borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowColor: '#9D4EDD', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  mainButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  backButton: { marginTop: 20, alignItems: 'center' },
  backButtonText: { color: '#6B6B8D', fontSize: 15 },
});
