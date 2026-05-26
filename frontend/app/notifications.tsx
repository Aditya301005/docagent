import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useNotificationStore } from '../store/useNotificationStore';
import { Colors, Spacing, Radius } from '../constants/theme';

const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={Colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrashIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={Colors.error} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const XIcon = ({ color = Colors.textMuted }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function NotificationsScreen() {

  const insets = useSafeAreaInsets();
  const { notifications, markAsRead, markAllAsRead, clearAll, removeNotification } = useNotificationStore();

  useEffect(() => {
    // Mark all as read when opening the screen
    markAllAsRead();
  }, [markAllAsRead]);

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearAll();
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'processing': return Colors.primary;
      case 'success': return Colors.success;
      case 'export': return Colors.secondary;
      case 'error': return Colors.error;
      case 'security': return Colors.accent;
      default: return Colors.textMuted;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[s.card, !item.read && s.cardUnread]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={[s.iconBox, { backgroundColor: getIconColor(item.type) + '20' }]}>
        <View style={[s.dot, { backgroundColor: getIconColor(item.type) }]} />
      </View>
      <View style={s.content}>
        <Text style={s.title}>{item.title}</Text>
        <Text style={s.body}>{item.body}</Text>
        <Text style={s.time}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', paddingLeft: 8 }}>
        <TouchableOpacity 
          style={{ padding: 4 }} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            removeNotification(item.id);
          }}
        >
          <XIcon />
        </TouchableOpacity>
        {!item.read && <View style={[s.unreadDot, { marginBottom: 4 }]} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        {notifications.length > 0 ? (
          <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
            <TrashIcon />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <View style={s.emptyCircle} />
            <Text style={s.emptyTitle}>You're all caught up</Text>
            <Text style={s.emptyDesc}>No new notifications at the moment.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.textPrimary,
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(244,63,94,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardUnread: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 6,
  },
  time: {
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    color: Colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: Colors.textMuted,
  },
});
