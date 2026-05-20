import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Alert, ActivityIndicator, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useDocStore } from '../../store/useDocStore';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { notifySecurity, notifyActivity } from '../../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const ACTION_BTN_WIDTH = 80;
const PIN_LENGTH = 4;
const VAULT_PIN_KEY = 'vault_pin_code';

// ─── Icons ────────────────────────────────────────────────────────────────────

const LockIcon = ({ size = 80, color = "#6C63FF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="11" r="3" stroke={color} strokeWidth={1.5} />
    <Path d="M12 14v3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const UnlockIcon = ({ size = 24, color = "#FFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M7 11V7a5 5 0 0 1 9.9-1" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
  </Svg>
);

const TrashIcon = ({ size = 24, color = "#FFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BackspaceIcon = ({ color = "#FFF" }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM18 9l-6 6M12 9l6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── PIN Dot Indicator ─────────────────────────────────────────────────────────

const PinDots = ({ filled, shake }: { filled: number; shake: Animated.Value }) => (
  <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shake }] }]}>
    {Array.from({ length: PIN_LENGTH }).map((_, i) => (
      <View
        key={i}
        style={[
          styles.dot,
          i < filled ? styles.dotFilled : styles.dotEmpty,
        ]}
      />
    ))}
  </Animated.View>
);

// ─── PIN Pad ──────────────────────────────────────────────────────────────────

const PIN_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

