import React, { useEffect, useRef } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';

const { width: W } = Dimensions.get('window');

// Single animated shimmer row
export function SkeletonCard({ height = 80, style }: { height?: number; style?: object }) {
  const { Colors } = useThemeStore();
  const s = getStyles(Colors);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });

  return (
    <View style={[s.card, { height }, style]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, s.shimmer, { opacity }]} />
      <View style={s.row}>
        <View style={s.iconBox} />
        <View style={s.lines}>
          <View style={[s.line, { width: '60%' }]} />
          <View style={[s.line, { width: '35%', marginTop: 8 }]} />
        </View>
        <View style={s.badge} />
      </View>
    </View>
  );
}

// List of skeletons
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.base, gap: Spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </View>
  );
}

// Bento stat skeleton (for home screen analytics)
export function SkeletonBento({ style }: { style?: object }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });

  return (
    <View style={[s.bento, style]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, s.shimmer, { opacity }]} />
      <View style={[s.line, { width: '40%', height: 28, marginBottom: 8 }]} />
      <View style={[s.line, { width: '70%', height: 12 }]} />
    </View>
  );
}

const getStyles = (Colors: any) => StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
  },
  shimmer: {
    backgroundColor: '#FFF',
    borderRadius: Radius.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  lines: { flex: 1 },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  badge: {
    width: 52,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bento: {
    flex: 1,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    padding: Spacing.base,
    justifyContent: 'flex-end',
  },
});

const s = getStyles(Colors);
