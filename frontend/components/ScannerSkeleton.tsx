import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/useThemeStore';
import { Spacing, Radius } from '../constants/theme';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

export const ScannerSkeleton = () => {
  const { Colors, Gradients } = useThemeStore();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {/* Scanning Animation Header */}
      <View style={styles.header}>
        <View style={styles.scanningIndicator}>
          <Animated.View style={[styles.glowRing, { borderColor: Colors.primary, opacity: pulseAnim }]} />
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4zm12 0h4v4h-4v-4z" fill={Colors.primary} opacity={0.6}/>
            <Path d="M9 4h6v2H9V4zm0 14h6v2H9v-2zM4 9h2v6H4V9zm14 0h2v6h-2V9z" fill={Colors.primary} opacity={0.6}/>
            <Circle cx={12} cy={12} r={3} fill={Colors.primary} />
          </Svg>
        </View>
        <Text style={[styles.loadingText, { color: Colors.primary }]}>AI IS ANALYZING YOUR DOCUMENT...</Text>
        <Text style={[styles.subLoadingText, { color: Colors.textMuted }]}>Extracting intelligent entities and structured data</Text>
      </View>

      {/* Skeleton Classification Card */}
      <Animated.View style={[styles.classCardOuter, { opacity: pulseAnim, backgroundColor: 'rgba(255,255,255,0.03)' }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.05)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.classCardInner}>
          <View style={[styles.skeletonLine, { width: 100, height: 12, marginBottom: 12, backgroundColor: Colors.bgCard }]} />
          <View style={[styles.skeletonLine, { width: '70%', height: 28, backgroundColor: Colors.bgCard }]} />
        </View>
      </Animated.View>

      {/* Skeleton Entities List */}
      <View style={{ marginTop: 24 }}>
        <View style={[styles.skeletonLine, { width: 140, height: 16, marginBottom: 16, backgroundColor: Colors.bgCard }]} />
        
        <Animated.View style={[styles.glassCard, { opacity: pulseAnim, backgroundColor: 'rgba(255,255,255,0.02)' }]}>
          {[1, 2, 3].map((item, index) => (
            <View key={item} style={[styles.entityRow, index !== 2 && styles.borderBottom, { borderBottomColor: 'rgba(255,255,255,0.05)' }]}>
              <View style={[styles.skeletonCircle, { backgroundColor: Colors.bgCard }]} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={[styles.skeletonLine, { width: 80, height: 12, marginBottom: 8, backgroundColor: Colors.bgCard }]} />
                <View style={[styles.skeletonLine, { width: '80%', height: 16, backgroundColor: Colors.bgCard }]} />
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Skeleton Summary */}
      <View style={{ marginTop: 24 }}>
        <Animated.View style={[styles.glassCard, { opacity: pulseAnim, backgroundColor: 'rgba(255,255,255,0.02)' }]}>
          <View style={[styles.entityRow, styles.borderBottom, { borderBottomColor: 'rgba(255,255,255,0.05)' }]}>
            <View style={[styles.skeletonLine, { width: 120, height: 16, backgroundColor: Colors.bgCard }]} />
          </View>
          <View style={{ padding: 16 }}>
            <View style={[styles.skeletonLine, { width: '100%', height: 12, marginBottom: 10, backgroundColor: Colors.bgCard }]} />
            <View style={[styles.skeletonLine, { width: '90%', height: 12, marginBottom: 10, backgroundColor: Colors.bgCard }]} />
            <View style={[styles.skeletonLine, { width: '75%', height: 12, backgroundColor: Colors.bgCard }]} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  scanningIndicator: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  subLoadingText: {
    fontSize: 12,
    textAlign: 'center',
  },
  classCardOuter: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  classCardInner: {
    padding: Spacing.xl,
  },
  glassCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  skeletonLine: {
    borderRadius: 4,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
