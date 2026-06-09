import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { getAuthUrl } from '../constants/api';
import Svg, { Path, Circle, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useDocStore } from '../store/useDocStore';
import * as Haptics from 'expo-haptics';
import { Spacing, Radius, Shadows } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { showCustomAlert } from '../components/CustomAlert';
import { syncDocumentsFromServer } from '../utils/syncDocuments';

const { width: W, height: H } = Dimensions.get('window');

// ─── Icons ────────────────────────────────────────────────────────────────────

const EmailIcon = ({ active }: { active?: boolean }) => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={active ? Colors.primary : Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M22 6l-10 7L2 6" stroke={active ? Colors.primary : Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const LockIcon = ({ active }: { active?: boolean }) => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={11} width={18} height={11} rx={2} stroke={active ? Colors.primary : Colors.textMuted} strokeWidth={2} />
      <Path d="M7 11V7a5 5 0 0110 0v4" stroke={active ? Colors.primary : Colors.textMuted} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
};

const EyeIcon = ({ hidden, color }: { hidden?: boolean; color?: string }) => {
  const { Colors } = useThemeStore();
  const activeColor = color || Colors.textMuted;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      {hidden ? (
        <>
          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={activeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M1 1l22 22" stroke={activeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={activeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={12} cy={12} r={3} stroke={activeColor} strokeWidth={2} />
        </>
      )}
    </Svg>
  );
};

// ─── Input Field ──────────────────────────────────────────────────────────────

const GlassInput = ({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  rightElement,
}: any) => {
  const { Colors } = useThemeStore();
  const s = getStyles(Colors);
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primaryGlow],
  });

  return (
    <Animated.View style={[s.inputWrapper, { borderColor }]}>
      <View style={s.inputIcon}>
        {React.cloneElement(icon, { active: focused })}
      </View>
      <TextInput
        style={s.textInput}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || 'none'}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {rightElement}
    </Animated.View>
  );
};

// ─── Ambient Orb Background ───────────────────────────────────────────────────

