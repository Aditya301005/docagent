import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, SectionList, TextInput, TouchableOpacity,
  ScrollView, Alert, Image, Dimensions, Animated, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import Svg, { Path, Circle, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { notifySecurity, notifyActivity } from '../../utils/notifications';
import { useDocStore } from '../../store/useDocStore';
import { Document, DocumentType } from '../../types';
import { Spacing, Radius } from '../../constants/theme';
import { useThemeStore } from '../../store/useThemeStore';
import { AmbientBg } from '../../components/AmbientBg';
import { showCustomAlert } from '../../components/CustomAlert';
import { SwipeableTabWrapper } from '../../components/SwipeableTabWrapper';

// ─── Filter Config ────────────────────────────────────────────────────────────

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

const getTypeColor = (type: string, Colors: any) => {
  const map: Record<string, string> = {
    invoice: Colors.primary,
    receipt: Colors.secondary,
    contract: Colors.accent,
    form: '#F43F5E',
    id_card: '#10B981',
    letter: '#F59E0B',
    report: Colors.secondary,
    unknown: Colors.textMuted,
  };
  return map[type] || Colors.textMuted;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={8} stroke={Colors.textMuted} strokeWidth={2} />
      <Path d="M21 21l-4.35-4.35" stroke={Colors.textMuted} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
};

const FilterIcon = ({ color, size = 14 }: { color?: string; size?: number }) => {
  const { Colors } = useThemeStore();
  const activeColor = color || Colors.textMuted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke={activeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const SparklesIcon = ({ color, size = 14 }: { color?: string, size?: number }) => {
  const { Colors } = useThemeStore();
  const activeColor = color || Colors.primary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.813 15.904L9 21L8.188 15.904L3 15L8.188 14.096L9 9L9.813 14.096L15 15L9.813 15.904Z" fill={activeColor} />
      <Path d="M19.071 7.071L18.5 10.5L17.929 7.071L14.5 6.5L17.929 5.929L18.5 2.5L19.071 5.929L22.5 6.5L19.071 7.071Z" fill={activeColor} />
    </Svg>
  );
};

const DocIcon = ({ color }: { color?: string }) => {
  const { Colors } = useThemeStore();
  const activeColor = color || Colors.primary;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke={activeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={activeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const TrashIcon = ({ color = '#FFF' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShieldIcon = ({ color = '#FFF' }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} />
    <Circle cx="12" cy="11" r="3" stroke={color} strokeWidth={2} />
  </Svg>
);

const ChevronRight = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={Colors.textMuted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
};

// ─── Radial Glow SVG ─────────────────────────────────────────────────────────

const RadialGlow = ({ color, size = 48 }: { color: string; size?: number }) => (
  <Svg style={StyleSheet.absoluteFill} width={size} height={size} viewBox="0 0 48 48">
    <Defs>
      <RadialGradient id={`glow-${color.replace('#', '')}`} cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0%" stopColor={color} stopOpacity={0.35} />
        <Stop offset="100%" stopColor={color} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Circle cx={24} cy={24} r={24} fill={`url(#glow-${color.replace('#', '')})`} />
  </Svg>
);

// ─── Filter Bar ───────────────────────────────────────────────────────────────

const FilterBar = React.memo(({ activeFilter, onFilterChange }: { activeFilter: string; onFilterChange: (v: FilterType) => void }) => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  return (
    <View style={{ height: 40, marginBottom: Spacing.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: 8, alignItems: 'center' }}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.value;
          
          if (active) {
            return (
              <TouchableOpacity
                key={f.value}
                onPress={() => onFilterChange(f.value)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={Gradients.holo}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.filterPillActive}
                >
                  <Text style={s.filterTextActive}>{f.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => onFilterChange(f.value)}
              style={s.filterPill}
              activeOpacity={0.7}
            >
              <Text style={s.filterText}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const FolderBar = React.memo(({ activeFolderId, onFolderChange, onFolderLongPress, folders, allDocsCount, getFolderDocCount }: any) => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  return (
    <View style={{ height: 64, marginBottom: Spacing.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: 8, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => onFolderChange(null)}
          style={[s.folderPill, !activeFolderId && s.folderPillActive]}
          activeOpacity={0.7}
        >
          <Text style={[s.folderName, !activeFolderId && s.folderNameActive]}>All Scans</Text>
          <Text style={[s.folderCount, !activeFolderId && { color: `${Colors.primary}CC` }]}>{allDocsCount} items</Text>
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
              style={[s.folderPill, isActive && s.folderPillActive]}
              activeOpacity={0.7}
            >
              <Text style={[s.folderName, isActive && s.folderNameActive]}>{folder.name}</Text>
              <Text style={[s.folderCount, isActive && { color: `${Colors.primary}CC` }]}>{count} items</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ─── Swipeable Doc Card ───────────────────────────────────────────────────────

const ACTION_BTN_W = 76;

const SwipeableDocCard = ({
  doc, onPress, onDelete, onLock, onLongPress, isSelected = false, selectionMode = false, isLast = false,
}: {
  doc: Document; onPress: () => void; onDelete: () => void;
  onLock: () => void; onLongPress: () => void; isSelected?: boolean; selectionMode?: boolean; isLast?: boolean;
}) => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiped, setSwiped] = useState(false);
  const typeColor = getTypeColor(doc.type || 'unknown', Colors);

  const openActions = () => {
    if (selectionMode) return;
    setSwiped(true);
    Animated.spring(translateX, { toValue: -(ACTION_BTN_W * 2), useNativeDriver: true, tension: 80, friction: 12 }).start();
  };
  const closeActions = () => {
    setSwiped(false);
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  };

  React.useEffect(() => {
    if (selectionMode && swiped) closeActions();
  }, [selectionMode]);

  return (
    <View style={s.timelineRow}>
      {/* Timeline Connector Graphics */}
      <View style={s.timelineGraphics}>
        {/* Connection line */}
        <LinearGradient
          colors={isLast ? [`${Colors.primary}66`, 'rgba(255,255,255,0.01)'] : [`${Colors.primary}66`, `${Colors.primary}1A`]}
          style={[s.timelineLine, isLast && { height: 28 }]}
        />
        {/* Holographic Glowing Dot */}
        <View style={[s.timelineDotOuter, { borderColor: `${Colors.primary}4D` }]}>
          <LinearGradient
            colors={Gradients.holo}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.timelineDotInner}
          />
        </View>
      </View>

      {/* Card Content Outer */}
      <View style={s.cardOuter}>
        {/* Behind buttons */}
        <View style={s.cardBehind}>
          <TouchableOpacity style={[s.behindBtn, { backgroundColor: `${Colors.primary}D9` }]} onPress={() => { closeActions(); onLock(); }}>
            <ShieldIcon color="#FFF" />
            <Text style={s.behindBtnText}>Lock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.behindBtn, s.behindBtnRight, { backgroundColor: `${Colors.error}D9` }]} onPress={() => { closeActions(); onDelete(); }}>
            <TrashIcon color="#FFF" />
            <Text style={s.behindBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Card */}
        <Animated.View style={{ transform: [{ translateX }] }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => { if (swiped) { closeActions(); } else { onPress(); } }}
            onLongPress={() => { if (swiped) { closeActions(); return; } openActions(); }}
            delayLongPress={300}
            style={[s.docCard, isSelected && s.docCardSelected]}
          >
            {/* Checkbox */}
            {selectionMode && (
              <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
                {isSelected && <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>✓</Text>}
              </View>
            )}

            {/* Thumbnail / SVG Radial Glow */}
            <View style={s.thumbContainer}>
              <View style={s.thumbWrap}>
                <RadialGlow color={typeColor} size={48} />
                {doc.imageUri ? (
                  <Image source={{ uri: doc.imageUri }} style={s.thumb} resizeMode="cover" />
                ) : (
                  <DocIcon color={typeColor} />
                )}
              </View>
            </View>

            {/* Content */}
            <View style={s.cardContent}>
              <View style={s.cardHeaderRow}>
                <Text style={s.cardName} numberOfLines={1}>{doc.filename || 'Untitled'}</Text>
                <View style={[s.typePill, { borderColor: `${typeColor}30` }]}>
                  <Text style={[s.typePillText, { color: typeColor }]}>{(doc.type || 'unknown').replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>
              
              {/* Extra extracted entities as badges */}
              <View style={s.cardEntitiesRow}>
                {doc.entities && doc.entities.slice(0, 3).map((e, idx) => (
                  <View key={idx} style={s.entityBadge}>
                    <Text style={s.entityBadgeText} numberOfLines={1}>{e.value}</Text>
                  </View>
                ))}
                {!doc.entities?.length && (
                  <Text style={s.cardDate}>{doc.uploadedAt ? formatDate(doc.uploadedAt) : '—'}</Text>
                )}
              </View>
            </View>

            {!selectionMode && <ChevronRight />}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ hasFilter }: { hasFilter: boolean }) => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyIcon}>
        <DocIcon color={Colors.primary} />
      </View>
      <Text style={s.emptyTitle}>{hasFilter ? 'No results found' : 'No documents yet'}</Text>
      <Text style={s.emptySub}>
        {hasFilter ? 'Try a different search or filter.' : 'Scan or upload your first document to get started.'}
      </Text>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);

  const insets = useSafeAreaInsets();
  const rawFolders = useDocStore((state) => state.folders);
  const allDocuments = useDocStore((state) => state.documents);
  const currentUserKey = useDocStore((state) => state.currentUserKey);
  const addFolder = useDocStore((state) => state.addFolder);
  const removeDocument = useDocStore((state) => state.removeDocument);
  const toggleLock = useDocStore((state) => state.toggleLock);
  const getVisibleDocuments = useDocStore((state) => state.getVisibleDocuments);
  const removeFolder = useDocStore((state) => state.removeFolder);
  const updateFolder = useDocStore((state) => state.updateFolder);

  const folders = React.useMemo(() => {
    const key = currentUserKey?.trim().toLowerCase() || 'guest';
    return rawFolders.filter(f => (f.ownerKey?.trim().toLowerCase() || 'guest') === key);
  }, [rawFolders, currentUserKey]);

  const allDocs = React.useMemo(() => {
    const key = currentUserKey?.trim().toLowerCase() || 'guest';
    return allDocuments.filter(d => (d.ownerKey?.trim().toLowerCase() || 'guest') === key);
  }, [allDocuments, currentUserKey]);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleFolderLongPress = (folder: any) => {
    showCustomAlert('Manage Folder', `What would you like to do with "${folder.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeFolder(folder.id); if (activeFolderId === folder.id) setActiveFolderId(null); } },
      { text: 'Rename', onPress: () => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); } },
    ]);
  };

  const handleRenameFolder = () => {
    if (editingFolderId && editingFolderName.trim()) {
      updateFolder(editingFolderId, { name: editingFolderName.trim() });
      setEditingFolderId(null);
    }
  };

  const handleDelete = (doc: Document) => {
    showCustomAlert('Delete Document', `Delete "${doc.filename}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeDocument(doc.id); notifyActivity(`"${doc.filename}" was permanently deleted.`); } },
    ]);
  };

  const handleLock = (doc: Document) => {
    showCustomAlert('Secure Document?', 'This document will be moved to your Secure Vault and hidden from History.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Move to Vault', onPress: () => { toggleLock(doc.id); notifySecurity(`"${doc.filename}" encrypted and moved to Vault.`); } },
    ]);
  };

  const handleLongPress = (doc: Document) => {
    if (selectionMode) return;
    showCustomAlert('Document Options', `Manage "${doc.filename}"`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Move to Vault', onPress: () => handleLock(doc) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(doc) },
      { text: 'Select Multiple', onPress: () => { setSelectionMode(true); setSelectedIds([doc.id]); } },
    ]);
  };

  const cancelSelection = () => { setSelectionMode(false); setSelectedIds([]); };
  const handleToggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleBulkDelete = () => {
    showCustomAlert('Delete Documents?', `Permanently delete ${selectedIds.length} selected documents?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All', style: 'destructive', onPress: () => { selectedIds.forEach(id => removeDocument(id)); notifyActivity(`${selectedIds.length} documents deleted.`); cancelSelection(); } },
    ]);
  };

  const handleBulkLock = () => {
    showCustomAlert('Lock Documents?', `Move ${selectedIds.length} selected documents to Secure Vault?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Move to Vault', onPress: () => { selectedIds.forEach(id => toggleLock(id)); notifySecurity(`${selectedIds.length} documents moved to Vault.`); cancelSelection(); } },
    ]);
  };

  const filtered = React.useMemo(() => {
    const docs = getVisibleDocuments(false);
    return docs.filter((doc) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !search || (doc.filename || '').toLowerCase().includes(q) || (doc.type || '').toLowerCase().includes(q);
      const matchType = activeFilter === 'all' || doc.type === activeFilter;
      const matchFolder = !activeFolderId || (doc.folderIds || []).includes(activeFolderId);
      return matchSearch && matchType && matchFolder;
    });
  }, [getVisibleDocuments, allDocuments, search, activeFilter, activeFolderId, currentUserKey]);

  // Group Documents dynamically by Uploaded Time (Today, This Week, Earlier)
  const sectionsData = React.useMemo(() => {
    const groups: { label: string; insight: string; data: Document[] }[] = [];
    const now = new Date();
    
    const todayDocs: Document[] = [];
    const thisWeekDocs: Document[] = [];
    const olderDocs: Document[] = [];
    
    filtered.forEach(doc => {
      try {
        const docDate = new Date(doc.uploadedAt);
        const diffTime = Math.abs(now.getTime() - docDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isToday = docDate.toDateString() === now.toDateString();
        
        if (isToday) {
          todayDocs.push(doc);
        } else if (diffDays <= 7) {
          thisWeekDocs.push(doc);
        } else {
          olderDocs.push(doc);
        }
      } catch {
        olderDocs.push(doc);
      }
    });

    // Generate Sparks / Intelligence Insight for group
    const generateInsight = (groupDocs: Document[]) => {
      if (groupDocs.length === 0) return '';
      const counts: Record<string, number> = {};
      let totalSum = 0;
      let hasTotal = false;
      
      groupDocs.forEach(d => {
        counts[d.type] = (counts[d.type] || 0) + 1;
        const totalEntity = d.entities?.find(e => e.type === 'total');
        if (totalEntity) {
          const val = totalEntity.value;
          const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
          if (!isNaN(num)) {
            totalSum += num;
            hasTotal = true;
          }
        }
      });
      
      const typesStr = Object.entries(counts)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');
        
      if (hasTotal) {
        return `${typesStr} · total $${totalSum.toFixed(2)}`;
      }
      return `${groupDocs.length} doc${groupDocs.length > 1 ? 's' : ''} analyzed`;
    };

    if (todayDocs.length > 0) {
      groups.push({
        label: 'Today',
        insight: generateInsight(todayDocs),
        data: todayDocs,
      });
    }
    
    if (thisWeekDocs.length > 0) {
      groups.push({
        label: 'This week',
        insight: generateInsight(thisWeekDocs),
        data: thisWeekDocs,
      });
    }
    
    if (olderDocs.length > 0) {
      groups.push({
        label: 'Earlier',
        insight: generateInsight(olderDocs),
        data: olderDocs,
      });
    }
    
    return groups;
  }, [filtered]);

  return (
    <SwipeableTabWrapper leftRoute="/" rightRoute="/vault">
      <View style={[s.container, { paddingTop: insets.top }]}>
        <AmbientBg />
      {/* Header */}
      <View style={s.header}>
        {selectionMode ? (
          <View style={s.headerRow}>
            <TouchableOpacity onPress={cancelSelection} style={s.cancelBtn}>
              <Text style={s.cancelText}>✕</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>{selectedIds.length} Selected</Text>
            <View style={s.bulkActions}>
              <TouchableOpacity onPress={handleBulkLock} style={s.bulkBtn}>
                <ShieldIcon color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete} style={[s.bulkBtn, { backgroundColor: 'rgba(244,63,94,0.12)' }]}>
                <TrashIcon color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerSubtitle}>MEMORY ARCHIVE</Text>
              <View style={s.titleRow}>
                <Text style={s.headerTitleMain}>Document </Text>
                <Text style={s.headerTitleHighlight}>Intelligence</Text>
              </View>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity onPress={() => setSelectionMode(true)} style={s.headerChip}>
                <Text style={s.headerChipText}>Select</Text>
              </TouchableOpacity>
              {!isCreatingFolder && (
                <TouchableOpacity onPress={() => setIsCreatingFolder(true)} style={[s.headerChip, s.headerChipPrimary]}>
                  <Text style={[s.headerChipText, { color: '#FFF' }]}>+ Folder</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Folder create input */}
      {isCreatingFolder && (
        <View style={s.folderInputWrap}>
          <TextInput
            style={s.folderInput}
            placeholder="Folder name..."
            placeholderTextColor={Colors.textMuted}
            value={newFolderName}
            onChangeText={setNewFolderName}
            autoFocus
          />
          <TouchableOpacity onPress={() => setIsCreatingFolder(false)} style={s.folderCancelBtn}>
            <Text style={s.folderCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddFolder} style={s.folderAddBtn}>
            <Text style={s.folderAddText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Folder rename input */}
      {editingFolderId && (
        <View style={s.folderInputWrap}>
          <TextInput
            style={s.folderInput}
            placeholder="New folder name..."
            placeholderTextColor={Colors.textMuted}
            value={editingFolderName}
            onChangeText={setEditingFolderName}
            autoFocus
          />
          <TouchableOpacity onPress={() => setEditingFolderId(null)} style={s.folderCancelBtn}>
            <Text style={s.folderCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRenameFolder} style={[s.folderAddBtn, { backgroundColor: Colors.warning }]}>
            <Text style={s.folderAddText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      {!selectionMode && (
        <View style={s.searchContainer}>
          <View style={s.searchWrap}>
            <SearchIcon />
            <TextInput
              ref={searchInputRef}
              style={s.searchInput}
              placeholder="Search semantically…"
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={{ color: Colors.textMuted, fontSize: 18, marginRight: Spacing.sm }}>×</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.filterIconBtn}>
                <FilterIcon color={Colors.textMuted} size={13} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Folder + Filter Bars */}
      {!selectionMode && (
        <>
          <FolderBar
            activeFolderId={activeFolderId}
            onFolderChange={setActiveFolderId}
            onFolderLongPress={handleFolderLongPress}
            folders={folders}
            allDocsCount={allDocs.length}
            getFolderDocCount={(fid: string) => allDocs.filter(d => (d.folderIds || []).includes(fid)).length}
          />
          <FilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        </>
      )}

      {/* Section List for Timeline */}
      <SectionList
        sections={sectionsData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? { flexGrow: 1 } : { paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section: { label, insight } }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>{label}</Text>
            {insight ? (
              <View style={s.sectionInsight}>
                <SparklesIcon color={Colors.primary} size={11} />
                <Text style={s.sectionInsightText}>{insight}</Text>
              </View>
            ) : null}
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <SwipeableDocCard
            doc={item}
            isLast={index === section.data.length - 1}
            isSelected={selectedIds.includes(item.id)}
            selectionMode={selectionMode}
            onPress={() => selectionMode ? handleToggleSelect(item.id) : router.push(`/results?docId=${item.id}&imageUri=${encodeURIComponent(item.imageUri)}`)}
            onDelete={() => handleDelete(item)}
            onLock={() => handleLock(item)}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        ListEmptyComponent={<EmptyState hasFilter={!!(search || activeFilter !== 'all')} />}
      />
      </View>
    </SwipeableTabWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (Colors: any, Gradients: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSubtitle: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  headerTitleMain: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  headerTitleHighlight: { color: Colors.primary, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  headerTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', letterSpacing: -0.5, flex: 1 },
  cancelBtn: { marginRight: Spacing.md, width: 28 },
  cancelText: { color: Colors.error, fontSize: 16, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 6 },
  headerChip: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.lg,
  },
  headerChipPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  headerChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  bulkActions: { flexDirection: 'row', gap: 8 },
  bulkBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(59,232,172,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  folderInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    height: 48,
    gap: Spacing.md,
  },
  folderInput: { flex: 1, color: Colors.textPrimary, fontSize: 14, fontWeight: '500' },
  folderCancelBtn: { paddingHorizontal: 4 },
  folderCancelText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  folderAddBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.md },
  folderAddText: { color: '#000', fontSize: 12, fontWeight: '700' },

  searchContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    height: 46,
    gap: Spacing.md,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14, fontWeight: '400' },
  filterIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterPill: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  filterPillActive: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  filterText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
  filterTextActive: { fontSize: 12, fontWeight: '700', color: '#000' },

  folderPill: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minWidth: 90,
    alignItems: 'center',
  },
  folderPillActive: {
    backgroundColor: 'rgba(59,232,172,0.1)',
    borderColor: 'rgba(59,232,172,0.3)',
  },
  folderName: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  folderNameActive: { color: Colors.primary },
  folderCount: { color: Colors.textMuted, fontSize: 9, fontWeight: '500', marginTop: 1 },

  // Sections Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionLabel: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  sectionInsight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionInsightText: { color: Colors.textMuted, fontSize: 10, fontWeight: '500' },

  // Timeline & Cards
  timelineRow: {
    flexDirection: 'row',
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.xl,
    marginBottom: Spacing.md,
  },
  timelineGraphics: {
    width: 20,
    alignItems: 'center',
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 9.5,
    top: 0,
    bottom: -Spacing.md, // stretches down to join next item
    width: 1,
  },
  timelineDotOuter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(11,16,32,1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26, // matches center height of card thumbnail
    borderWidth: 1,
    borderColor: 'rgba(59,232,172,0.3)',
  },
  timelineDotInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  cardOuter: {
    flex: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(15,22,40,0.3)',
  },
  cardBehind: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    width: ACTION_BTN_W * 2,
  },
  behindBtn: {
    width: ACTION_BTN_W,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  behindBtnRight: { borderTopRightRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  behindBtnText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1424', // Solid dark color hides the buttons behind
    padding: Spacing.base,
    gap: Spacing.md,
  },
  docCardSelected: { backgroundColor: 'rgba(59,232,172,0.06)' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  thumbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbWrap: {
    width: 40,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },

  cardContent: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cardName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600', flex: 1 },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  typePillText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  cardEntitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: Spacing.xs },
  entityBadge: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  entityBadgeText: { color: Colors.textSecondary, fontSize: 9, fontWeight: '500' },
  cardDate: { color: Colors.textMuted, fontSize: 11, fontWeight: '500' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59,232,172,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(59,232,172,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});

