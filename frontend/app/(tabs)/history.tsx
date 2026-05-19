import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { notifySecurity, notifyActivity } from '../../utils/notifications';
import { Document, DocumentType } from '../../types';
import { useDocStore } from '../../store/useDocStore';

// ─── Filter types ─────────────────────────────────────────────────────────────
type FilterType = 'all' | DocumentType;
const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Invoice', value: 'invoice' },
  { label: 'Receipt', value: 'receipt' },
  { label: 'Contract', value: 'contract' },
  { label: 'Form', value: 'form' },
  { label: 'ID Card', value: 'id_card' },
  { label: 'Letter', value: 'letter' },
  { label: 'Report', value: 'report' },
];

// ─── Icons ───────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={8} stroke="#9CA3AF" strokeWidth={2} />
    <Path d="M21 21l-4.35-4.35" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const FilterIcon = ({ color = '#334155' }: { color?: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronRight = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke="#D1D5DB" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const DocIcon = ({ color = "#6366F1" }: { color?: string }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrashIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShieldLockIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="11" r="3" stroke="#fff" strokeWidth={2} />
  </Svg>
);

const EmptyIcon = () => (
  <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={3} width={18} height={18} rx={3} stroke="#C7D2FE" strokeWidth={1.5} />
    <Path d="M9 9h6M9 13h4" stroke="#C7D2FE" strokeWidth={1.5} strokeLinecap="round" />
    <Circle cx={17} cy={17} r={5} fill="#EEF2FF" stroke="#6366F1" strokeWidth={1.5} />
    <Path d="M17 15v2l1 1" stroke="#6366F1" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

// ─── Type badge colors ────────────────────────────────────────────────────────
const typeColor = (type: string) => {
  const map: Record<string, { bg: string; text: string }> = {
    invoice: { bg: 'bg-indigo-50 dark:bg-indigo-900', text: 'text-indigo-600 dark:text-indigo-400' },
    receipt: { bg: 'bg-emerald-50 dark:bg-emerald-900', text: 'text-emerald-500 dark:text-emerald-400' },
    contract: { bg: 'bg-amber-50 dark:bg-amber-900', text: 'text-amber-500 dark:text-amber-400' },
    form: { bg: 'bg-sky-50 dark:bg-sky-900', text: 'text-sky-500 dark:text-sky-400' },
    id_card: { bg: 'bg-fuchsia-50 dark:bg-fuchsia-900', text: 'text-fuchsia-500 dark:text-fuchsia-400' },
    letter: { bg: 'bg-rose-50 dark:bg-rose-900', text: 'text-rose-500 dark:text-rose-400' },
    report: { bg: 'bg-green-50 dark:bg-green-900', text: 'text-green-600 dark:text-green-400' },
    resume: { bg: 'bg-orange-50 dark:bg-orange-900', text: 'text-orange-500 dark:text-orange-400' },
    unknown: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-500 dark:text-slate-300' },
  };
  return map[type] ?? { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-500 dark:text-slate-300' };
};

// ─── Filter Bar Component (Memoized) ───

const FilterBar = React.memo(({ activeFilter, onFilterChange }: { activeFilter: string, onFilterChange: (val: FilterType) => void }) => (
  <View style={{ height: 48, marginBottom: 8 }}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center' }}
    >
      {FILTERS.map((f) => {
        const active = activeFilter === f.value;
        return (
          <TouchableOpacity
            key={f.value}
            onPress={() => onFilterChange(f.value)}
            style={{ 
              marginRight: 10,
              backgroundColor: active ? '#4F46E5' : 'transparent',
              borderColor: active ? '#4F46E5' : '#E2E8F0',
            }}
            className={`px-5 py-2 rounded-full border ${!active ? 'bg-white dark:bg-slate-800 dark:border-slate-700' : ''}`}
            activeOpacity={0.75}
          >
            <Text className={`text-[13px] font-bold ${active ? 'text-white' : 'text-slate-500 dark:text-slate-300'}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
));

// ─── Folder Bar Component (Memoized) ───

const FolderBar = React.memo(({ activeFolderId, onFolderChange, onFolderLongPress, folders, allDocsCount, getFolderDocCount }: any) => (
  <View style={{ height: 80, marginBottom: 16 }}>
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, alignItems: 'center' }}
    >
      <TouchableOpacity 
        onPress={() => onFolderChange(null)}
        style={{ 
          marginRight: 12,
          backgroundColor: !activeFolderId ? '#4F46E5' : 'transparent',
          borderColor: !activeFolderId ? '#4F46E5' : '#E2E8F0',
        }}
        className={`px-5 py-3.5 rounded-[22px] border ${!activeFolderId ? '' : 'bg-white dark:bg-slate-800 dark:border-slate-700'}`}
      >
        <Text className={`font-bold ${!activeFolderId ? 'text-white' : 'text-slate-900 dark:text-white'}`}>All Scans</Text>
        <Text className={`text-[10px] mt-0.5 ${!activeFolderId ? 'text-indigo-100' : 'text-slate-500'}`}>{allDocsCount} items</Text>
      </TouchableOpacity>
      
      {folders.map((folder: any) => {
        const isActive = activeFolderId === folder.id;
        const count = getFolderDocCount(folder.id);
        return (
          <TouchableOpacity 
            key={folder.id}
            onPress={() => onFolderChange(folder.id)}
            onLongPress={() => onFolderLongPress?.(folder)}
            delayLongPress={400}
            style={{ 
              marginRight: 12,
              backgroundColor: isActive ? '#4F46E5' : 'transparent',
              borderColor: isActive ? '#4F46E5' : '#E2E8F0',
            }}
            className={`px-5 py-3.5 rounded-[22px] border ${isActive ? '' : 'bg-white dark:bg-slate-800 dark:border-slate-700'}`}
          >
            <Text className={`font-bold ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{folder.name}</Text>
            <Text className={`text-[10px] mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>{count} items</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
));

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
};

// ─── Swipeable card ──────────────────────────────────────────────────────────

const ACTION_BTN_WIDTH = 80;

const SwipeableDocCard = ({
  doc,
  onPress,
  onDelete,
  onLock,
  onLongPress,
  isSelected = false,
  selectionMode = false,
}: {
  doc: Document;
  onPress: () => void;
  onDelete: () => void;
  onLock: () => void;
  onLongPress: () => void;
  isSelected?: boolean;
  selectionMode?: boolean;
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);

  const openActions = () => {
    if (selectionMode) return;
    setSwiped(true);
    Animated.spring(translateX, { toValue: -(ACTION_BTN_WIDTH * 2), useNativeDriver: true, tension: 80, friction: 12 }).start();
  };
  const closeActions = () => {
    setSwiped(false);
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  };

  // Reset swipe when selection mode enters
  React.useEffect(() => {
    if (selectionMode && swiped) {
      closeActions();
    }
  }, [selectionMode]);

  const tc = typeColor(doc.type || 'unknown');

  return (
    <View 
      className="mb-3 overflow-hidden relative border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800" 
      style={{ borderRadius: 20 }}
    >
      {/* Behind buttons */}
      <View className="absolute right-0 top-0 bottom-0 flex-row">
        <TouchableOpacity 
          className="w-[80px] bg-indigo-500 items-center justify-center"
          onPress={() => { closeActions(); onLock(); }}
        >
          <ShieldLockIcon />
          <Text className="text-white text-[11px] font-bold mt-0.5">Lock</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="w-[80px] bg-rose-500 items-center justify-center"
          onPress={onDelete}
        >
          <TrashIcon />
          <Text className="text-white text-[11px] font-bold mt-0.5">Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Main card — slides left */}
      <Animated.View 
        className="bg-white dark:bg-slate-800"
        style={[{ transform: [{ translateX }] }]}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => { if (swiped) { closeActions(); } else { onPress(); } }}
          onLongPress={() => { 
            if (selectionMode) return;
            if (swiped) { closeActions(); } 
            else { openActions(); } 
          }}
          className={`flex-row items-center p-4 gap-3.5 ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-800'}`}
          delayLongPress={300}
        >
          {/* Checkbox for selection mode */}
          {selectionMode && (
            <View 
              style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: isSelected ? '#6366F1' : '#CBD5E1', backgroundColor: isSelected ? '#6366F1' : 'transparent', alignItems: 'center', justifyContent: 'center' }}
            >
              {isSelected && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>}
            </View>
          )}

          {/* Thumbnail */}
          <View className="w-[52px] h-[64px] rounded-lg bg-indigo-50 dark:bg-indigo-900 overflow-hidden">
            {doc.imageUri ? (
              <Image source={{ uri: doc.imageUri }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <DocIcon color="#6366F1" />
              </View>
            )}
          </View>

          {/* Content */}
          <View className="flex-1 gap-1.5">
            <Text 
              className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight" 
              numberOfLines={1}
              style={{ lineHeight: 22 }}
            >
              {doc.filename || 'Untitled'}
            </Text>
            <View className="flex-row items-center gap-2 flex-wrap">
              <View className={`px-2 py-1 rounded-lg ${tc.bg}`}>
                <Text className={`text-[10px] font-extrabold tracking-wide uppercase ${tc.text}`}>{(doc.type || 'unknown').replace('_', ' ')}</Text>
              </View>
              <Text className="text-xs color-slate-400 dark:text-slate-500 font-medium">{doc.uploadedAt ? formatDate(doc.uploadedAt) : '—'}</Text>
            </View>
          </View>

          {/* Chevron */}
          {!selectionMode && <ChevronRight />}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const rawFolders = useDocStore((state) => state.folders);
  const allDocuments = useDocStore((state) => state.documents);
  const currentUserKey = useDocStore((state) => state.currentUserKey);
  const addFolder = useDocStore((state) => state.addFolder);

  const folders = React.useMemo(() => {
    const key = currentUserKey?.trim().toLowerCase() || 'guest';
    return rawFolders.filter((f) => (f.ownerKey?.trim().toLowerCase() || 'guest') === key);
  }, [rawFolders, currentUserKey]);

  const allDocs = React.useMemo(() => {
    const key = currentUserKey?.trim().toLowerCase() || 'guest';
    return allDocuments.filter(d => (d.ownerKey?.trim().toLowerCase() || 'guest') === key);
  }, [allDocuments, currentUserKey]);

  const removeDocument = useDocStore((state) => state.removeDocument);
  const toggleLock = useDocStore((state) => state.toggleLock);
  const getVisibleDocuments = useDocStore((state) => state.getVisibleDocuments);
  
  const removeFolder = useDocStore((state) => state.removeFolder);
  const updateFolder = useDocStore((state) => state.updateFolder);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  
  const searchInputRef = useRef<TextInput>(null);

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleFolderLongPress = (folder: any) => {
    Alert.alert(
      'Manage Folder',
      `What would you like to do with "${folder.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => handleDeleteFolder(folder)
        },
        { 
          text: 'Rename', 
          onPress: () => {
            setEditingFolderId(folder.id);
            setEditingFolderName(folder.name);
          }
        }
      ]
    );
  };

  const handleDeleteFolder = (folder: any) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? Documents inside will NOT be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            removeFolder(folder.id);
            if (activeFolderId === folder.id) setActiveFolderId(null);
          }
        }
      ]
    );
  };

  const handleRenameFolder = () => {
    if (editingFolderId && editingFolderName.trim()) {
      updateFolder(editingFolderId, { name: editingFolderName.trim() });
      setEditingFolderId(null);
      setEditingFolderName('');
    }
  };

  const handleDelete = (doc: Document) => {
    Alert.alert(
      'Delete Document',
      `Delete "${doc.filename}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeDocument(doc.id);
            notifyActivity(`"${doc.filename}" was permanently deleted.`);
          },
        },
      ],
    );
  };

  const handleLock = (doc: Document) => {
    Alert.alert(
      'Secure Document?',
      'This document will be moved to your Secure Vault and hidden from History.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Vault',
          onPress: async () => {
            // Locally toggle
            toggleLock(doc.id);
            notifySecurity(`"${doc.filename}" encrypted and moved to Vault.`);
            // In a real app, we'd call the API here too
            // await patchDocumentLock(doc.id, true);
          },
        },
      ],
    );
  };

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const enterSelectionMode = (id: string) => {
    setSelectionMode(true);
    setSelectedIds([id]);
  };

  const handleLongPress = (doc: Document) => {
    if (selectionMode) return;
    
    Alert.alert(
      'Document Options',
      `Manage "${doc.filename}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Move to Vault', 
          onPress: () => handleLock(doc) 
        },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => handleDelete(doc) 
        },
        { 
          text: 'Select Multiple', 
          onPress: () => enterSelectionMode(doc.id) 
        },
      ]
    );
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      'Delete Documents?',
      `Permanently delete ${selectedIds.length} selected documents?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive',
          onPress: () => {
            selectedIds.forEach(id => removeDocument(id));
            notifyActivity(`${selectedIds.length} documents were permanently deleted.`);
            cancelSelection();
          }
        }
      ]
    );
  };

  const handleBulkLock = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      'Lock Documents?',
      `Move ${selectedIds.length} selected documents to Secure Vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Move to Vault', 
          onPress: () => {
            selectedIds.forEach(id => toggleLock(id));
            notifySecurity(`${selectedIds.length} documents encrypted and moved to Vault.`);
            cancelSelection();
          }
        }
      ]
    );
  };

  const filtered = React.useMemo(() => {
    const docs = getVisibleDocuments(false); // Hide locked docs
    return docs.filter((doc) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !search || 
        (doc.filename || '').toLowerCase().includes(q) ||
        (doc.type || '').toLowerCase().replace('_', ' ').includes(q) ||
        (doc.type || '').toLowerCase().includes(q) ||
        (doc.rawText || '').toLowerCase().includes(q);
      const matchType = activeFilter === 'all' || doc.type === activeFilter;
      const matchFolder = !activeFolderId || (doc.folderIds || []).includes(activeFolderId);
      return matchSearch && matchType && matchFolder;
    });
  }, [getVisibleDocuments, allDocuments, search, activeFilter, activeFolderId, currentUserKey]);

  return (
    <View 
      style={{ flex: 1, paddingTop: insets.top }}
      className="bg-slate-50 dark:bg-slate-900"
    >
      {/* ── Header ── */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-2">
        {selectionMode ? (
          <View className="flex-1 flex-row items-center justify-between">
            <TouchableOpacity onPress={cancelSelection} className="flex-row items-center">
              <Text className="text-indigo-600 font-bold text-lg mr-3">✕</Text>
              <Text className="text-[22px] font-extrabold text-slate-900 dark:text-white">{selectedIds.length} Selected</Text>
            </TouchableOpacity>
            <View className="flex-row gap-4">
              <TouchableOpacity onPress={handleBulkLock} className="bg-indigo-100 dark:bg-indigo-900/30 p-2.5 rounded-xl">
                <ShieldLockIcon />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete} className="bg-rose-100 dark:bg-rose-900/30 p-2.5 rounded-xl">
                <TrashIconRed />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View className="flex-1">
              <Text className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">My Documents</Text>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity 
                onPress={() => setSelectionMode(true)}
                className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl"
              >
                <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">Select</Text>
              </TouchableOpacity>
              {!isCreatingFolder && (
                <TouchableOpacity 
                  onPress={() => setIsCreatingFolder(true)}
                  className="bg-indigo-600 px-4 py-2 rounded-xl shadow-md"
                >
                  <Text className="text-white font-bold text-xs">New Folder</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
      
      {/* ... rest of the folder/search inputs ... */}
      {isCreatingFolder && (
        <View className="px-5 mb-4 animate-in fade-in slide-in-from-top-2">
          <View className="flex-row items-center bg-white dark:bg-slate-800 rounded-2xl px-4 py-2.5 shadow-sm border-2 border-indigo-500">
            <TextInput
              className="flex-1 text-[15px] color-slate-900 dark:text-white p-0"
              placeholder="Folder name..."
              placeholderTextColor="#9CA3AF"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <TouchableOpacity onPress={() => setIsCreatingFolder(false)} className="mr-3">
              <Text className="text-slate-400 font-bold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddFolder} className="bg-indigo-600 px-4 py-1.5 rounded-lg">
              <Text className="text-white font-bold text-xs">Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {editingFolderId && (
        <View className="px-5 mb-4 animate-in fade-in slide-in-from-top-2">
          <View className="flex-row items-center bg-white dark:bg-slate-800 rounded-2xl px-4 py-2.5 shadow-sm border-2 border-amber-500">
            <TextInput
              className="flex-1 text-[15px] color-slate-900 dark:text-white p-0"
              placeholder="New folder name..."
              placeholderTextColor="#9CA3AF"
              value={editingFolderName}
              onChangeText={setEditingFolderName}
              autoFocus
            />
            <TouchableOpacity onPress={() => setEditingFolderId(null)} className="mr-3">
              <Text className="text-slate-400 font-bold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRenameFolder} className="bg-amber-600 px-4 py-1.5 rounded-lg">
              <Text className="text-white font-bold text-xs">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!selectionMode && (
        <View className="px-5 mb-3">
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => searchInputRef.current?.focus()}
            className="flex-row items-center bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 gap-2.5 shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <SearchIcon />
            <TextInput
              ref={searchInputRef}
              className="flex-1 text-[15px] color-slate-900 dark:text-white p-0"
              placeholder="Search documents…"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text className="color-slate-400 dark:text-slate-500 font-semibold text-lg leading-[22px]">×</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!selectionMode && (
        <FolderBar 
          activeFolderId={activeFolderId} 
          onFolderChange={setActiveFolderId}
          onFolderLongPress={handleFolderLongPress}
          folders={folders}
          allDocsCount={allDocs.length}
          getFolderDocCount={(fid: string) => allDocs.filter(d => (d.folderIds || []).includes(fid)).length}
        />
      )}

      {!selectionMode && <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />}

      <Text className="px-6 mb-3 text-[13px] color-slate-400 dark:text-slate-500 font-semibold">
        {filtered.length} {filtered.length === 1 ? 'document' : 'documents'} {selectionMode ? 'available' : ''}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? { flexGrow: 1 } : { paddingBottom: 100, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <SwipeableDocCard
              doc={item}
              isSelected={isSelected}
              selectionMode={selectionMode}
              onPress={() => selectionMode ? handleToggleSelect(item.id) : router.push(`/results?docId=${item.id}&imageUri=${encodeURIComponent(item.imageUri)}`)}
              onDelete={() => handleDelete(item)}
              onLock={() => handleLock(item)}
            />
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-10 pt-16">
            <EmptyIcon />
            <Text className="text-xl font-extrabold text-slate-900 dark:text-white mt-5 mb-2 text-center">
              {search || activeFilter !== 'all' ? 'No results found' : 'No documents yet'}
            </Text>
            <Text className="text-sm color-slate-500 dark:text-slate-400 text-center leading-[22px]">
              {search || activeFilter !== 'all'
                ? 'Try a different search or filter.'
                : 'Scan or upload your first document to get started.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const TrashIconRed = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#FF4757" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