const PinPad = ({ onPress }: { onPress: (key: string) => void }) => (
  <View style={styles.pinPad}>
    {PIN_KEYS.map((row, ri) => (
      <View key={ri} style={styles.pinRow}>
        {row.map((key, ki) => {
          if (key === '') return <View key={ki} style={styles.pinKeyEmpty} />;
          return (
            <TouchableOpacity
              key={ki}
              style={styles.pinKey}
              onPress={() => onPress(key)}
              activeOpacity={0.6}
            >
              {key === 'del' ? (
                <BackspaceIcon color="#FFF" />
              ) : (
                <Text style={styles.pinKeyText}>{key}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    ))}
  </View>
);

// ─── Swipeable Vault Card ─────────────────────────────────────────────────────

const SwipeableVaultCard = ({
  item,
  onPress,
  onUnlock,
  onDelete,
  selectionMode,
  isSelected,
  onToggleSelect
}: any) => {
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
    <View style={styles.cardContainer}>
      <View style={styles.behindButtons}>
        <TouchableOpacity
          style={[styles.behindBtn, { backgroundColor: '#6C63FF' }]}
          onPress={() => { closeActions(); onUnlock(); }}
        >
          <UnlockIcon size={22} color="#FFF" />
          <Text style={styles.behindBtnText}>Unlock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.behindBtn, { backgroundColor: '#FF4757', borderTopRightRadius: 20, borderBottomRightRadius: 20 }]}
          onPress={() => { closeActions(); onDelete(); }}
        >
          <TrashIcon size={22} color="#FFF" />
          <Text style={styles.behindBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ translateX }] }}>
        <TouchableOpacity
          style={[styles.docCard, isSelected && styles.selectedCard]}
          onPress={() => {
            if (swiped) closeActions();
            else if (selectionMode) onToggleSelect();
            else onPress();
          }}
          onLongPress={() => {
            if (selectionMode) return;
            if (swiped) closeActions();
            else openActions();
          }}
          delayLongPress={300}
          activeOpacity={0.8}
        >
          <View style={styles.docInfo}>
            {selectionMode && (
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>✓</Text>}
              </View>
            )}
            <View style={styles.docIconWrapper}>
              <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
            </View>
            <View style={styles.docText}>
              <Text style={styles.docName} numberOfLines={1}>{item.filename}</Text>
              <Text style={styles.docDate}>
                Locked on {format(new Date(item.uploadedAt), 'MMM dd, yyyy')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ─── PIN Lock Screen ──────────────────────────────────────────────────────────

type PinMode = 'unlock' | 'set' | 'confirm';

function PinLockScreen({ onSuccess }: { onSuccess: () => void }) {
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
    } else if (mode === 'set') {
      const next = pin + key;
      setPin(next);
      if (next.length === PIN_LENGTH) {
        setMode('confirm');
      }
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

  const handleResetPin = () => {
    Alert.alert(
      'Reset Passcode',
      'This will delete your current passcode. You will need to create a new one to access the vault. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(VAULT_PIN_KEY);
            setPin('');
            setConfirmPin('');
            setError('');
            setMode('set');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.lockedContainer}>
          <ActivityIndicator color="#6C63FF" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const subtitle =
    mode === 'unlock'
      ? 'Enter your 4-digit passcode to unlock'
      : mode === 'set'
      ? 'Create a 4-digit passcode to secure your vault'
      : 'Re-enter your passcode to confirm';

  const activePin = mode === 'confirm' ? confirmPin : pin;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.lockedContainer}>
        <View style={styles.topSection}>
          <View style={styles.iconCircle}>
            <LockIcon size={60} />
          </View>
          <Text style={styles.lockedTitle}>Secure Vault</Text>
          <Text style={styles.lockedSubtitle}>{subtitle}</Text>
          <PinDots filled={activePin.length} shake={shakeAnim} />
          {error ? <Text style={styles.errorText}>{error}</Text> : <View style={{ height: 20 }} />}
        </View>

        <View style={styles.bottomSection}>
          <PinPad onPress={handleKey} />
          {mode === 'unlock' && (
            <TouchableOpacity
              onPress={handleResetPin}
              style={styles.resetBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.resetBtnText}>Forgot PIN? Reset Passcode</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Main Vault Screen ────────────────────────────────────────────────────────

export default function VaultScreen() {
  const router = useRouter();
  const { getVisibleDocuments, isVaultAuthenticated, setVaultAuthenticated, toggleLock, removeDocument, documents: allDocuments } = useDocStore();
  const [lockedDocs, setLockedDocs] = useState(getVisibleDocuments(true));
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setLockedDocs(getVisibleDocuments(true));
    if (!isVaultAuthenticated) {
      setSelectionMode(false);
      setSelectedIds([]);
    }
  }, [getVisibleDocuments, isVaultAuthenticated, allDocuments]);

  const autoLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (autoLockTimer.current) {
        clearTimeout(autoLockTimer.current);
        autoLockTimer.current = null;
      }
      return () => {
        if (isVaultAuthenticated) {
          autoLockTimer.current = setTimeout(() => {
            setVaultAuthenticated(false);
            notifySecurity('Vault was auto-locked after 1 minute of inactivity.');
          }, 60_000);
        }
      };
    }, [isVaultAuthenticated, setVaultAuthenticated])
  );

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleBulkUnlock = () => {
    if (selectedIds.length === 0) return;
    Alert.alert('Unlock Documents?', `Move ${selectedIds.length} documents back to history?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unlock All', style: 'destructive', onPress: () => {
          selectedIds.forEach(id => toggleLock(id));
          notifySecurity(`${selectedIds.length} documents were unlocked and moved to History.`);
          cancelSelection();
        }
      }
    ]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert('Delete Documents?', `Permanently delete ${selectedIds.length} documents?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All', style: 'destructive', onPress: () => {
          selectedIds.forEach(id => removeDocument(id));
          notifyActivity(`${selectedIds.length} locked documents were permanently deleted.`);
          cancelSelection();
        }
      }
    ]);
  };

  const handleResetFromUnlocked = () => {
    Alert.alert(
      'Reset Passcode',
      'This will delete your current passcode. You will need to create a new one next time you open the vault.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(VAULT_PIN_KEY);
            setVaultAuthenticated(false);
          },
        },
      ]
    );
  };

  if (!isVaultAuthenticated) {
    return <PinLockScreen onSuccess={() => setVaultAuthenticated(true)} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        {selectionMode ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={cancelSelection} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#6C63FF', fontSize: 16, fontWeight: '700', marginRight: 12 }}>✕</Text>
              <Text style={styles.headerTitle}>{selectedIds.length} Selected</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity onPress={handleBulkUnlock}><UnlockIcon size={24} color="#6C63FF" /></TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete}><TrashIcon size={24} color="#FF4757" /></TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.headerTitle}>Secure Vault</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => setSelectionMode(true)} style={styles.lockNowBtn}>
                <Text style={[styles.lockNowText, { color: '#6C63FF' }]}>Select</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVaultAuthenticated(false)} style={styles.lockNowBtn}>
                <Text style={styles.lockNowText}>Lock Now</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Reset Passcode Banner ── */}
      {!selectionMode && (
        <TouchableOpacity
          style={styles.resetBanner}
          onPress={handleResetFromUnlocked}
          activeOpacity={0.75}
        >
          <View style={styles.resetBannerIcon}>
            <Text style={{ fontSize: 16 }}>🔑</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.resetBannerTitle}>Reset Passcode</Text>
            <Text style={styles.resetBannerSub}>Change your 4-digit vault PIN</Text>
          </View>
          <Text style={{ color: '#FF4757', fontSize: 18, fontWeight: '300' }}>›</Text>
        </TouchableOpacity>
      )}

      {lockedDocs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <LockIcon size={60} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>Your vault is empty.</Text>
          <Text style={styles.emptySubtext}>Long-press any document in History to move it here.</Text>
        </View>
      ) : (
        <FlatList
          data={lockedDocs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SwipeableVaultCard
              item={item}
              isSelected={selectedIds.includes(item.id)}
              selectionMode={selectionMode}
              onPress={() => router.push(`/results?docId=${item.id}&imageUri=${encodeURIComponent(item.imageUri)}`)}
              onUnlock={() => {
                toggleLock(item.id);
                notifySecurity(`"${item.filename}" was unlocked.`);
              }}
              onDelete={() => {
                Alert.alert('Delete Document', 'Delete this document?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => {
                      removeDocument(item.id);
                      notifyActivity(`"${item.filename}" was permanently deleted.`);
                    }
                  }
                ]);
              }}
              onToggleSelect={() => handleToggleSelect(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F1E' },

  // ── Locked / PIN screen ──
  lockedContainer: { flex: 1, paddingHorizontal: 32 },
  topSection: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 20 },
  bottomSection: { flex: 1.5, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10, width: '100%' },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(108, 99, 255, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(108, 99, 255, 0.2)' },
  lockedTitle: { color: '#FFF', fontSize: 26, fontWeight: '700', marginBottom: 10 },
  lockedSubtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  errorText: { color: '#FF4757', fontSize: 13, fontWeight: '600', marginTop: 4, marginBottom: 8 },

  // ── PIN dots ──
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotFilled: { backgroundColor: '#6C63FF' },
  dotEmpty: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },

  // ── PIN pad ──
  pinPad: { width: '100%', maxWidth: 320, alignSelf: 'center' },
  pinRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  pinKey: { width: '28%', aspectRatio: 1, borderRadius: 100, backgroundColor: 'rgba(108,99,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(108,99,255,0.25)' },
  pinKeyEmpty: { width: '28%', aspectRatio: 1 },
  pinKeyText: { color: '#FFF', fontSize: 26, fontWeight: '600' },

  // ── Header ──
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  lockNowBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  lockNowText: { color: '#FF4757', fontSize: 14, fontWeight: '600' },

  // ── List ──
  listContent: { padding: 20 },
  cardContainer: { marginBottom: 16, position: 'relative', overflow: 'hidden', borderRadius: 20, backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  behindButtons: { position: 'absolute', right: 0, top: 0, bottom: 0, flexDirection: 'row', width: ACTION_BTN_WIDTH * 2, zIndex: 0 },
  behindBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  behindBtnText: { color: '#FFF', fontSize: 10, fontWeight: '700', marginTop: 4 },
  docCard: { backgroundColor: '#1A1A2E', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  selectedCard: { borderColor: '#6C63FF', backgroundColor: 'rgba(108, 99, 255, 0.05)' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  docInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  docIconWrapper: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#0F0F1E', overflow: 'hidden', marginRight: 16 },
  thumbnail: { width: '100%', height: '100%', opacity: 0.7 },
  docText: { flex: 1 },
  docName: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 4, lineHeight: 22 },
  docDate: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, opacity: 0.5 },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '600', marginTop: 20 },
  emptySubtext: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', marginTop: 8 },
  resetBtn: { marginTop: 28, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,71,87,0.35)', backgroundColor: 'rgba(255,71,87,0.08)' },
  resetBtnText: { color: '#FF4757', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  resetBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 12, marginBottom: 4, backgroundColor: 'rgba(255,71,87,0.08)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.25)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  resetBannerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,71,87,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  resetBannerTitle: { color: '#FF4757', fontSize: 14, fontWeight: '700' },
  resetBannerSub: { color: 'rgba(255,71,87,0.6)', fontSize: 12, marginTop: 1 },
});
