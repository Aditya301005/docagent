import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import axios from 'axios';
import { getAuthUrl } from '../constants/api';
import Svg, { Path, Circle, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Colors, Spacing, Radius } from '../constants/theme';
import { showCustomAlert } from '../components/CustomAlert';

const { width: W, height: H } = Dimensions.get('window');

// ─── Icons ────────────────────────────────────────────────────────────────────

const UserIcon = ({ active }: { active?: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={active ? Colors.accent : Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={active ? Colors.accent : Colors.textMuted} strokeWidth={2} />
  </Svg>
);

const EmailIcon = ({ active }: { active?: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={active ? Colors.accent : Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 6l-10 7L2 6" stroke={active ? Colors.accent : Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LockIcon = ({ active }: { active?: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={11} width={18} height={11} rx={2} stroke={active ? Colors.accent : Colors.textMuted} strokeWidth={2} />
    <Path d="M7 11V7a5 5 0 0110 0v4" stroke={active ? Colors.accent : Colors.textMuted} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const EyeIcon = ({ hidden }: { hidden?: boolean }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    {hidden ? (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M1 1l22 22" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={12} cy={12} r={3} stroke={Colors.textMuted} strokeWidth={2} />
      </>
    )}
  </Svg>
);

// ─── Glass Input ──────────────────────────────────────────────────────────────

const GlassInput = ({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, rightElement }: any) => {
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.accentGlow],
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
        autoCapitalize="none"
        onFocus={() => {
          setFocused(true);
          Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
        }}
        onBlur={() => {
          setFocused(false);
          Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
        }}
      />
      {rightElement}
    </Animated.View>
  );
};

// ─── Ambient Background ───────────────────────────────────────────────────────

const AmbientOrbs = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
      <Defs>
        <RadialGradient id="orb1" cx="75%" cy="10%" r="45%">
          <Stop offset="0%" stopColor="#A78BFA" stopOpacity="0.18" />
          <Stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="orb2" cx="20%" cy="80%" r="40%">
          <Stop offset="0%" stopColor="#00C896" stopOpacity="0.12" />
          <Stop offset="100%" stopColor="#00C896" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill="url(#orb1)" />
      <Rect x={0} y={0} width={W} height={H} fill="url(#orb2)" />
    </Svg>
  </View>
);

// ─── Register Screen ──────────────────────────────────────────────────────────

export default function RegisterScreen() {

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      showCustomAlert('Missing Details', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const nodeApiUrl = await getAuthUrl();
      await axios.post(`${nodeApiUrl}/api/auth/register`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      showCustomAlert('Account Created!', 'Please check your email to verify your account.', [
        { text: 'OK', onPress: () => router.replace({ pathname: '/verify-email', params: { email: email.trim().toLowerCase() } }) }
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Registration failed. Please try again.';
      showCustomAlert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <AmbientOrbs />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18l-6-6 6-6" stroke={Colors.textSecondary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>New Account</Text>
            </View>
            <Text style={s.title}>Create Account</Text>
            <Text style={s.subtitle}>Join DocAgent to get started scanning</Text>
          </View>

          {/* Form */}
          <View style={s.formCard}>
            <View style={s.formFields}>
              <GlassInput icon={<UserIcon />} placeholder="Full Name" value={name} onChangeText={setName} />
              <GlassInput icon={<EmailIcon />} placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" />
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

            <TouchableOpacity style={s.primaryBtn} onPress={handleRegister} activeOpacity={0.85} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryBtnText}>Create Account</Text>}
            </TouchableOpacity>
          </View>

          <View style={s.loginRow}>
            <Text style={s.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing['4xl'], justifyContent: 'center' },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing['2xl'], alignSelf: 'flex-start' },
  backText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },

  header: { marginBottom: Spacing['2xl'] },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginBottom: Spacing.md,
  },
  headerBadgeText: { color: Colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { color: Colors.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { color: Colors.textMuted, fontSize: 15, fontWeight: '500' },

  formCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius['3xl'],
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  formFields: { gap: Spacing.md, marginBottom: Spacing.xl },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    minHeight: 52,
    gap: Spacing.md,
  },
  inputIcon: { width: 20, alignItems: 'center', justifyContent: 'center' },
  textInput: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },
  eyeBtn: { padding: Spacing.xs },

  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  loginLink: { color: Colors.accent, fontSize: 13, fontWeight: '700' },
});
