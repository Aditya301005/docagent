import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── Slide data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: '1',
    icon: 'scan',
    title: 'Scan Any Document',
    subtitle: 'Point your camera at invoices, receipts, contracts, ID cards and more. DocAgent captures and processes them instantly.',
    gradient: ['#6366F1', '#8B5CF6'],
    accent: '#A78BFA',
  },
  {
    id: '2',
    icon: 'extract',
    title: 'AI-Powered Extraction',
    subtitle: 'Our on-device AI models classify document type and extract key fields like totals, dates, names and addresses automatically.',
    gradient: ['#0EA5E9', '#6366F1'],
    accent: '#38BDF8',
  },
  {
    id: '3',
    icon: 'batch',
    title: 'Batch Scan & Export',
    subtitle: 'Capture multiple pages in one session, then export as formatted PDF or JSON. Share instantly with any app.',
    gradient: ['#10B981', '#0EA5E9'],
    accent: '#34D399',
  },
  {
    id: '4',
    icon: 'vault',
    title: 'Secure Vault',
    subtitle: 'Sensitive documents are protected behind biometric authentication. Your data never leaves your device without your permission.',
    gradient: ['#F59E0B', '#EF4444'],
    accent: '#FCD34D',
  },
];

// ─── Slide Icons ─────────────────────────────────────────────────────────────

function SlideIcon({ type, accent }: { type: string; accent: string }) {
  if (type === 'scan') return (
    <Svg width={100} height={100} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={7} height={7} rx={1} stroke={accent} strokeWidth={1.5} />
      <Rect x={14} y={3} width={7} height={7} rx={1} stroke={accent} strokeWidth={1.5} />
      <Rect x={3} y={14} width={7} height={7} rx={1} stroke={accent} strokeWidth={1.5} />
      <Path d="M14 16.5h2.5M14 19h6M19.5 14h-3M21 16.5h-.5" stroke={accent} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M2 8.5H22M8.5 2v20" stroke={`${accent}40`} strokeWidth={1} strokeDasharray="2 2" />
    </Svg>
  );
  if (type === 'extract') return (
    <Svg width={100} height={100} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={accent} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={18} cy={18} r={4} fill={`${accent}30`} stroke={accent} strokeWidth={1.5} />
      <Path d="M18 16v2l1 1" stroke={accent} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
  if (type === 'batch') return (
    <Svg width={100} height={100} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={7} width={14} height={17} rx={2} stroke={accent} strokeWidth={1.5} />
      <Rect x={6} y={3} width={14} height={17} rx={2} stroke={`${accent}70`} strokeWidth={1.5} />
      <Path d="M7 13h6M7 17h4" stroke={accent} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M16 19l2 2 4-4" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
  return (
    <Svg width={100} height={100} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={11} r={3} stroke={accent} strokeWidth={1.5} />
      <Path d="M12 14v3" stroke={accent} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Main Onboarding Screen ───────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    await Haptics.selectionAsync();
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      await handleDone();
    }
  };

  const handleDone = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem('onboarding_done', 'true');
    router.replace('/');
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem('onboarding_done', 'true');
    router.replace('/');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef as any}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: W }]}>
            {/* Background glow */}
            <View style={[styles.glow, { backgroundColor: item.accent + '18' }]} />

            {/* Icon circle */}
            <View style={[styles.iconCircle, { borderColor: item.accent + '40', backgroundColor: item.accent + '12' }]}>
              <SlideIcon type={item.icon} accent={item.accent} />
            </View>

            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * W, i * W, (i + 1) * W];
          const width = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
          const bg = SLIDES[currentIndex].accent;
          return (
            <Animated.View key={i} style={[styles.dot, { width, opacity, backgroundColor: bg }]} />
          );
        })}
      </View>

      {/* Next / Get Started button */}
      <TouchableOpacity
        style={[styles.nextBtn, { backgroundColor: SLIDES[currentIndex].accent }]}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.nextBtnText}>{isLast ? '🚀  Get Started' : 'Next  →'}</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1E', alignItems: 'center' },
  skipBtn: { position: 'absolute', top: 56, right: 24, zIndex: 10, padding: 8 },
  skipText: { color: 'rgba(255,255,255,0.45)', fontSize: 15, fontWeight: '600' },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 80,
  },
  glow: {
    position: 'absolute',
    top: H * 0.1,
    width: W * 0.85,
    height: W * 0.85,
    borderRadius: W * 0.425,
  },
  iconCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
  },
  slideTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
  },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 40, marginBottom: 32 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
