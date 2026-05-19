import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useDocStore } from '../../store/useDocStore';

const { width } = Dimensions.get('window');

// ─── SVG Icons ─────────────────────────────────────────────────────────────

const HomeIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 22V12h6v10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ClockIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const GearIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.6.9 1 1.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
  </Svg>
);

const VaultIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChatIcon = ({ color }: { color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CameraIcon = () => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z" stroke="#FFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={13} r={4} stroke="#FFF" strokeWidth={2.5} />
  </Svg>
);

// ─── Floating Button ─────────────────────────────────────────────────────────

const FloatingButton = () => {
  const router = useRouter();

  return (
    <View style={s.floatingBtnWrapper}>
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => router.push('/scanner?mode=camera')}
        style={s.floatingBtn}
      >
        <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
          <Defs>
            <LinearGradient id="g_purple" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#8B5CF6" />
              <Stop offset="100%" stopColor="#4F46E5" />
            </LinearGradient>
          </Defs>
          <Circle cx="28" cy="28" r="28" fill="url(#g_purple)" />
        </Svg>
        <CameraIcon />
      </TouchableOpacity>
    </View>
  );
};

// ─── Custom Tab Bar ──────────────────────────────────────────────────────────
// Rather than absolutely positioning above the native tabs which can cause 
// un-clickable overlapping zones, we build a seamless 5-slot custom tab bar
// giving the center slot solely to the floating button!

import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={s.tabBarContainer}>
      <View style={s.tabBar}>
        <TabBarItem state={state} route={state.routes[0]} descriptors={descriptors} navigation={navigation} index={0} icon={HomeIcon} />
        <TabBarItem state={state} route={state.routes[1]} descriptors={descriptors} navigation={navigation} index={1} icon={ClockIcon} />
        <TabBarItem state={state} route={state.routes[2]} descriptors={descriptors} navigation={navigation} index={2} icon={VaultIcon} />
        <TabBarItem state={state} route={state.routes[3]} descriptors={descriptors} navigation={navigation} index={3} icon={GearIcon} />
      </View>

      <FloatingButton />
    </View>
  );
}

const TabBarItem = ({ state, route, descriptors, navigation, index, icon: Icon }: any) => {
  const { options } = descriptors[route.key];
  const label = options.title !== undefined ? options.title : route.name;

  const isFocused = state.index === index;
  const color = isFocused ? '#6C63FF' : 'rgba(255,255,255,0.4)';

  const onPress = () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  return (
    <TouchableOpacity onPress={onPress} style={s.tabItem} activeOpacity={0.7}>
      <Icon color={color} />
      <Text style={[s.tabLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
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

const s = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1A2E',
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    height: 84, // extra height for bottom safe area spacing
    paddingBottom: 20,
    width: '100%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 16,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  centerSpacer: {
    width: 60, // Reserves space for the floating button
  },
  floatingBtnWrapper: {
    position: 'absolute',
    bottom: 100, 
    right: 20,
    pointerEvents: 'box-none',
  },
  floatingBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