const AmbientOrbs = () => {
  const { Colors } = useThemeStore();
  const move1 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const move2 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loopOrb1 = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(move1, {
            toValue: { x: W * 0.15, y: H * 0.1 },
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(move1, {
            toValue: { x: -W * 0.1, y: -H * 0.05 },
            duration: 10000,
            useNativeDriver: true,
          }),
          Animated.timing(move1, {
            toValue: { x: 0, y: 0 },
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale1, {
            toValue: 1.25,
            duration: 13000,
            useNativeDriver: true,
          }),
          Animated.timing(scale1, {
            toValue: 0.85,
            duration: 13000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => loopOrb1());
    };

    const loopOrb2 = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(move2, {
            toValue: { x: -W * 0.12, y: -H * 0.08 },
            duration: 9000,
            useNativeDriver: true,
          }),
          Animated.timing(move2, {
            toValue: { x: W * 0.08, y: H * 0.12 },
            duration: 9000,
            useNativeDriver: true,
          }),
          Animated.timing(move2, {
            toValue: { x: 0, y: 0 },
            duration: 8000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale2, {
            toValue: 0.8,
            duration: 11000,
            useNativeDriver: true,
          }),
          Animated.timing(scale2, {
            toValue: 1.2,
            duration: 11000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => loopOrb2());
    };

    loopOrb1();
    loopOrb2();
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View
        style={{
          position: 'absolute',
          width: W * 0.9,
          height: W * 0.9,
          borderRadius: (W * 0.9) / 2,
          backgroundColor: Colors.primary,
          opacity: 0.13,
          top: -W * 0.25,
          right: -W * 0.2,
          transform: [
            { translateX: move1.x },
            { translateY: move1.y },
            { scale: scale1 },
          ],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: W * 0.8,
          height: W * 0.8,
          borderRadius: (W * 0.8) / 2,
          backgroundColor: Colors.accent,
          opacity: 0.09,
          bottom: -W * 0.25,
          left: -W * 0.2,
          transform: [
            { translateX: move2.x },
            { translateY: move2.y },
            { scale: scale2 },
          ],
        }}
      />
    </View>
  );
};

// ─── Logo Section ─────────────────────────────────────────────────────────────

const LogoSection = () => {
  const { Colors } = useThemeStore();
  const s = getStyles(Colors);
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.logoSection}>
      <Animated.View style={[s.logoContainer, { transform: [{ translateY: floatAnim }] }]}>
        <View style={s.logoPulseRing} />
        <View style={s.logoRing}>
          <Image
            source={require('../icons/login_screen_logo.png')}
            style={s.logoImage}
            resizeMode="cover"
          />
        </View>
      </Animated.View>
      <Text style={s.appName}>DocAgent</Text>
      <View style={s.taglineRow}>
        <Text style={s.taglineDot}>SCAN</Text>
        <View style={s.taglineSep} />
        <Text style={s.taglineDot}>EXTRACT</Text>
        <View style={s.taglineSep} />
        <Text style={s.taglineDot}>UNDERSTAND</Text>
      </View>
    </View>
  );
};

// ─── Login Screen ──────────────────────────────────────────────────────────────

export default function LoginScreenRoute() {
  const { Colors } = useThemeStore();
  const s = getStyles(Colors);

  const router = useRouter();
  const setCurrentUserKey = useDocStore((state) => state.setCurrentUserKey);
  const hydrateFromServer = useDocStore((state) => state.hydrateFromServer);
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
          const ownerKey = user.email || 'guest';
          setCurrentUserKey(ownerKey);
          // ── Sync documents from server ─────────────────────────────────────
          // Fetch this user's documents from the doc-agent backend and hydrate
          // the Zustand store. This ensures history survives reinstalls / data
          // clears because the server is the source of truth.
          const serverDocs = await syncDocumentsFromServer(token, ownerKey);
          if (serverDocs.length > 0) hydrateFromServer(serverDocs);
          // ──────────────────────────────────────────────────────────────────
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
      showCustomAlert('Missing Details', 'Please enter both email and password.');
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
        const token = response.data.access_token;
        const ownerKey = response.data.email || email.trim().toLowerCase();
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('user_email', ownerKey);
        if (response.data.name) await AsyncStorage.setItem('user_name', response.data.name);
        setCurrentUserKey(ownerKey);
        // ── Sync documents from server ───────────────────────────────────────
        // Fetch this user's documents from the doc-agent backend immediately
        // after login so the history screen is populated on first navigation.
        const serverDocs = await syncDocumentsFromServer(token, ownerKey);
        if (serverDocs.length > 0) hydrateFromServer(serverDocs);
        // ────────────────────────────────────────────────────────────────────
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = error.response?.data?.detail || 'Login failed. Please try again.';
      showCustomAlert('Login Failed', msg);
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
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <AmbientOrbs />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView
          contentContainerStyle={s.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LogoSection />

          {/* Form Card */}
          <View style={s.formCard}>
            <Text style={s.formTitle}>Welcome back</Text>
            <Text style={s.formSubtitle}>Sign in to your account</Text>

            <View style={s.formFields}>
              <GlassInput
                icon={<EmailIcon />}
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />

              <GlassInput
                icon={<LockIcon />}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                    <EyeIcon hidden={!showPassword} />
                  </TouchableOpacity>
                }
              />
            </View>

            <TouchableOpacity onPress={() => router.push('/forgot-password')} style={s.forgotRow}>
              <Text style={s.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity style={s.primaryBtn} onPress={handleLogin} activeOpacity={0.85} disabled={loading}>
              <View style={s.primaryBtnInner}>
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={s.primaryBtnText}>Sign In</Text>}
              </View>
            </TouchableOpacity>

            {/* Guest */}
            <TouchableOpacity style={s.ghostBtn} onPress={handleGuestContinue} activeOpacity={0.7}>
              <Text style={s.ghostBtnText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>

          {/* Register Row */}
          <View style={s.registerRow}>
            <Text style={s.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={s.registerLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  loadingScreen: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },

  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: H * 0.03,
    paddingBottom: Spacing['4xl'],
    justifyContent: 'center',
  },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  logoContainer: { marginBottom: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  logoPulseRing: {
    position: 'absolute',
    width: W * 0.38,
    height: W * 0.38,
    borderRadius: W * 0.19,
    borderWidth: 1,
    borderColor: 'rgba(0,200,150,0.2)',
    backgroundColor: 'rgba(0,200,150,0.06)',
  },
  logoRing: {
    width: W * 0.28,
    height: W * 0.28,
    borderRadius: W * 0.14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,200,150,0.5)',
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  logoImage: { width: '100%', height: '100%' },
  appName: {
    color: Colors.textPrimary,
    fontSize: W * 0.09,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  taglineDot: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  taglineSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.primary,
  },

  // Form Card
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius['3xl'],
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  formTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  formSubtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.xl,
  },
  formFields: { gap: Spacing.md },

  // Glass Input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    gap: Spacing.md,
    minHeight: 52,
  },
  inputIcon: { width: 20, alignItems: 'center', justifyContent: 'center' },
  textInput: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },
  eyeBtn: { padding: Spacing.xs },

  forgotRow: { alignItems: 'flex-end', marginTop: Spacing.sm, marginBottom: Spacing.xl },
  forgotText: { color: Colors.primaryLight, fontSize: 13, fontWeight: '600' },

  // Buttons
  primaryBtn: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: Colors.primary,
  },
  primaryBtnInner: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  ghostBtn: { paddingVertical: Spacing.md, alignItems: 'center' },
  ghostBtnText: { color: 'rgba(0,200,150,0.7)', fontSize: 14, fontWeight: '600' },

  // Register
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  registerLink: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
});
