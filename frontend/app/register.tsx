import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import axios from 'axios';
import { getApiUrl } from '../constants/api';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

const UserIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#9D4EDD" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke="#9D4EDD" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EmailIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#9D4EDD" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 6l-10 7L2 6" stroke="#9D4EDD" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LockIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={11} width={18} height={11} rx={2} stroke="#9D4EDD" strokeWidth={2} />
    <Path d="M7 11V7a5 5 0 0110 0v4" stroke="#9D4EDD" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const EyeIcon = ({ size = 20, color = "#6B6B8D", hidden = false }) => (
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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Missing Details', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = await getApiUrl();
      const nodeApiUrl = apiUrl.replace('8000', '3000'); 

      const response = await axios.post(`${nodeApiUrl}/api/auth/register`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      Alert.alert('Success', 'Registration successful! Please check your email to verify your account.', [
        { text: 'OK', onPress: () => router.replace({ pathname: '/verify-email', params: { email: email.trim().toLowerCase() } }) }
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.headerSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputRow}>
              <UserIcon />
              <TextInput
                style={styles.textInput}
                placeholder="Full Name"
                placeholderTextColor="#6B6B8D"
                value={name}
                onChangeText={setName}
              />
            </View>

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

            <View style={styles.inputRow}>
              <LockIcon />
              <TextInput
                style={styles.textInput}
                placeholder="Password"
                placeholderTextColor="#6B6B8D"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                <EyeIcon hidden={!showPassword} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.mainButton} onPress={handleRegister} activeOpacity={0.85} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainButtonText}>Register</Text>}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
          
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
  subtitle: { color: '#6B6B8D', fontSize: W * 0.04, marginTop: 8 },
  formSection: { gap: 16, marginBottom: H * 0.04 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16162A', borderWidth: 1, borderColor: '#2D2D44', borderRadius: 14, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 4, gap: 12 },
  textInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  mainButton: { backgroundColor: '#9D4EDD', borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowColor: '#9D4EDD', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6, marginBottom: 24 },
  mainButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#6B6B8D', fontSize: 14 },
  footerLink: { color: '#C77DFF', fontSize: 14, fontWeight: '600' },
});
