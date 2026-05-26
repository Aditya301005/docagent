import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  FlatList, Animated, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Rect, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';
import { Colors, Spacing, Radius, Shadows } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');

// ─── Slide Config ────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: '1',
    icon: 'scan',
    title: 'Scan Any Document',
    subtitle: 'Point your camera at invoices, receipts, contracts, ID cards and more. DocAgent captures and processes them instantly.',
    primaryColor: '#00C896',
    secondaryColor: '#A78BFA',
    glowId: 'g1',
  },
  {
    id: '2',
    icon: 'extract',
    title: 'AI-Powered Extraction',
    subtitle: 'Our on-device AI models classify document type and extract key fields like totals, dates, names and addresses automatically.',
    primaryColor: '#22D3EE',
    secondaryColor: '#00C896',
    glowId: 'g2',
  },
  {
    id: '3',
    icon: 'batch',
    title: 'Batch Scan & Export',
    subtitle: 'Capture multiple pages in one session, then export as formatted PDF or JSON. Share instantly with any app.',
    primaryColor: '#10B981',
    secondaryColor: '#22D3EE',
    glowId: 'g3',
  },
  {
    id: '4',
    icon: 'vault',
    title: 'Secure Vault',
    subtitle: 'Sensitive documents are protected behind PIN authentication. Your data stays private and never leaves without your permission.',
    primaryColor: '#F59E0B',
    secondaryColor: '#F43F5E',
    glowId: 'g4',
  },
];

// ─── Slide Icons ─────────────────────────────────────────────────────────────

function SlideIcon({ type, color }: { type: string; color: string }) {
  if (type === 'scan') return (
    <Svg width={90} height={90} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.5} />
      <Rect x={14} y={3} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.5} />
      <Rect x={3} y={14} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.5} />
      <Path d="M14 16.5h2.5M14 19h6M19.5 14h-3M21 16.5h-.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M2 8.5H22M8.5 2v20" stroke={`${color}40`} strokeWidth={1} strokeDasharray="2 2" />
    </Svg>
  );
  if (type === 'extract') return (
    <Svg width={90} height={90} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={18} cy={18} r={5} fill={`${color}22`} stroke={color} strokeWidth={1.5} />
      <Path d="M18 16v2l1 1" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
  if (type === 'batch') return (
    <Svg width={90} height={90} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={7} width={14} height={17} rx={2} stroke={color} strokeWidth={1.5} />
      <Rect x={6} y={3} width={14} height={17} rx={2} stroke={`${color}70`} strokeWidth={1.5} />
      <Path d="M7 13h6M7 17h4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M16 19l2 2 4-4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
  return (
    <Svg width={90} height={90} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={11} r={3} stroke={color} strokeWidth={1.5} />
      <Path d="M12 14v3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Individual Slide ────────────────────────────────────────────────────────

function SlideItem({ item, scrollX, index }: { item: typeof SLIDES[0]; scrollX: Animated.Value; index: number }) {
  const inputRange = [(index - 1) * W, index * W, (index + 1) * W];
  const scale = scrollX.interpolate({ inputRange, outputRange: [0.85, 1, 0.85], extrapolate: 'clamp' });
  const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
  const translateY = scrollX.interpolate({ inputRange, outputRange: [30, 0, 30], extrapolate: 'clamp' });

  const ringPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={[s.slide, { width: W }]}>
      {/* Ambient Glow */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
          <Defs>
            <RadialGradient id={item.glowId} cx="50%" cy="35%" r="45%">
              <Stop offset="0%" stopColor={item.primaryColor} stopOpacity="0.2" />
              <Stop offset="100%" stopColor={item.primaryColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill={`url(#${item.glowId})`} />
        </Svg>
      </View>

      <Animated.View style={{ opacity, transform: [{ scale }, { translateY }], alignItems: 'center' }}>
        {/* Icon Ring */}
        <Animated.View style={[s.outerRing, { borderColor: `${item.primaryColor}30`, transform: [{ scale: ringPulse }] }]} />
        <View style={[s.iconCircle, { borderColor: `${item.primaryColor}50`, backgroundColor: `${item.primaryColor}12` }]}>
          <SlideIcon type={item.icon} color={item.primaryColor} />
        </View>

        <Text style={s.slideTitle}>{item.title}</Text>
        <Text style={s.slideSubtitle}>{item.subtitle}</Text>

        {/* Feature pills */}
        <View style={s.pillsRow}>
          {['AI-Powered', 'Secure', 'Fast'].map((tag) => (
            <View key={tag} style={[s.pill, { borderColor: `${item.primaryColor}35`, backgroundColor: `${item.primaryColor}10` }]}>
              <Text style={[s.pillText, { color: item.primaryColor }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Main Onboarding ──────────────────────────────────────────────────────────

export default function OnboardingScreen() {

  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const btnScaleAnim = useRef(new Animated.Value(1)).current;
  const isLast = currentIndex === SLIDES.length - 1;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const handleNext = async () => {
    await Haptics.selectionAsync();
    // Button press animation
    Animated.sequence([
      Animated.spring(btnScaleAnim, { toValue: 0.94, useNativeDriver: true, speed: 50 }),
      Animated.spring(btnScaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();

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

  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={s.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={s.skipText}>Skip</Text>
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
        scrollEnabled={true}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item, index }) => (
          <SlideItem item={item} scrollX={scrollX} index={index} />
        )}
      />

      {/* Bottom Controls */}
      <View style={s.controls}>
        {/* Dots */}
        <View style={s.dotsRow}>
          {SLIDES.map((slide, i) => {
            const inputRange = [(i - 1) * W, i * W, (i + 1) * W];
            const width = scrollX.interpolate({ inputRange, outputRange: [6, 22, 6], extrapolate: 'clamp' });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
            return (
              <Animated.View
                key={i}
                style={[s.dot, { width, opacity, backgroundColor: currentSlide.primaryColor }]}
              />
            );
          })}
        </View>

        {/* Next / Get Started */}
        <Animated.View style={{ transform: [{ scale: btnScaleAnim }], width: '100%' }}>
          <TouchableOpacity
            style={[s.nextBtn, { backgroundColor: currentSlide.primaryColor, shadowColor: currentSlide.primaryColor }]}
            onPress={handleNext}
            activeOpacity={1}
          >
            <Text style={s.nextBtnText}>
              {isLast ? '🚀  Get Started' : 'Continue  →'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Slide count */}
        <Text style={s.slideCount}>{currentIndex + 1} / {SLIDES.length}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
    paddingTop: 60,
  },

  outerRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    marginBottom: 44,
  },
  iconCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['3xl'],
  },

  slideTitle: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.base,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Spacing.xl,
  },

  pillsRow: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  controls: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    alignItems: 'center',
    gap: Spacing.base,
  },
  dotsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },

  nextBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: Radius.xl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  nextBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  slideCount: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
});
