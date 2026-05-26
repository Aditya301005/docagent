import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';

const { width: W, height: H } = Dimensions.get('window');

export const AmbientBg = () => {
  const { Colors } = useThemeStore();
  const move1 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const move2 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loopOrb1 = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(move1, {
            toValue: { x: W * 0.1, y: H * 0.05 },
            duration: 10000,
            useNativeDriver: true,
          }),
          Animated.timing(move1, {
            toValue: { x: -W * 0.08, y: -H * 0.05 },
            duration: 12000,
            useNativeDriver: true,
          }),
          Animated.timing(move1, {
            toValue: { x: 0, y: 0 },
            duration: 10000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale1, {
            toValue: 1.15,
            duration: 15000,
            useNativeDriver: true,
          }),
          Animated.timing(scale1, {
            toValue: 0.9,
            duration: 15000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => loopOrb1());
    };

    const loopOrb2 = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(move2, {
            toValue: { x: -W * 0.08, y: -H * 0.08 },
            duration: 11000,
            useNativeDriver: true,
          }),
          Animated.timing(move2, {
            toValue: { x: W * 0.08, y: H * 0.08 },
            duration: 11000,
            useNativeDriver: true,
          }),
          Animated.timing(move2, {
            toValue: { x: 0, y: 0 },
            duration: 9000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale2, {
            toValue: 0.85,
            duration: 12000,
            useNativeDriver: true,
          }),
          Animated.timing(scale2, {
            toValue: 1.1,
            duration: 12000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => loopOrb2());
    };

    loopOrb1();
    loopOrb2();
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View
        style={{
          position: 'absolute',
          width: W * 0.95,
          height: W * 0.95,
          borderRadius: (W * 0.95) / 2,
          backgroundColor: Colors.primary,
          opacity: 0.12,
          top: -W * 0.3,
          left: -W * 0.1,
          transform: [
            { translateX: move1.x },
            { translateY: move1.y },
            { scale: scale1 },
          ],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: W * 0.85,
          height: W * 0.85,
          borderRadius: (W * 0.85) / 2,
          backgroundColor: Colors.secondary,
          opacity: 0.08,
          top: H * 0.15,
          right: -W * 0.25,
          transform: [
            { translateX: move2.x },
            { translateY: move2.y },
            { scale: scale2 },
          ],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          width: W * 0.9,
          height: W * 0.9,
          borderRadius: (W * 0.9) / 2,
          backgroundColor: Colors.accent,
          opacity: 0.08,
          bottom: -W * 0.2,
          left: W * 0.1,
          transform: [
            { translateX: move1.x },
            { translateY: move1.y },
            { scale: scale2 },
          ],
        }}
      />
    </View>
  );
};
