import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { AmbientBg } from './AmbientBg';
import {
  View, Text, ScrollView, TouchableOpacity, Dimensions,
  TextInput, Animated, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';
import { useFocusEffect, router } from 'expo-router';
import { isAfter, subDays } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { Document } from '../types';
import { useDocStore } from '../store/useDocStore';
import { useNotificationStore } from '../store/useNotificationStore';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, Shadows, Gradients } from '../constants/theme';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');
const CARD_GAP = 12;
const HALF_CARD = (W - Spacing.xl * 2 - CARD_GAP) / 2;

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={8} stroke={Colors.textMuted} strokeWidth={2} />
      <Path d="M21 21l-4.35-4.35" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
};

const DocIcon = ({ color, size = 22 }: { color?: string; size?: number }) => {
  const { Colors } = useThemeStore();
  const activeColor = color || Colors.primary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke={activeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={activeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const CamIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="camG" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#38BDF8" />
        <Stop offset="100%" stopColor="#3BE8AC" />
      </LinearGradient>
      <RadialGradient id="camL" cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0%" stopColor="#1E293B" />
        <Stop offset="100%" stopColor="#0F172A" />
      </RadialGradient>
    </Defs>
    <Rect x="2" y="5" width="20" height="15" rx="4" fill="url(#camG)" />
    <Circle cx="12" cy="12.5" r="4.5" fill="url(#camL)" stroke="#FFF" strokeWidth="1.5" />
    <Circle cx="19" cy="8" r="1.5" fill="#FFF" />
    <Path d="M9 5l1.5-2h3L15 5H9z" fill="url(#camG)" />
  </Svg>
);

const UploadIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="upG" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#A78BFA" />
        <Stop offset="100%" stopColor="#C084FC" />
      </LinearGradient>
      <LinearGradient id="arrG" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#FFF" />
        <Stop offset="100%" stopColor="#E2E8F0" />
      </LinearGradient>
    </Defs>
    <Path d="M19 16.5A4.5 4.5 0 0017.5 8h-.5c-1-3.5-5.5-4-7.5-2.5-2.5 2-2.5 5.5-2 6.5A4.5 4.5 0 005 16.5C5 19 7 21 9.5 21h8c2.5 0 4.5-2 4.5-4.5z" fill="url(#upG)" />
    <Path d="M12 16V8M9 11l3-3 3 3" stroke="url(#arrG)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShieldIcon = ({ color }: { color?: string }) => {
  const { Colors } = useThemeStore();
  const activeColor = color || Colors.success;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={activeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const ActivityIcon = ({ color }: { color?: string }) => {
  const { Colors } = useThemeStore();
  const activeColor = color || Colors.secondary;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke={activeColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
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

const TranslateIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M5 8h10M4 14h10M6 5v6M10 5v6" stroke="#FFF" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 18h8M14 15v6M18 15v6" stroke={Colors.primary} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
};

const VaultHomeIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="vG" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FBBF24" />
        <Stop offset="100%" stopColor="#F59E0B" />
      </LinearGradient>
      <LinearGradient id="vI" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFF" stopOpacity="0.4" />
        <Stop offset="100%" stopColor="#FFF" stopOpacity="0" />
      </LinearGradient>
    </Defs>
    <Path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" fill="url(#vG)" />
    <Path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" fill="url(#vI)" />
    <Circle cx="12" cy="11" r="2.5" fill="#FFF" />
    <Path d="M11 13h2v3h-2z" fill="#FFF" />
  </Svg>
);

// ─── Ambient Background (imported) ───────────────────────────────────────────

// ─── Bento Stat Cards ─────────────────────────────────────────────────────────

const BentoStatLarge = ({ value, label, sub, icon, gradientColors }: { value: string; label: string; sub: string; icon?: React.ReactNode; gradientColors?: readonly [string, string] }) => {
  const { Colors } = useThemeStore();
  const s = getStyles(Colors);
  return (
    <View style={s.bentoLarge}>
      <ExpoLinearGradient colors={gradientColors || ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFillObject} />
      <View style={s.bentoLargeContent}>
        <View style={s.bentoIconWrap}>
          {icon || <DocIcon color="#FFF" size={20} />}
        </View>
        <View>
          <Text style={s.bentoValue}>{value}</Text>
          <Text style={s.bentoLabel}>{label}</Text>
          <Text style={s.bentoSub}>{sub}</Text>
        </View>
      </View>
    </View>
  );
};

const BentoStatSmall = ({
  value, label, icon, color,
}: { value: string; label: string; icon: React.ReactNode; color: string }) => {
  const { Colors } = useThemeStore();
  const s = getStyles(Colors);
  return (
    <View style={s.bentoSmall}>
      <View style={[s.bentoSmallIcon, { backgroundColor: `${color}20` }]}>
        {icon}
      </View>
      <View>
        <Text style={s.bentoSmallValue}>{value}</Text>
        <Text style={s.bentoSmallLabel}>{label}</Text>
      </View>
    </View>
  );
};

const IntelligentAgentCard = () => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 110],
  });

  if (dismissed) return null;

  return (
    <View style={s.agentCard}>
      <View style={StyleSheet.absoluteFillObject}>
        <ExpoLinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View style={s.agentBorderTop} />
      <View style={s.agentGlow} />

      <Animated.View style={[s.agentScanLine, { transform: [{ translateY }] }]}>
        <ExpoLinearGradient
          colors={['transparent', Colors.primary, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <View style={s.agentContent}>
        <View style={s.agentSparkleIcon}>
          <ExpoLinearGradient
            colors={Gradients.holo}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={s.sparkleText}>✨</Text>
        </View>

        <View style={s.agentTextContainer}>
          <Text style={s.agentTag}>DOCAGENT</Text>
          <Text style={s.agentDesc}>
            I am ready to help you analyze and summarize any document. Scan a file to get started!
          </Text>

          <View style={s.agentButtons}>
            <TouchableOpacity style={s.agentRunBtn} activeOpacity={0.8} onPress={() => router.push('/scanner?mode=camera')}>
              <ExpoLinearGradient
                colors={Gradients.holo}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={s.agentRunText}>Start Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.agentDismissBtn} activeOpacity={0.8} onPress={() => setDismissed(true)}>
              <Text style={s.agentDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Document Card ────────────────────────────────────────────────────────────

const getTypeColors = (Colors: any): Record<string, string> => ({
  invoice: Colors.primary,
  receipt: Colors.success,
  contract: Colors.warning,
  form: Colors.secondary,
  id_card: Colors.accent,
  letter: '#F43F5E',
  report: Colors.success,
  unknown: Colors.textMuted,
});

const DocCard = ({ doc }: { doc: Document }) => {
  const { Colors } = useThemeStore();
  const s = getStyles(Colors);
  const typeColor = getTypeColors(Colors)[doc.type || 'unknown'] || Colors.textMuted;
  return (
    <TouchableOpacity
      onPress={() => router.push(`/results?docId=${doc.id}&imageUri=${encodeURIComponent(doc.imageUri)}`)}
      style={s.docCard}
      activeOpacity={0.7}
    >
      <View style={[s.docIconWrap, { backgroundColor: `${typeColor}15` }]}>
        <DocIcon color={typeColor} size={20} />
      </View>
      <View style={s.docInfo}>
        <Text style={s.docName} numberOfLines={1}>{doc.filename}</Text>
        <Text style={s.docDate}>{new Date(doc.uploadedAt).toLocaleDateString()}</Text>
      </View>
      <ChevRight />
    </TouchableOpacity>
  );
};

const EmptyState = () => {
  const { Colors } = useThemeStore();
  const s = getStyles(Colors);
  return (
    <View style={s.emptyState}>
      <View style={{ marginBottom: 16 }}>
        <DocIcon color={Colors.textMuted} size={40} />
      </View>
      <Text style={s.emptyTitle}>No recent scans</Text>
      <Text style={s.emptySubtitle}>Scan your first document to get started</Text>
      <TouchableOpacity style={s.emptyAction} onPress={() => router.push('/scanner?mode=camera')}>
        <Text style={s.emptyActionText}>Scan Document</Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DocAgentHomeScreen({ userName }: { userName: string }) {
  const { Colors } = useThemeStore();
  const s = getStyles(Colors);
  const insets = useSafeAreaInsets();
  const allDocuments = useDocStore((state) => state.documents);
  const currentUserKey = useDocStore((state) => state.currentUserKey);

  const documents = React.useMemo(() => {
    const key = currentUserKey?.trim().toLowerCase() || 'guest';
    return allDocuments.filter(d => (d.ownerKey?.trim().toLowerCase() || 'guest') === key);
  }, [allDocuments, currentUserKey]);

  const [displayName, setDisplayName] = useState(userName);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { getUnreadCount } = useNotificationStore();
  const unreadCount = getUnreadCount();

  // Handle push notification events
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => {
      // Handled internally by utils/notifications.ts
    });
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('user_name').then(name => {
        if (name) setDisplayName(name);
      });
    }, [])
  );

  const filteredDocuments = React.useMemo(() => {
    if (!searchQuery) return documents;
    const q = searchQuery.toLowerCase().trim();
    return documents.filter(d => {
      const name = (d.filename || '').toLowerCase();
      const type = (d.type || '').toLowerCase().replace('_', ' ');
      return name.includes(q) || type.includes(q);
    });
  }, [documents, searchQuery]);

  const stats = React.useMemo(() => {
    const total = documents.length;
    const weekAgo = subDays(new Date(), 7);
    const thisWeek = documents.filter(d => d.uploadedAt && isAfter(new Date(d.uploadedAt), weekAgo)).length;
    const avgConfidence = total > 0 ? Math.round(documents.reduce((a, d) => a + (d.confidence || 0), 0) / total * 100) : 0;
    const locked = documents.filter(d => d.isLocked).length;
    return { total, thisWeek, avgConfidence, locked };
  }, [documents]);

  const initials = displayName?.charAt(0)?.toUpperCase() || 'A';

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <AmbientBg />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={s.welcomeLabel}>WORKSPACE</Text>
            <Text style={s.userName} numberOfLines={1}>Good evening, {displayName}</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity
              style={s.bellBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/notifications')}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={Colors.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M13.73 21a2 2 0 01-3.46 0" stroke={Colors.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              {unreadCount > 0 && (
                <View style={s.bellBadge}>
                  <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')} style={s.avatarBtn} activeOpacity={0.8}>
              <ExpoLinearGradient
                colors={Gradients.holo}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={s.avatarRingInner}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search ── */}
        <View style={s.searchWrap}>
          <SearchIcon />
          <TextInput
            style={s.searchInput}
            placeholder="Ask anything across your documents…"
            placeholderTextColor="rgba(248,250,252,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={s.searchAIBadge}>
            <Text style={s.searchAIText}>AI</Text>
          </View>
        </View>

        {!searchQuery && (
          <>
            {/* ── Intelligent Agent Card ── */}
            <IntelligentAgentCard />

            {/* ── Stats Bento Grid ── */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Analytics</Text>
            </View>
            
            <View style={s.bentoGridRow}>
              {/* Left column */}
              <View style={{ flex: 1 }}>
                <BentoStatLarge
                  value={String(stats.total)}
                  label="Total Scanned"
                  sub="Documents in workspace"
                  icon={<DocIcon color="#FFF" size={20} />}
                  gradientColors={['rgba(0,200,150,0.3)', 'rgba(0,200,150,0.05)']}
                />
              </View>
              
              {/* Right column */}
              <View style={{ flex: 1 }}>
                <BentoStatLarge
                  value={'+' + stats.thisWeek}
                  label="This Week"
                  sub="Recent activity"
                  icon={<ActivityIcon color={Colors.secondary} />}
                  gradientColors={['rgba(56,189,248,0.25)', 'rgba(56,189,248,0.02)']}
                />
              </View>
            </View>

            {/* ── Quick Actions ── */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={s.actionsGrid}>
              {[
                { Icon: CamIcon, label: 'Scan', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/scanner?mode=camera'); } },
                { Icon: UploadIcon, label: 'Upload', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/scanner?mode=picker'); } },
                { Icon: VaultHomeIcon, label: 'Vault', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/vault'); } },
              ].map((act, i) => (
                <TouchableOpacity key={i} onPress={act.onPress} style={s.quickActionItem} activeOpacity={0.8}>
                  <View style={s.quickActionCircle}>
                    <act.Icon />
                  </View>
                  <Text style={s.quickActionLabel}>{act.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Recent / Search Results ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{searchQuery ? 'Search Results' : 'Recent Scans'}</Text>
          {!searchQuery && documents.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text style={s.viewAll}>View all</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.docList}>
          {filteredDocuments.length > 0 ? (
            filteredDocuments.slice(0, 8).map(doc => <DocCard key={doc.id} doc={doc} />)
          ) : (
            <EmptyState />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const getStyles = (Colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.base },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  bellBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingInner: {
    position: 'absolute',
    top: 1,
    bottom: 1,
    left: 1,
    right: 1,
    borderRadius: 17,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  headerText: { flex: 1 },
  welcomeLabel: { color: Colors.textMuted, fontSize: 10, fontFamily: 'Outfit_700Bold', letterSpacing: 1.5, marginBottom: 2 },
  userName: { color: Colors.textPrimary, fontSize: 20, fontFamily: 'Outfit_800ExtraBold', letterSpacing: -0.3 },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  aiDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  aiLabel: { color: Colors.success, fontSize: 11, fontWeight: '700' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
    height: 52,
    gap: Spacing.md,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  searchAIBadge: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  searchAIText: {
    color: 'rgba(248,250,252,0.65)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Section Headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
  sectionTitle: { color: 'rgba(248,250,252,0.45)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  viewAll: { color: Colors.primary, fontSize: 12, fontWeight: '600' },

  // Sparkline
  sparklineWrapper: {
    height: 38,
    justifyContent: 'center',
    marginVertical: 4,
  },

  // Agent Card
  agentCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    height: 146,
    borderRadius: Radius['3xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  agentBorderTop: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  agentGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(192,132,252,0.22)',
  },
  agentContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  agentSparkleIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 2,
  },
  sparkleText: {
    fontSize: 16,
    color: '#0B1020',
  },
  agentTextContainer: {
    flex: 1,
  },
  agentTag: {
    color: 'rgba(248,250,252,0.45)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  agentDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  agentButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  agentRunBtn: {
    width: 104,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentRunText: {
    color: '#0B1020',
    fontSize: 12,
    fontWeight: '700',
  },
  agentDismissBtn: {
    width: 80,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  agentDismissText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  agentScanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 1.5,
    opacity: 0.6,
  },

  // Bento stats grid layout
  bentoGridRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: CARD_GAP,
    marginBottom: Spacing.xl,
  },
  bentoLarge: {
    height: 160,
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  bentoInnerBorder: {
    position: 'absolute',
    inset: 0,
    borderRadius: Radius['3xl'] - 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  bentoLargeContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  bentoLargeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoLargeBottom: {
    gap: 4,
  },
  bentoGrowthText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(59,232,172,0.1)',
    borderRadius: Radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  bentoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  bentoValue: { color: Colors.textPrimary, fontSize: 32, fontWeight: '800', letterSpacing: -1, lineHeight: 36 },
  bentoSub: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },

  filterRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  filterTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterTagActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filterTagText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },

  bentoSmallCol: {
    flex: 1,
    gap: CARD_GAP,
  },
  bentoSmall: {
    flex: 1,
    height: 74,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  bentoSmallContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  bentoSmallIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoSmallValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  bentoSmallLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },

  // Quick Actions
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  quickActionItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  quickActionCircle: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  // Doc List
  docList: { paddingHorizontal: Spacing.xl, gap: 10 },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  docIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  docInfo: { flex: 1 },
  docName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  typeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  docDate: { color: Colors.textMuted, fontSize: 11, fontWeight: '500' },
  docRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
  confidenceText: { fontSize: 11, fontWeight: '800' },

  // Empty State
  emptyState: {
    borderWidth: 1,
    borderColor: 'rgba(0,200,150,0.25)',
    borderStyle: 'dashed',
    borderRadius: Radius['2xl'],
    padding: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  emptyAction: {
    backgroundColor: 'rgba(0,200,150,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,200,150,0.3)',
    width: 200,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  emptyActionText: { color: Colors.primaryLight, fontSize: 16, fontWeight: '700' },
});


