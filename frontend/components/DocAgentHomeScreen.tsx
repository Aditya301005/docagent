import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Path, Circle, Rect, Defs,
  LinearGradient as SvgGradient, Stop,
} from 'react-native-svg';
import { useFocusEffect, router } from 'expo-router';
import { isAfter, subDays } from 'date-fns';
import { Document } from '../types';
import { useDocStore } from '../store/useDocStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W } = Dimensions.get('window');

// ─── SVG icons ───────────────────────────────────────────────────────────────

// Removed BellIcon

const SearchIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={8} stroke="#9CA3AF" strokeWidth={2} />
    <Path d="M21 21l-4.35-4.35" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const DocIcon = ({ color = "#6366F1", size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ActivityIcon = ({ color = "#10B981", size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);



const CamIcon = ({ color = '#FFFFFF' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={2} />
  </Svg>
);

const UpIcon = ({ color = '#6366F1' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 8l-5-5-5 5M12 3v12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevRight = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke="#9CA3AF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Analytics Card Redesign ──────────────────────────────────────────────────

const PrimaryStatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle: string }) => (
  <View className="bg-indigo-600 dark:bg-indigo-500 rounded-[24px] p-5 mb-3 shadow-lg dark:shadow-none min-h-[140px] justify-between">
    <View className="flex-row justify-between items-start">
      <View className="w-12 h-12 rounded-full bg-indigo-300 dark:bg-indigo-700 items-center justify-center">
        <DocIcon color="#FFFFFF" size={24} />
      </View>
      <View className="bg-indigo-300 dark:bg-indigo-700 px-3 py-1.5 rounded-full">
        <Text className="text-white text-xs font-bold tracking-wider uppercase">Vault</Text>
      </View>
    </View>
    <View>
      <Text className="text-indigo-100 text-sm font-semibold mb-0.5">{title}</Text>
      <Text className="text-white text-[38px] font-black tracking-tighter leading-[48px]">{value}</Text>
      <Text className="text-indigo-200 text-xs mt-1 font-medium">{subtitle}</Text>
    </View>
  </View>
);

const SecondaryStatCard = ({ title, value }: { title: string; value: string }) => (
  <View className="flex-1 bg-white dark:bg-slate-800 rounded-[24px] p-5 border border-slate-100 dark:border-slate-700 shadow-md dark:shadow-none min-h-[140px] justify-between">
    <View className="w-10 h-10 rounded-full items-center justify-center bg-emerald-50 dark:bg-emerald-900">
      <ActivityIcon color="#10B981" size={20} />
    </View>
    <View className="mt-4">
      <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</Text>
      <Text className="text-[28px] font-black tracking-tight text-slate-900 dark:text-white">
        {value}
      </Text>
    </View>
  </View>
);

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DocAgentHomeScreen({ userName }: { userName: string }) {
  const insets = useSafeAreaInsets();
  const allDocuments = useDocStore((state) => state.documents);
  const currentUserKey = useDocStore((state) => state.currentUserKey);

  const documents = React.useMemo(() => {
    const key = currentUserKey?.trim().toLowerCase() || 'guest';
    return allDocuments.filter(d => (d.ownerKey?.trim().toLowerCase() || 'guest') === key);
  }, [allDocuments, currentUserKey]);
  const [displayName, setDisplayName] = useState(userName);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('user_name').then(name => {
        if (name) setDisplayName(name);
      });
    }, [])
  );

  const filteredDocuments = React.useMemo(() => {
    if (!searchQuery) return documents;
    const q = searchQuery.toLowerCase().trim();
    return documents.filter(d => {
      const name = (d.filename || '').toLowerCase();
      const type = (d.type || '').toLowerCase().replace('_', ' ');
      const raw = (d.rawText || '').toLowerCase();
      return name.includes(q) || type.includes(q) || d.type?.toLowerCase().includes(q) || raw.includes(q);
    });
  }, [documents, searchQuery]);

  const stats = React.useMemo(() => {
    const total = documents.length;
    const weekAgo = subDays(new Date(), 7);
    const thisWeek = documents.filter(
      (d) => d.uploadedAt && isAfter(new Date(d.uploadedAt), weekAgo)
    ).length;
    const avgConfidence = total > 0 ? documents.reduce((a, d) => a + (d.confidence || 0), 0) / total : 0;
    return { total, thisWeek, avgConfidence };
  }, [documents]);

  return (
    <View 
      style={{ flex: 1, paddingTop: insets.top }}
      className="bg-slate-50 dark:bg-slate-900"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Header ── */}
        <View className="flex-row justify-between items-center px-6 pt-5 pb-4">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.push('/profile')}
              className="w-[50px] h-[50px] rounded-full bg-indigo-50 dark:bg-indigo-900 items-center justify-center mr-3.5 border-2 border-white dark:border-slate-800 shadow-sm"
              activeOpacity={0.8}
            >
              <Text className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{displayName.charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
            <View>
              <Text className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest mb-0.5">Welcome back</Text>
              <Text className="text-[22px] font-extrabold text-slate-900 dark:text-white tracking-tight" style={{ lineHeight: 28 }}>{displayName}</Text>
            </View>
          </View>
        </View>

        {/* ── Search ── */}
        <View className="flex-row items-center bg-white dark:bg-slate-800 mx-6 mb-7 rounded-[20px] px-4 h-[54px] shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700">
          <SearchIcon />
          <TextInput
            className="flex-1 ml-3 text-[15px] text-slate-900 dark:text-white"
            placeholder="Search documents…"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
              <Text className="text-slate-400 font-bold text-lg">×</Text>
            </TouchableOpacity>
          ) : (
            <View className="bg-slate-50 dark:bg-slate-700 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
              <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold">⌘ K</Text>
            </View>
          )}
        </View>

        {/* ── Stats ── */}
        <Text className="text-[19px] font-extrabold text-slate-900 dark:text-white tracking-tight mx-6 mb-3">Overview</Text>
        <View className="px-6 mb-8">
          <PrimaryStatCard 
            title="Total Scanned" 
            value={String(stats.total)}
            subtitle="Documents in your secure vault" 
          />
          <SecondaryStatCard title="This Week" value={`+${stats.thisWeek}`} />
        </View>

        {/* ── Actions ── */}
        <Text className="text-[19px] font-extrabold text-slate-900 dark:text-white tracking-tight mx-6 mb-3">Upload Document</Text>
        <View className="flex-row mx-6 mb-8 gap-3">
          <TouchableOpacity
            onPress={() => router.push('/scanner?mode=camera')}
            className="flex-1 h-[62px] rounded-[20px] bg-indigo-600 dark:bg-indigo-500 flex-row items-center justify-center gap-2 shadow-md dark:shadow-none"
            activeOpacity={0.85}
          >
            <View className="text-white"><CamIcon /></View>
            <Text className="text-white text-[15px] font-bold">Direct Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/scanner?mode=picker')}
            className="flex-1 h-[62px] rounded-[20px] bg-white dark:bg-slate-800 flex-row items-center justify-center gap-2 shadow-sm border border-slate-200 dark:border-slate-700"
            activeOpacity={0.85}
          >
            <View className="text-indigo-600 dark:text-indigo-400"><UpIcon /></View>
            <Text className="text-indigo-600 dark:text-indigo-400 text-[15px] font-bold">Browse File</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent ── */}
        <View className="flex-row items-end justify-between mx-6 mb-3">
          <Text className="text-[19px] font-extrabold text-slate-900 dark:text-white tracking-tight">{searchQuery ? 'Search Results' : 'Recent Scans'}</Text>
          {!searchQuery && (
            <TouchableOpacity>
              <Text className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-0.5">View all</Text>
            </TouchableOpacity>
          )}
        </View>

        {filteredDocuments.length > 0 ? (
          filteredDocuments.slice(0, 10).map((doc) => (
            <TouchableOpacity
              key={doc.id}
              onPress={() => router.push(`/results?docId=${doc.id}&imageUri=${encodeURIComponent(doc.imageUri)}`)}
              className="flex-row items-center bg-white dark:bg-slate-800 mx-6 mb-3 rounded-[20px] p-4 shadow-sm dark:shadow-none border border-slate-100 dark:border-slate-700"
              activeOpacity={0.75}
            >
              <View className="w-[52px] h-[52px] rounded-2xl bg-indigo-50 dark:bg-indigo-900 items-center justify-center">
                <DocIcon color="#6366F1" size={24} />
              </View>
              <View className="flex-1 mx-3">
                <Text className="text-[15px] font-bold text-slate-900 dark:text-white" numberOfLines={1}>{doc.filename}</Text>
                <View className="flex-row items-center mt-1">
                  <Text className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">{doc.type}</Text>
                  <View className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-1.5" />
                  <Text className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : ''}
                  </Text>
                </View>
              </View>
              <View className="bg-emerald-50 dark:bg-emerald-900 px-2.5 py-1 rounded-xl mr-2">
                <Text className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{Math.round((doc.confidence || 0) * 100)}%</Text>
              </View>
              <ChevRight />
            </TouchableOpacity>
          ))
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/scanner?mode=picker')}
            className="mx-6 rounded-[24px] border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 p-8 items-center"
            activeOpacity={0.8}
          >
            <View className="w-[70px] h-[70px] rounded-full bg-white dark:bg-slate-800 items-center justify-center mb-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <DocIcon color="#6366F1" size={30} />
            </View>
            <Text className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">Your vault is empty</Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center leading-[22px]">
              Scan or upload your first document to extract AI insights instantly.
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
