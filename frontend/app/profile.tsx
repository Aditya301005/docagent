import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors, Spacing, Radius } from '../constants/theme';
import { showCustomAlert } from '../components/CustomAlert';

// ─── Icons ────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={Colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UserIcon = ({ color = Colors.textMuted }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2} />
  </Svg>
);

const LockIcon = ({ color = Colors.textMuted }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={2} />
  </Svg>
);

const EyeIcon = ({ hidden, color = Colors.textMuted }: { hidden?: boolean; color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    {hidden ? (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M1 1l22 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      </>
    )}
  </Svg>
);

// ─── Glass Input ──────────────────────────────────────────────────────────────

const FieldInput = ({
  label, icon, value, onChangeText, secureTextEntry, rightElement, readOnly = false,
}: any) => (
  <View style={s.field}>
    {label && <Text style={s.fieldLabel}>{label}</Text>}
    <View style={[s.fieldInput, readOnly && s.fieldInputReadOnly]}>
      {icon}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        editable={!readOnly}
        style={[s.fieldText, readOnly && { color: Colors.textMuted }]}
        autoCapitalize="none"
        placeholder="—"
        placeholderTextColor={Colors.textMuted}
      />
      {rightElement}
    </View>
  </View>
);

// ─── Profile Screen ───────────────────────────────────────────────────────────

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
    const load = async () => {
      const savedName = await AsyncStorage.getItem('user_name');
      const savedEmail = await AsyncStorage.getItem('user_email');
      if (isMounted) {
        if (savedName) setName(savedName);
        if (savedEmail) setEmail(savedEmail);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const handleUpdateProfile = async () => {
    if (!name.trim()) return showCustomAlert('Error', 'Name cannot be empty');
    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const { getAuthUrl } = require('../constants/api');
      const nodeApiUrl = await getAuthUrl();
      const response = await axios.patch(`${nodeApiUrl}/api/auth/me`, { name: name.trim() }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedUser = response.data.user;
      if (updatedUser?.name) {
        await AsyncStorage.setItem('user_name', updatedUser.name);
        setName(updatedUser.name);
        showCustomAlert('Success', 'Profile updated successfully!');
      }
    } catch (err: any) {
      showCustomAlert('Error', err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) return showCustomAlert('Error', 'Please enter your current password');
    if (newPassword.length < 6) return showCustomAlert('Error', 'New password must be at least 6 characters');
    if (newPassword !== confirmPassword) return showCustomAlert('Error', 'Passwords do not match');
    setIsUpdating(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const { getAuthUrl } = require('../constants/api');
      const nodeApiUrl = await getAuthUrl();
      await axios.post(`${nodeApiUrl}/api/auth/change-password`, { currentPassword, newPassword }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showCustomAlert('Success', 'Password changed successfully!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err: any) {
      showCustomAlert('Error', err.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsUpdating(false);
    }
  };

  const initials = (name || email || 'U').charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[s.container, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 100 }}>
          {/* Avatar */}
          <View style={s.avatarSection}>
            <View style={s.avatarRingOuter}>
              <View style={s.avatarRingInner}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            </View>
            <Text style={s.avatarName}>{name || 'User'}</Text>
            <Text style={s.avatarEmail}>{email}</Text>
          </View>

          {/* Personal Details Card */}
          <View style={s.card}>
            <Text style={s.cardLabel}>Personal Details</Text>
            <FieldInput
              label="Full Name"
              icon={<UserIcon color={Colors.textMuted} />}
              value={name}
              onChangeText={setName}
            />
            <FieldInput
              label="Email Address"
              icon={<LockIcon color={Colors.textMuted} />}
              value={email}
              readOnly
            />
            <TouchableOpacity
              onPress={handleUpdateProfile}
              disabled={isUpdating}
              style={s.primaryBtn}
              activeOpacity={0.85}
            >
              {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>

          {/* Security Card */}
          <View style={s.card}>
            <Text style={s.cardLabel}>Security</Text>

            {!showPasswordSection ? (
              <TouchableOpacity onPress={() => setShowPasswordSection(true)} style={s.securityRow} activeOpacity={0.7}>
                <View style={s.securityIconWrap}>
                  <LockIcon color={Colors.primary} />
                </View>
                <Text style={s.securityRowLabel}>Change Password</Text>
                <Text style={s.securityRowAction}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.passwordSection}>
                <FieldInput
                  icon={<LockIcon color={Colors.textMuted} />}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrent}
                  rightElement={
                    <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={{ padding: 4 }}>
                      <EyeIcon hidden={!showCurrent} />
                    </TouchableOpacity>
                  }
                />
                <FieldInput
                  icon={<LockIcon color={Colors.textMuted} />}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  rightElement={
                    <TouchableOpacity onPress={() => setShowNew(!showNew)} style={{ padding: 4 }}>
                      <EyeIcon hidden={!showNew} />
                    </TouchableOpacity>
                  }
                />
                <FieldInput
                  icon={<LockIcon color={Colors.textMuted} />}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  rightElement={
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={{ padding: 4 }}>
                      <EyeIcon hidden={!showConfirm} />
                    </TouchableOpacity>
                  }
                />
                <View style={s.passwordBtns}>
                  <TouchableOpacity onPress={() => setShowPasswordSection(false)} style={s.ghostBtn}>
                    <Text style={s.ghostBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleChangePassword} disabled={isUpdating} style={[s.primaryBtn, { flex: 1, marginTop: 0 }]}>
                    {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={s.primaryBtnText}>Update</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={s.divider} />

            <TouchableOpacity onPress={() => router.push('/forgot-password')} style={s.securityRow} activeOpacity={0.7}>
              <View style={[s.securityIconWrap, { backgroundColor: 'rgba(244,63,94,0.08)' }]}>
                <Text style={{ color: Colors.error, fontWeight: '700', fontSize: 14 }}>?</Text>
              </View>
              <Text style={s.securityRowLabel}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },

  avatarSection: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  avatarRingOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,200,150,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,200,150,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  avatarRingInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0,200,150,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(0,200,150,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.primaryLight, fontSize: 34, fontWeight: '900' },
  avatarName: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  avatarEmail: { color: Colors.textMuted, fontSize: 14, fontWeight: '500' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius['3xl'],
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  cardLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.xl,
  },

  field: { marginBottom: Spacing.base },
  fieldLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6, marginLeft: 2 },
  fieldInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Platform.OS === 'ios' ? 14 : 6,
    gap: Spacing.md,
    minHeight: 50,
  },
  fieldInputReadOnly: { backgroundColor: 'rgba(255,255,255,0.02)', opacity: 0.6 },
  fieldText: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },

  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  securityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0,200,150,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityRowLabel: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  securityRowAction: { color: Colors.primary, fontSize: 13, fontWeight: '700' },

  passwordSection: { gap: Spacing.sm, marginBottom: Spacing.md },
  passwordBtns: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  ghostBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.base },
});
