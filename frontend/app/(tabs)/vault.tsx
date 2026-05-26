import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions,
  Alert, ActivityIndicator, Image, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useDocStore } from '../../store/useDocStore';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { notifySecurity, notifyActivity } from '../../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spacing, Radius, Shadows } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { AmbientBg } from '../../components/AmbientBg';
import { showCustomAlert } from '../../components/CustomAlert';
import { SwipeableTabWrapper } from '../../components/SwipeableTabWrapper';
import { getAuthUrl } from '../../constants/api';

const { width } = Dimensions.get('window');
const ACTION_BTN_WIDTH = 76;
const PIN_LENGTH = 6;
const VAULT_PIN_KEY = 'vault_pin_code';

// ─── Icons ────────────────────────────────────────────────────────────────────

const LockIcon = ({ size = 60, color }: { size?: number; color?: string }) => {
  const { Colors } = useThemeStore();
  const strokeColor = color || Colors.primary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={11} r={3} stroke={strokeColor} strokeWidth={1.5} />
      <Path d="M12 14v3" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
};

const UnlockIcon = ({ size = 20, color = '#FFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M7 11V7a5 5 0 0 1 9.9-1" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Rect x={3} y={11} width={18} height={11} rx={2} stroke={color} strokeWidth={2} />
  </Svg>
);

const TrashIcon = ({ size = 20, color = '#FFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BackspaceIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM18 9l-6 6M12 9l6 6" stroke={Colors.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// ─── PIN Dots ─────────────────────────────────────────────────────────────────

const PinDots = ({ filled, shake }: { filled: number; shake: Animated.Value }) => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  const dotScales = useRef(Array.from({ length: PIN_LENGTH }, () => new Animated.Value(1))).current;

  useEffect(() => {
    if (filled > 0) {
      const idx = filled - 1;
      Animated.sequence([
        Animated.spring(dotScales[idx], { toValue: 1.3, useNativeDriver: true, speed: 50 }),
        Animated.spring(dotScales[idx], { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
    }
  }, [filled]);

  return (
    <Animated.View style={[s.dotsRow, { transform: [{ translateX: shake }] }]}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            s.dot,
            i < filled ? s.dotFilled : s.dotEmpty,
            { transform: [{ scale: dotScales[i] }] },
          ]}
        />
      ))}
    </Animated.View>
  );
};

// ─── PIN Pad ──────────────────────────────────────────────────────────────────

const PIN_KEYS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'del']];

