import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors } from '../constants/theme';

export function OfflineBanner() {

  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      if (offline) setWasOffline(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOffline) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 15, stiffness: 150 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (wasOffline) {
      // Slide out after 2s "Back online" message
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -60, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setWasOffline(false));
      }, 2000);
    }
  }, [isOffline]);

  if (!isOffline && !wasOffline) return null;

  return (
    <Animated.View style={[s.banner, { transform: [{ translateY }], opacity }, isOffline ? s.offline : s.online]}>
      <View style={s.dot} />
      <Text style={s.text}>
        {isOffline ? 'No internet connection' : '✓ Back online'}
      </Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  offline: {
    backgroundColor: Colors.error,
  },
  online: {
    backgroundColor: Colors.success,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  text: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 0.2,
  },
});
