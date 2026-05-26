import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { useDocStore } from '../../store/useDocStore';
import { Colors, Shadows, Radius } from '../../constants/theme';

import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');

// ─── SVG Icons ─────────────────────────────────────────────────────────────

const HomeIcon = ({ color, filled }: { color: string; filled?: boolean }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    {filled ? (
      <>
        <Defs>
          <LinearGradient id="homeOn" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="100%" stopColor="#2563EB" />
          </LinearGradient>
        </Defs>
        <Path d="M3 10l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="url(#homeOn)" />
        <Path d="M9 22V12h6v10" fill="#1E3A8A" fillOpacity="0.4" />
      </>
    ) : (
      <Path d="M3 10l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    )}
  </Svg>
);

const ClockIcon = ({ color, filled }: { color: string; filled?: boolean }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    {filled ? (
      <>
        <Defs>
          <LinearGradient id="clockOn" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#C084FC" />
            <Stop offset="100%" stopColor="#9333EA" />
          </LinearGradient>
        </Defs>
        <Circle cx="12" cy="12" r="10" fill="url(#clockOn)" />
        <Path d="M12 6v6l4 2" stroke="#FFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
        <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </Svg>
);

const GearIcon = ({ color, filled }: { color: string; filled?: boolean }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    {filled ? (
      <>
        <Defs>
          <LinearGradient id="gearOn" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#94A3B8" />
            <Stop offset="100%" stopColor="#475569" />
          </LinearGradient>
        </Defs>
        <Path
          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.9 1 1.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
          fill="url(#gearOn)"
        />
        <Circle cx="12" cy="12" r="3" fill="#0F172A" />
      </>
    ) : (
      <>
        <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.9 1 1.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
      </>
    )}
  </Svg>
);

const VaultIcon = ({ color, filled }: { color: string; filled?: boolean }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    {filled ? (
      <>
        <Defs>
          <LinearGradient id="vaultOn" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FBBF24" />
            <Stop offset="100%" stopColor="#D97706" />
          </LinearGradient>
        </Defs>
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#vaultOn)" />
        <Circle cx="12" cy="11" r="3" fill="#FFF" />
        <Path d="M11 13h2v3h-2z" fill="#FFF" />
      </>
    ) : (
      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    )}
  </Svg>
);

const ScanIcon = () => (
  <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="scanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFF" />
        <Stop offset="100%" stopColor="#E2E8F0" />
      </LinearGradient>
      <RadialGradient id="scanLens" cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0%" stopColor="#0F172A" />
        <Stop offset="100%" stopColor="#020617" />
      </RadialGradient>
    </Defs>
    <Rect x="2" y="6" width="20" height="14" rx="4" fill="url(#scanGrad)" />
    <Circle cx="12" cy="13" r="4.5" fill="url(#scanLens)" />
    <Circle cx="18" cy="9" r="1.5" fill="#CBD5E1" />
    <Path d="M9 6l1.5-2h3L15 6H9z" fill="url(#scanGrad)" />
  </Svg>
);

// ─── Floating Scan Button ──────────────────────────────────────────────────

const FloatingScanButton = () => {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    router.push('/scanner?mode=camera');
  };

  return (
    <View style={s.fabWrapper} pointerEvents="box-none">
      {/* Pulse ring */}
      <Animated.View style={[s.fabPulse, { transform: [{ scale: pulseAnim }] }]} />
      {/* Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity activeOpacity={1} onPress={handlePress} style={s.fab}>
          <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
            <Defs>
              <LinearGradient id="fabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={Colors.primary} />
                <Stop offset="100%" stopColor={Colors.primaryDark} />
              </LinearGradient>
            </Defs>
            <Circle cx="28" cy="28" r="28" fill="url(#fabGrad)" />
          </Svg>
          <ScanIcon />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ─── Tab Bar Item ────────────────────────────────────────────────────────────

const ICONS: Record<string, any> = {
  index: HomeIcon,
  history: ClockIcon,
  vault: VaultIcon,
  settings: GearIcon,
};

const LABELS: Record<string, string> = {
  index: 'Home',
  history: 'History',
  vault: 'Vault',
  settings: 'Settings',
};

const TabBarItem = ({ route, isFocused, onPress }: any) => {
  const name = route.name as string;
  const Icon = ICONS[name] || HomeIcon;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFocused) {
      Animated.spring(scaleAnim, {
        toValue: 1.15,
        useNativeDriver: true,
        damping: 12,
        stiffness: 180,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 150,
      }).start();
    }
  }, [isFocused]);

  const activeColor = Colors.primary;
  const inactiveColor = 'rgba(248,250,252,0.35)';
  const color = isFocused ? activeColor : inactiveColor;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={s.tabItem} activeOpacity={0.7}>
      <Animated.View style={[s.tabIconWrapper, isFocused && s.tabIconActive, { transform: [{ scale: scaleAnim }] }]}>
        <Icon color={color} filled={isFocused} />
      </Animated.View>
      <Text style={[s.tabLabel, { color }]}>{LABELS[name]}</Text>
    </TouchableOpacity>
  );
};

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={s.tabBarOuter} pointerEvents="box-none">
      <View style={s.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <React.Fragment key={route.key}>
              {index === 2 && <View style={{ width: 60 }} pointerEvents="none" />}
              <TabBarItem
                route={route}
                isFocused={isFocused}
                onPress={onPress}
              />
            </React.Fragment>
          );
        })}
      </View>
      <FloatingScanButton />
    </View>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function TabLayout() {

  const router = useRouter();
  const setCurrentUserKey = useDocStore((state) => state.setCurrentUserKey);

  useFocusEffect(
    useCallback(() => {
      const ensureAuthenticated = async () => {
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) {
          setCurrentUserKey('guest');
          router.replace('/login');
          return;
        }
        const savedEmail = await AsyncStorage.getItem('user_email');
        setCurrentUserKey(token === 'guest' ? 'guest' : savedEmail || 'guest');
      };
      ensureAuthenticated();
    }, [router, setCurrentUserKey])
  );

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const TAB_BAR_HEIGHT = 72;
const FAB_SIZE = 56;

const s = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT + 28,
    backgroundColor: 'transparent',
  },
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 20,
    right: 20,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    backgroundColor: 'rgba(10,12,22,0.97)',
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.card,
    shadowOpacity: 0.5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  tabIconWrapper: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  tabIconActive: {
    backgroundColor: `rgba(0,200,150,0.15)`,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 68 : 56,
    left: '50%',
    marginLeft: -(FAB_SIZE / 2),
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fabPulse: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: `rgba(0,200,150,0.22)`,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 12,
  },
});