const PinPad = ({ onPress }: { onPress: (key: string) => void }) => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const handlePressKey = (key: string) => {
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 100);
    onPress(key);
  };

  return (
    <View style={s.pinPad}>
      {PIN_KEYS.map((row, ri) => (
        <View key={ri} style={s.pinRow}>
          {row.map((key, ki) => {
            if (key === '') return <View key={ki} style={s.pinKeyEmpty} />;
            const isPressed = pressedKey === key;
            return (
              <TouchableOpacity
                key={ki}
                style={[s.pinKey, isPressed && s.pinKeyPressed]}
                onPress={() => handlePressKey(key)}
                activeOpacity={0.6}
              >
                {key === 'del' ? <BackspaceIcon /> : <Text style={s.pinKeyText}>{key}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// ─── PIN Lock Screen ──────────────────────────────────────────────────────────

const OrbitalScanner = ({ unlocked, progress }: { unlocked: boolean; progress: number }) => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateReverseAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 18000, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.timing(rotateReverseAnim, { toValue: 1, duration: 13000, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const spinReverse = rotateReverseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg']
  });

  return (
    <View style={s.orbitalContainer}>
      <View style={s.loaderGlowOrb} />
      
      <Animated.View style={[s.orbitalRing, s.orbitalRing1, { transform: [{ rotate: spin }] }]} />
      <Animated.View style={[s.orbitalRing, s.orbitalRing2, { transform: [{ rotate: spinReverse }] }]} />
      <Animated.View style={[s.orbitalRing, s.orbitalRing3, { transform: [{ rotate: spin }] }]} />

      <Animated.View style={[s.loaderPulseRing, { transform: [{ scale: pulseAnim }] }]} />
      
      <View style={s.lockIconCircle}>
        <ExpoLinearGradient
          colors={Gradients.holo}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={s.lockIconInnerCircle}>
          {unlocked ? (
            <UnlockIcon size={24} color={Colors.primary} />
          ) : (
            <LockIcon size={22} color="#FFF" />
          )}
        </View>
      </View>

      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i * 60 * Math.PI) / 180;
        const radius = 85;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const active = i < progress;
        return (
          <View
            key={i}
            style={[
              s.orbitalDot,
              {
                transform: [{ translateX: x }, { translateY: y }],
                backgroundColor: active ? Colors.primary : 'rgba(255,255,255,0.15)',
              },
              active && s.orbitalDotActive,
            ]}
          />
        );
      })}
    </View>
  );
};

type PinMode = 'unlock' | 'set' | 'confirm' | 'forgot_otp';

function PinLockScreen({ onSuccess }: { onSuccess: () => void }) {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mode, setMode] = useState<PinMode>('unlock');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(VAULT_PIN_KEY).then(stored => {
      setMode(stored ? 'unlock' : 'set');
      setLoading(false);
    });
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleForgotPin = async () => {
    showCustomAlert('Reset Vault PIN', 'Would you like us to send a 6-digit OTP to your registered email?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send OTP', onPress: requestOtp }
    ]);
  };

  const requestOtp = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const authUrl = await getAuthUrl();
      const res = await fetch(`${authUrl}/api/auth/forgot-vault-pin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        showCustomAlert('OTP Sent', 'Check your email for the 6-digit verification code.');
        setMode('forgot_otp');
        setPin('');
      } else {
        const data = await res.json();
        showCustomAlert('Error', data.detail || 'Could not send OTP');
      }
    } catch (e) {
      showCustomAlert('Error', 'Network error while requesting OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (otp: string) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const authUrl = await getAuthUrl();
      const res = await fetch(`${authUrl}/api/auth/verify-vault-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: otp })
      });
      
      if (res.ok) {
        // Success: Wipe the old PIN
        await AsyncStorage.removeItem(VAULT_PIN_KEY);
        showCustomAlert('Success', 'Your old PIN has been removed. Please create a new 6-digit PIN.');
        setMode('set');
        setPin('');
      } else {
        const data = await res.json();
        shake();
        setError(data.detail || 'Invalid OTP');
        setPin('');
      }
    } catch (e) {
      showCustomAlert('Error', 'Network error verifying OTP');
      shake();
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = async (key: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (key === 'del') {
      if (mode === 'confirm') setConfirmPin(p => p.slice(0, -1));
      else setPin(p => p.slice(0, -1));
      setError('');
      return;
    }

    if (mode === 'unlock') {
      const next = pin + key;
      setPin(next);
      if (next.length === PIN_LENGTH) {
        const stored = await AsyncStorage.getItem(VAULT_PIN_KEY);
        if (next === stored) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuccess();
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          shake();
          setError('Incorrect PIN. Try again.');
          setPin('');
        }
      }
    } else if (mode === 'forgot_otp') {
      const next = pin + key;
      setPin(next);
      if (next.length === PIN_LENGTH) {
        verifyOtp(next);
      }
    } else if (mode === 'set') {
      const next = pin + key;
      setPin(next);
      if (next.length === PIN_LENGTH) setMode('confirm');
    } else if (mode === 'confirm') {
      const next = confirmPin + key;
      setConfirmPin(next);
      if (next.length === PIN_LENGTH) {
        if (next === pin) {
          await AsyncStorage.setItem(VAULT_PIN_KEY, pin);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuccess();
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          shake();
          setError("PINs don't match. Try again.");
          setConfirmPin('');
          setMode('set');
          setPin('');
        }
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const subtitle = mode === 'unlock' ? 'Passcode Required'
    : mode === 'set' ? 'Create a 6-digit passcode to secure your vault'
    : mode === 'forgot_otp' ? 'Enter the 6-digit OTP sent to your email'
    : 'Re-enter your passcode to confirm';

  const activePin = mode === 'confirm' ? confirmPin : pin;

  return (
    <View style={[s.safe, { paddingTop: Math.max(insets.top, 40) + 35 }]}>

      <View style={s.lockScreen}>
        <View style={s.lockTop}>
          
          <OrbitalScanner unlocked={activePin.length === PIN_LENGTH} progress={activePin.length} />

          <Text style={s.lockSubtitle}>{subtitle}</Text>
          
          {/* Progress dots */}
          <Animated.View style={[s.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  i < activePin.length ? s.dotFilled : s.dotEmpty
                ]}
              />
            ))}
          </Animated.View>

          {error ? <Text style={s.errorText}>{error}</Text> : <View style={{ height: 20 }} />}
          
          {mode === 'unlock' && (
            <TouchableOpacity onPress={handleForgotPin} style={{ marginTop: 15 }}>
              <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600' }}>Forgot PIN?</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.lockBottom}>
          <PinPad onPress={handleKey} />
        </View>
      </View>
    </View>
  );
}

const SwipeableVaultCard = ({ item, onPress, onUnlock, onDelete, selectionMode, isSelected, onToggleSelect }: any) => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);

  const openActions = () => {
    if (selectionMode) return;
    setSwiped(true);
    Animated.spring(translateX, { toValue: -(ACTION_BTN_WIDTH * 2), useNativeDriver: true, tension: 80, friction: 12 }).start();
  };

  const closeActions = () => {
    setSwiped(false);
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  };

  useEffect(() => {
    if (selectionMode && swiped) closeActions();
  }, [selectionMode]);

  return (
    <View style={s.vaultCard}>
      {/* Behind buttons */}
      <View style={s.vaultCardBehind}>
        <TouchableOpacity
          style={[s.vaultBehindBtn, { backgroundColor: `${Colors.primary}D9` }]}
          onPress={() => { closeActions(); onUnlock(); }}
        >
          <UnlockIcon size={20} color="#FFF" />
          <Text style={s.vaultBehindText}>Unlock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.vaultBehindBtn, s.vaultBehindBtnRight, { backgroundColor: `${Colors.error}D9` }]}
          onPress={() => { closeActions(); onDelete(); }}
        >
          <TrashIcon size={20} color="#FFF" />
          <Text style={s.vaultBehindText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }}>
        <TouchableOpacity
          style={[s.vaultCardInner, isSelected && s.vaultCardSelected]}
          onPress={() => { if (swiped) closeActions(); else if (selectionMode) onToggleSelect(); else onPress(); }}
          onLongPress={() => { if (selectionMode) return; if (swiped) closeActions(); else openActions(); }}
          delayLongPress={300}
          activeOpacity={0.85}
        >
          {selectionMode && (
            <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
              {isSelected && <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>✓</Text>}
            </View>
          )}
          <View style={s.vaultThumbWrap}>
            <Image source={{ uri: item.imageUri }} style={s.vaultThumb} />
            <View style={s.vaultThumbOverlay} />
            <View style={s.vaultLockBadge}>
              <LockIcon size={14} color={Colors.primary} />
            </View>
          </View>
          <View style={s.vaultCardText}>
            <Text style={s.vaultDocName} numberOfLines={1}>{item.filename}</Text>
            <Text style={s.vaultDocDate}>
              Locked on {format(new Date(item.uploadedAt), 'MMM dd, yyyy')}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ─── Main Vault Screen ────────────────────────────────────────────────────────

