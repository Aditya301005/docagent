import React, { useState, useEffect } from 'react';
import { useThemeStore } from '../../store/useThemeStore';
import {
  View, Text, TouchableOpacity, ScrollView, Switch, Alert, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useDocStore } from '../../store/useDocStore';
import * as Haptics from 'expo-haptics';
import { getAuthUrl } from '../../constants/api';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { Colors, Spacing, Radius, getColorsForAccent } from '../../constants/theme';
import { AmbientBg } from '../../components/AmbientBg';
import { showCustomAlert } from '../../components/CustomAlert';
import { SwipeableTabWrapper } from '../../components/SwipeableTabWrapper';

// ─── Icons ────────────────────────────────────────────────────────────────────

const MoonIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={Colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const UserIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={Colors.secondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="7" r="4" stroke={Colors.secondary} strokeWidth={2} />
    </Svg>
  );
};

const SignOutIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke={Colors.textSecondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const TrashIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={Colors.error} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const ChevRight = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={Colors.textMuted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// ─── Setting Row Component ───────────────────────────────────────────────────

const SettingRow = ({
  icon, label, sublabel, onPress, rightElement, danger = false, first = false, last = false,
}: {
  icon: React.ReactNode; label: string; sublabel?: string; onPress?: () => void;
  rightElement?: React.ReactNode; danger?: boolean; first?: boolean; last?: boolean;
}) => {
  const { Colors } = useThemeStore();
  const s = getStyles(Colors);
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        s.settingRow,
        first && s.settingRowFirst,
        last && s.settingRowLast,
      ]}
    >
      <View style={[s.settingRowIcon, { backgroundColor: danger ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.05)' }]}>
        {icon}
      </View>
      <View style={s.settingRowContent}>
        <Text style={[s.settingLabel, danger && { color: Colors.error }]}>{label}</Text>
        {sublabel && <Text style={s.settingSubLabel}>{sublabel}</Text>}
      </View>
      {rightElement ?? (onPress && <ChevRight />)}
    </TouchableOpacity>
  );
};

// ─── Section Component ────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const { Colors } = useThemeStore();
  const s = getStyles(Colors);
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{title}</Text>
      <View style={s.sectionCard}>
        {children}
      </View>
    </View>
  );
};

