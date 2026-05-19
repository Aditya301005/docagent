import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { getAuthUrl } from '../constants/api';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useDocStore } from '../store/useDocStore';
import * as Haptics from 'expo-haptics';

const { width: W, height: H } = Dimensions.get('window');

// ── App brand colors (matches home/vault/history) ────────────────────────────
const INDIGO = '#6366F1';
const INDIGO_DARK = '#4F46E5';
const BG = '#0F0F1E';
const CARD_BG = '#16162A';
const BORDER = '#2D2D44';
const TEXT_MUTED = '#6B6B8D';

// ── Icons ─────────────────────────────────────────────────────────────────────
const EmailIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={INDIGO} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 6l-10 7L2 6" stroke={INDIGO} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LockIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={11} width={18} height={11} rx={2} stroke={INDIGO} strokeWidth={2} />
    <Path d="M7 11V7a5 5 0 0110 0v4" stroke={INDIGO} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const EyeIcon = ({ size = 20, color = TEXT_MUTED, hidden = false }) => (
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

// ── Login Screen ──────────────────────────────────────────────────────────────

export default function LoginScreenRoute() {
  const router = useRouter();
  const setCurrentUserKey = useDocStore((state) => state.setCurrentUserKey);
  const [isChecking, setIsChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const checkAuth = useCallback(() => {
    let isActive = true;
 
    const runAuthCheck = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        if (token === 'guest') {
          setCurrentUserKey('guest');
          const onboarded = await AsyncStorage.getItem('onboarding_done');
          if (!onboarded) { router.replace('/onboarding'); return; }
          router.replace('/(tabs)');
          return;
        }

        if (token) {
          const nodeApiUrl = await getAuthUrl();
          const response = await axios.get(`${nodeApiUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          });
          const user = response.data;
          if (user.email) await AsyncStorage.setItem('user_email', user.email);
          if (user.name) await AsyncStorage.setItem('user_name', user.name);
          setCurrentUserKey(user.email || 'guest');
          router.replace('/(tabs)');
        } else {
          setCurrentUserKey('guest');
          const onboarded = await AsyncStorage.getItem('onboarding_done');
          if (!onboarded) { if (isActive) router.replace('/onboarding'); return; }
          if (isActive) setIsChecking(false);
        }
      } catch (error) {
        await AsyncStorage.multiRemove(['auth_token', 'user_email', 'user_name']);
        setCurrentUserKey('guest');
        if (isActive) setIsChecking(false);
      }
    };

    setIsChecking(true);
    runAuthCheck();
    return () => { isActive = false; };
  }, [router, setCurrentUserKey]);

  useFocusEffect(checkAuth);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Details', 'Please enter both email and password.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      const nodeApiUrl = await getAuthUrl();
      const response = await axios.post(`${nodeApiUrl}/api/auth/login`, {
        email: email.trim().toLowerCase(),
        password,
      });
      if (response.data.access_token) {
        await AsyncStorage.setItem('auth_token', response.data.access_token);
        await AsyncStorage.setItem('user_email', response.data.email);
        if (response.data.name) await AsyncStorage.setItem('user_name', response.data.name);
        setCurrentUserKey(response.data.email || email.trim().toLowerCase());
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = error.response?.data?.detail || 'Login failed. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('auth_token', 'guest');
    await AsyncStorage.setItem('user_email', 'Guest');
    setCurrentUserKey('guest');
    router.replace('/(tabs)');
  };

  if (isChecking) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={INDIGO} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Logo Section ── */}
          <View style={styles.logoSection}>
            <View style={styles.logoRing}>
              <Image
                source={require('../icons/DocAgent_logo.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.appName}>DocAgent</Text>
            <Text style={styles.tagline}>SCAN  ·  EXTRACT  ·  UNDERSTAND</Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.formSection}>
            <View style={styles.inputRow}>
              <EmailIcon />
              <TextInput
                style={styles.textInput}
                placeholder="Email address"
                placeholderTextColor={TEXT_MUTED}
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
                placeholderTextColor={TEXT_MUTED}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                <EyeIcon hidden={!showPassword} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push('/forgot-password')} style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* ── Sign In Button ── */}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.85} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.loginButtonText}>Sign In</Text>}
          </TouchableOpacity>

          {/* ── Guest ── */}
          <TouchableOpacity style={styles.guestButton} onPress={handleGuestContinue} activeOpacity={0.7}>
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>

          {/* ── Register ── */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: W * 0.07,
    paddingTop: H * 0.04,
    paddingBottom: H * 0.04,
    justifyContent: 'center',
  },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: H * 0.045 },
  logoRing: {
    width: W * 0.30,
    height: W * 0.30,
    borderRadius: W * 0.15,
    borderWidth: 2,
    borderColor: `${INDIGO}55`,
    overflow: 'hidden',
    shadowColor: INDIGO,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 12,
    marginBottom: 18,
  },
  logoImage: { width: '100%', height: '100%' },
  appName: {
    color: '#FFFFFF',
    fontSize: W * 0.09,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  tagline: {
    color: TEXT_MUTED,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '600',
  },

  // Form
  formSection: { gap: 12, marginBottom: H * 0.022 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    gap: 12,
  },
  textInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  forgotRow: { alignItems: 'flex-end', marginTop: 2 },
  forgotText: { color: INDIGO, fontSize: 13, fontWeight: '600' },

  // Buttons
  loginButton: {
    backgroundColor: INDIGO,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: INDIGO,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 14,
  },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  guestButton: { paddingVertical: 12, alignItems: 'center', marginBottom: H * 0.02 },
  guestText: { color: INDIGO, fontSize: 15, fontWeight: '500', opacity: 0.8 },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { color: TEXT_MUTED, fontSize: 13 },
  registerLink: { color: INDIGO, fontSize: 13, fontWeight: '700' },
});
