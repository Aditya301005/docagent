import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { runOnJS } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

type Props = {
  children: React.ReactNode;
  leftRoute?: string;
  rightRoute?: string;
};

export const SwipeableTabWrapper = ({ children, leftRoute, rightRoute }: Props) => {
  const router = useRouter();

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && leftRoute) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.navigate(leftRoute as any);
    } else if (direction === 'right' && rightRoute) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.navigate(rightRoute as any);
    }
  };

  const panGesture = Gesture.Pan()
    .onEnd((e) => {
      'worklet';
      // Swiped right (translation > 0) -> reveal left tab
      if (e.translationX > width * 0.2 || e.velocityX > 800) {
        if (leftRoute) runOnJS(handleSwipe)('left');
      }
      // Swiped left (translation < 0) -> reveal right tab
      else if (e.translationX < -width * 0.2 || e.velocityX < -800) {
        if (rightRoute) runOnJS(handleSwipe)('right');
      }
    })
    .activeOffsetX([-30, 30]) // Require 30px horizontal drag to start
    .failOffsetY([-30, 30]); // Fail if dragging vertically to preserve scrolling

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={panGesture}>
        <View style={StyleSheet.absoluteFill}>
          {children}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};