// ─── Settings Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { Colors, themeAccent, setAccent } = useThemeStore();
  const s = getStyles(Colors);

  const router = useRouter();
  const [email, setEmail] = useState('Guest');
  const [name, setName] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
  const clearDocs = useDocStore((state) => state.clearAll);
  const setCurrentUserKey = useDocStore((state) => state.setCurrentUserKey);
  const insets = useSafeAreaInsets();
  const { colorScheme, toggleColorScheme } = useColorScheme();

  useEffect(() => {
    const loadSettings = async () => {
      const savedEmail = await AsyncStorage.getItem('user_email');
      const savedName = await AsyncStorage.getItem('user_name');
      if (savedEmail) setEmail(savedEmail);
      if (savedName) setName(savedName);
    };
    loadSettings();
  }, []);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    showCustomAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await AsyncStorage.multiRemove(['auth_token', 'user_email', 'user_name']);
            setCurrentUserKey('guest');
            setEmail('Guest');
            router.replace('/login');
          } catch {
            showCustomAlert('Sign Out Failed', 'Unable to clear your local session.');
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  const handleClearHistory = () => {
    showCustomAlert('Clear All History', 'Permanently delete all scanned documents? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear Data', style: 'destructive', onPress: () => { clearDocs(); showCustomAlert('Cleared', 'All document history has been deleted.'); } },
    ]);
  };

  const initials = (name || email || 'G').charAt(0).toUpperCase();

  return (
    <SwipeableTabWrapper leftRoute="/vault">
      <View style={[s.container, { paddingTop: insets.top }]}>
        <AmbientBg />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Settings</Text>
        </View>

        {/* Profile Card */}
        <TouchableOpacity onPress={() => router.push('/profile')} activeOpacity={0.8} style={s.profileCardContainer}>
          <View style={s.profileCard}>
            <View style={s.profileAvatar}>
              <Text style={s.profileInitials}>{initials}</Text>
            </View>
            <View style={s.profileInfo}>
              <Text style={s.profileName}>{name || 'User'}</Text>
              <Text style={s.profileEmail}>{email}</Text>
            </View>
            <View style={s.profileArrow}>
              <ChevRight />
            </View>
          </View>
        </TouchableOpacity>

        {/* Appearance Accent Selection */}
        <Section title="Appearance">
          <View style={{ padding: Spacing.base, gap: Spacing.md }}>
            <Text style={{ color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>Theme Accent</Text>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              {(['teal', 'lavender', 'sky', 'rose'] as const).map((accent) => {
                const accentColors = getColorsForAccent(accent);
                const isSelected = themeAccent === accent;
                return (
                  <TouchableOpacity
                    key={accent}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setAccent(accent);
                    }}
                    activeOpacity={0.8}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: accentColors.primary,
                      borderWidth: 3,
                      borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: accentColors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isSelected ? 0.6 : 0,
                      shadowRadius: 10,
                      elevation: isSelected ? 6 : 0,
                    }}
                  >
                    {isSelected && (
                      <View style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: '#FFFFFF',
                      }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Section>

        {/* Account */}
        <Section title="Account">
          <SettingRow
            icon={<SignOutIcon />}
            label={isSigningOut ? 'Signing Out...' : 'Sign Out'}
            onPress={handleSignOut}
            first
          />
          <View style={s.divider} />
          <SettingRow
            icon={<TrashIcon />}
            label="Delete Account"
            sublabel="Permanently delete your account"
            onPress={() => {
              showCustomAlert('Delete Account', 'Are you sure you want to delete your account? This action cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => {
                  try {
                    const token = await AsyncStorage.getItem('auth_token');
                    if (token) {
                      const authUrl = await getAuthUrl();
                      const res = await fetch(`${authUrl}/api/auth/me`, {
                        method: 'DELETE',
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      if (!res.ok) {
                        throw new Error('Failed to delete account');
                      }
                    }
                    showCustomAlert('Account Deleted', 'Your account has been permanently deleted.');
                    handleSignOut();
                  } catch (e) {
                    showCustomAlert('Error', 'Could not delete account. Please try again later. (Make sure the backend is restarted)');
                  }
                }}
              ]);
            }}
            danger
            last
          />
        </Section>

        {/* Developer */}
        <Section title="Developer & Data">
          <SettingRow
            icon={<TrashIcon />}
            label="Clear All History"
            sublabel="Permanently delete all documents"
            onPress={handleClearHistory}
            danger
            first
            last
          />
        </Section>

        {/* App Info */}
        <View style={s.appInfo}>
          <View style={s.appInfoDot} />
          <Text style={s.appInfoTitle}>DocAgent AI</Text>
          <Text style={s.appInfoVersion}>Version 1.0.0</Text>
          <Text style={s.appInfoTech}>Built with React Native + Expo</Text>
        </View>
      </ScrollView>
      </View>
    </SwipeableTabWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.lg },
  headerTitle: { color: Colors.textPrimary, fontSize: 28, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.5 },

  profileCardContainer: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,200,150,0.2)',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,200,150,0.05)',
    padding: Spacing.base,
    gap: Spacing.base,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,200,150,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,200,150,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: { color: Colors.primaryLight, fontSize: 20, fontFamily: 'Outfit_800ExtraBold' },
  profileInfo: { flex: 1 },
  profileName: { color: Colors.textPrimary, fontSize: 16, fontFamily: 'Outfit_700Bold', marginBottom: 2 },
  profileEmail: { color: Colors.textMuted, fontSize: 13, fontFamily: 'Outfit_500Medium' },
  profileArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: { marginHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
  },
  settingRowFirst: {},
  settingRowLast: {},
  settingRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRowContent: { flex: 1 },
  settingLabel: { color: Colors.textPrimary, fontSize: 15, fontFamily: 'Outfit_600SemiBold' },
  settingSubLabel: { color: Colors.textMuted, fontSize: 12, fontFamily: 'Outfit_400Regular', marginTop: 2 },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 64,
  },

  appInfo: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: 4,
    opacity: 0.5,
  },
  appInfoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginBottom: 6,
  },
  appInfoTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  appInfoVersion: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  appInfoTech: { color: Colors.textMuted, fontSize: 11, fontWeight: '500' },
});

const s = getStyles(Colors);