export default function VaultScreen() {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  const router = useRouter();
  const { getVisibleDocuments, isVaultAuthenticated, setVaultAuthenticated, toggleLock, removeDocument, documents: allDocuments } = useDocStore();
  const [lockedDocs, setLockedDocs] = useState(getVisibleDocuments(true));
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setLockedDocs(getVisibleDocuments(true));
    if (!isVaultAuthenticated) { setSelectionMode(false); setSelectedIds([]); }
  }, [getVisibleDocuments, isVaultAuthenticated, allDocuments]);

  const autoLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useFocusEffect(
    React.useCallback(() => {
      if (autoLockTimer.current) { clearTimeout(autoLockTimer.current); autoLockTimer.current = null; }
      return () => {
        if (isVaultAuthenticated) {
          autoLockTimer.current = setTimeout(() => { setVaultAuthenticated(false); notifySecurity('Vault auto-locked after 1 minute.'); }, 60_000);
        }
      };
    }, [isVaultAuthenticated, setVaultAuthenticated])
  );

  const handleToggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const cancelSelection = () => { setSelectionMode(false); setSelectedIds([]); };

  const handleBulkUnlock = () => {
    showCustomAlert('Unlock Documents?', `Move ${selectedIds.length} documents back to history?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unlock All', style: 'destructive', onPress: () => { selectedIds.forEach(id => toggleLock(id)); notifySecurity(`${selectedIds.length} documents unlocked.`); cancelSelection(); } },
    ]);
  };

  const handleBulkDelete = () => {
    showCustomAlert('Delete Documents?', `Permanently delete ${selectedIds.length} documents?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All', style: 'destructive', onPress: () => { selectedIds.forEach(id => removeDocument(id)); notifyActivity(`${selectedIds.length} documents deleted.`); cancelSelection(); } },
    ]);
  };

  const handleResetFromUnlocked = () => {
    showCustomAlert('Reset Passcode', 'This will delete your current passcode. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem(VAULT_PIN_KEY); setVaultAuthenticated(false); } },
    ]);
  };

  if (!isVaultAuthenticated) {
    return (
      <SwipeableTabWrapper leftRoute="/history" rightRoute="/settings">
        <PinLockScreen onSuccess={() => setVaultAuthenticated(true)} />
      </SwipeableTabWrapper>
    );
  }

  return (
    <SwipeableTabWrapper leftRoute="/history" rightRoute="/settings">
      <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        {selectionMode ? (
          <View style={s.headerRow}>
            <TouchableOpacity onPress={cancelSelection}>
              <Text style={s.cancelText}>✕</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>{selectedIds.length} Selected</Text>
            <View style={s.headerActions}>
              <TouchableOpacity onPress={handleBulkUnlock} style={s.headerActionBtn}>
                <UnlockIcon size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete} style={[s.headerActionBtn, { backgroundColor: 'rgba(244,63,94,0.12)' }]}>
                <TrashIcon size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <View style={s.headerLockBadge}>
                <LockIcon size={16} color={Colors.primary} />
              </View>
              <Text style={s.headerTitle}>Secure Vault</Text>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity onPress={() => setSelectionMode(true)} style={s.headerChip}>
                <Text style={s.headerChipText}>Select</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVaultAuthenticated(false)} style={[s.headerChip, { borderColor: 'rgba(244,63,94,0.3)' }]}>
                <Text style={[s.headerChipText, { color: Colors.error }]}>Lock</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Reset PIN Banner */}
      {!selectionMode && (
        <TouchableOpacity style={s.resetBanner} onPress={handleResetFromUnlocked} activeOpacity={0.75}>
          <Text style={s.resetBannerIcon}>🔑</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.resetBannerTitle}>Reset Passcode</Text>
            <Text style={s.resetBannerSub}>Change your 6-digit vault PIN</Text>
          </View>
          <Text style={{ color: Colors.error, fontSize: 18, opacity: 0.6 }}>›</Text>
        </TouchableOpacity>
      )}

      {/* List or Empty */}
      {lockedDocs.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <LockIcon size={40} color="rgba(59,232,172,0.4)" />
          </View>
          <Text style={s.emptyTitle}>Vault is empty</Text>
          <Text style={[s.emptySub, { textAlign: 'center', paddingHorizontal: 20 }]}>Long-press any document in History to move it here.</Text>
        </View>
      ) : (
        <FlatList
          data={lockedDocs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <SwipeableVaultCard
              item={item}
              isSelected={selectedIds.includes(item.id)}
              selectionMode={selectionMode}
              onPress={() => router.push(`/results?docId=${item.id}&imageUri=${encodeURIComponent(item.imageUri)}`)}
              onUnlock={() => { toggleLock(item.id); notifySecurity(`"${item.filename}" was unlocked.`); }}
              onDelete={() => showCustomAlert('Delete Document', 'Delete this document?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => { removeDocument(item.id); notifyActivity(`"${item.filename}" was deleted.`); } },
              ])}
              onToggleSelect={() => handleToggleSelect(item.id)}
            />
          )}
        />
      )}
      </SafeAreaView>
    </SwipeableTabWrapper>
  );
}

