import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

interface DocAgentLoginScreenProps {
  onLogin: (email: string, password: string) => void;
  onGuestContinue?: () => void;
  onRegister?: (email: string, password: string) => void;
}

// ── SVG Icons ────────────────────────────────────────────────────────────────

const DocAgentLogo = () => (
  <View style={styles.logoContainer}>
    <Svg width={70} height={84} viewBox="0 0 100 120">
      <Path d="M15 10 L15 110 L85 110 L85 30 L65 10 Z" fill="#2D2D44" stroke="#4A4A6A" strokeWidth={2} />
      <Path d="M65 10 L65 30 L85 30" fill="#3D3D5C" stroke="#4A4A6A" strokeWidth={2} />
      <Rect x={25} y={45} width={50} height={4} rx={2} fill="#4A4A6A" />
      <Rect x={25} y={58} width={40} height={4} rx={2} fill="#4A4A6A" />
      <Rect x={25} y={71} width={45} height={4} rx={2} fill="#4A4A6A" />
      <Rect x={25} y={84} width={35} height={4} rx={2} fill="#4A4A6A" />
      <Path d="M75 15 L78 25 L88 28 L78 31 L75 41 L72 31 L62 28 L72 25 Z" fill="#9D4EDD" />
      <Path d="M88 45 L89.5 50 L94.5 51.5 L89.5 53 L88 58 L86.5 53 L81.5 51.5 L86.5 50 Z" fill="#C77DFF" />
      <Circle cx={92} cy={38} r={2} fill="#E0AAFF" />
    </Svg>
  </View>
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

const EyeIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#6B6B8D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={12} r={3} stroke="#6B6B8D" strokeWidth={2} />
  </Svg>
);

const EyeOffIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="#6B6B8D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M1 1l22 22" stroke="#6B6B8D" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ── Main Component ────────────────────────────────────────────────────────────

export default function DocAgentLoginScreen({
  onLogin,
  onGuestContinue,
  onRegister,
}: DocAgentLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Logo ── */}
          <View style={styles.logoSection}>
            <DocAgentLogo />
            <Text style={styles.appName}>DocAgent</Text>
            <Text style={styles.tagline}>Scan. Extract. Understand.</Text>
          </View>

          {/* ── Inputs ── */}
          <View style={styles.formSection}>
            {/* Email */}
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
                autoCorrect={false}
              />
            </View>

            {/* Password */}
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
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Login/Register Button ── */}
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={() => {
              if (isRegistering && onRegister) {
                onRegister(email, password);
              } else {
                onLogin(email, password);
              }
            }} 
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>{isRegistering ? 'Register' : 'Sign In'}</Text>
          </TouchableOpacity>

          {/* ── Guest ── */}
          <TouchableOpacity style={styles.guestButton} onPress={onGuestContinue} activeOpacity={0.7}>
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>

          {/* ── Toggle Register/Login ── */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>{isRegistering ? "Already have an account? " : "Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
              <Text style={styles.registerLink}>{isRegistering ? "Sign In" : "Register"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  flex: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: W * 0.07,   // 7% of screen width
    paddingTop: H * 0.06,
    paddingBottom: H * 0.04,
    justifyContent: 'center',
  },

  // Logo section
  logoSection: {
    alignItems: 'center',
    marginBottom: H * 0.05,
  },
  logoContainer: {
    width: W * 0.28,               // 28% of screen width
    height: W * 0.28,
    backgroundColor: '#16162A',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9D4EDD',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: W * 0.09,            // responsive font
    fontWeight: '700',
    marginTop: 16,
    letterSpacing: 1,
  },
  tagline: {
    color: '#6B6B8D',
    fontSize: W * 0.035,
    marginTop: 6,
    letterSpacing: 2,
  },

  // Form
  formSection: {
    gap: 12,
    marginBottom: H * 0.025,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16162A',
    borderWidth: 1,
    borderColor: '#2D2D44',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    gap: 12,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },

  // Buttons
  loginButton: {
    backgroundColor: '#9D4EDD',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#9D4EDD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 12,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  guestButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: H * 0.02,
  },
  guestText: {
    color: '#9D4EDD',
    fontSize: 15,
    fontWeight: '500',
  },

  // Register row
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#6B6B8D',
    fontSize: 13,
  },
  registerLink: {
    color: '#C77DFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