const getStyles = (Colors: any, Gradients: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // PIN Lock Screen
  lockScreen: { flex: 1, paddingHorizontal: Spacing['2xl'], paddingBottom: 130 },
  lockTop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.xl,
  },
  lockSubHeader: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  lockTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  lockSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 16,
  },
  errorText: { color: Colors.error, fontSize: 13, fontWeight: '600', marginTop: 8 },

  // Orbital Scanner
  orbitalContainer: {
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  loaderGlowOrb: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(59,232,172,0.12)',
    opacity: 0.8,
  },
  orbitalRing: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  orbitalRing1: {
    width: 170,
    height: 170,
    borderStyle: 'dashed',
  },
  orbitalRing2: {
    width: 140,
    height: 140,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dotted',
  },
  orbitalRing3: {
    width: 105,
    height: 105,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  loaderPulseRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(59,232,172,0.3)',
  },
  lockIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  lockIconInnerCircle: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 33,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitalDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 10,
  },
  orbitalDotActive: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },

  dotsRow: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotFilled: { backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 4 },
  dotEmpty: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  lockBottom: { flex: 1.2, alignItems: 'center', justifyContent: 'flex-start', paddingTop: Spacing.md },
  pinPad: { width: '100%', maxWidth: 280, alignSelf: 'center' },
  pinRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  pinKey: {
    width: '28%',
    aspectRatio: 1,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinKeyPressed: { backgroundColor: 'rgba(0,200,150,0.2)', borderColor: 'rgba(0,200,150,0.4)' },
  pinKeyEmpty: { width: '28%', aspectRatio: 1 },
  pinKeyText: { color: Colors.textPrimary, fontSize: 24, fontWeight: '600' },

  // Header
  header: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerLockBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(0,200,150,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,200,150,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', flex: 1, letterSpacing: -0.3 },
  cancelText: { color: Colors.error, fontSize: 16, fontWeight: '700', marginRight: Spacing.md },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0,200,150,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },

  // Reset Banner
  resetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(244,63,94,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.2)',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  resetBannerIcon: { fontSize: 18 },
  resetBannerTitle: { color: Colors.error, fontSize: 14, fontWeight: '700' },
  resetBannerSub: { color: 'rgba(244,63,94,0.6)', fontSize: 12, marginTop: 2 },

  // Vault Card
  vaultCard: {
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vaultCardBehind: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    width: ACTION_BTN_WIDTH * 2,
  },
  vaultBehindBtn: {
    width: ACTION_BTN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  vaultBehindBtnRight: { borderTopRightRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  vaultBehindText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  vaultCardInner: {
    backgroundColor: '#0E1424',
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  vaultCardSelected: { backgroundColor: 'rgba(0,200,150,0.08)' },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  vaultThumbWrap: {
    width: 50,
    height: 50,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,200,150,0.12)',
  },
  vaultThumb: { width: '100%', height: '100%', opacity: 0.55 },
  vaultThumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,11,20,0.3)' },
  vaultLockBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(8,11,20,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultCardText: { flex: 1 },
  vaultDocName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  vaultDocDate: { color: Colors.textMuted, fontSize: 11, fontWeight: '500' },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,200,150,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,200,150,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
