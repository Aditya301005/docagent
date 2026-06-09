import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  FlatList,
  TextInput,
  Linking,
  useColorScheme,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useDocStore } from '../store/useDocStore';
import { useDocumentApi } from '../hooks/useDocumentApi';
import { notifySuccess, notifyError, notifyExport } from '../utils/notifications';
import { findDuplicate } from '../utils/duplicateDetection';
import { Spacing, Radius, Typography } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { ScannerSkeleton } from '../components/ScannerSkeleton';
import { Document, DocumentType, Entity } from '../types';
import Markdown from 'react-native-markdown-display';
import { showCustomAlert } from '../components/CustomAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveDocumentToServer } from '../utils/syncDocuments';

const getMarkdownStyles = (Colors: any) => ({
  body: { color: 'rgba(248,250,252,0.8)', fontSize: 14, lineHeight: 22 },
  strong: { color: Colors.primaryLight, fontWeight: 'bold' as const },
  em: { color: Colors.textSecondary, fontStyle: 'italic' as const },
  list_item: { marginBottom: 4 },
  bullet_list: { marginLeft: 0 },
});

const { width: W } = Dimensions.get('window');

// ── SVGs & Icons ─────────────────────────────────────────────────────────────

const BackIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={Colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const ShareIconSvg = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke={Colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const CopyIcon = ({ color = '#9CA3AF' }: { color?: string }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z" stroke={color} strokeWidth={2} />
    <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth={2} />
  </Svg>
);

const PhoneIcon = ({ color = '#10B981' }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.6 19.79 19.79 0 010 2.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MailIcon = ({ color = '#00C896' }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth={2} />
    <Path d="M22 6l-10 7L2 6" stroke={color} strokeWidth={2} />
  </Svg>
);

const MapPinIcon = ({ color = '#F59E0B' }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={color} strokeWidth={2} />
    <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={2} />
  </Svg>
);

const BellIcon = ({ color = '#EC4899' }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SparklesIcon = ({ color, size = 14 }: { color?: string, size?: number }) => {
  const { Colors } = useThemeStore();
  const strokeColor = color || Colors.primary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9.813 15.904L9 21L8.188 15.904L3 15L8.188 14.096L9 9L9.813 14.096L15 15L9.813 15.904Z" fill={strokeColor} />
      <Path d="M19.071 7.071L18.5 10.5L17.929 7.071L14.5 6.5L17.929 5.929L18.5 2.5L19.071 5.929L22.5 6.5L19.071 7.071Z" fill={strokeColor} />
    </Svg>
  );
};

const getEntityIconColor = (type: string, Colors: any) => {
  const map: Record<string, string> = {
    company: Colors.secondary,
    date: Colors.primary,
    total: Colors.primary,
    address: Colors.accent,
    name: '#EC4899',
    phone: '#10B981',
    email: Colors.secondary,
  };
  return map[type] || Colors.textMuted;
};

// ─── Radial Glow SVG ─────────────────────────────────────────────────────────

const RadialGlow = ({ color, size = 40 }: { color: string; size?: number }) => (
  <Svg style={StyleSheet.absoluteFill} width={size} height={size} viewBox="0 0 40 40">
    <Defs>
      <RadialGradient id={`glow-res-${color.replace('#', '')}`} cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0%" stopColor={color} stopOpacity={0.4} />
        <Stop offset="100%" stopColor={color} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Circle cx={20} cy={20} r={20} fill={`url(#glow-res-${color.replace('#', '')})`} />
  </Svg>
);

type EntityAction = 'call' | 'email' | 'maps' | 'reminder' | null;
const getEntityAction = (t: string): EntityAction => {
  const lower = t.toLowerCase();
  if (lower.includes('phone') || lower.includes('tel')) return 'call';
  if (lower.includes('email') || lower.includes('e-mail')) return 'email';
  if (lower.includes('address') || lower.includes('location') || lower.includes('company')) return 'maps';
  if (lower.includes('date') || lower.includes('time')) return 'reminder';
  return null;
};

const getActionMeta = (action: string | null, Colors: any) => {
  if (!action) return null;
  const map: Record<string, { label: string; color: string }> = {
    call:     { label: 'Call',   color: '#10B981' },
    email:    { label: 'Email',  color: Colors.secondary },
    maps:     { label: 'Maps',   color: '#F59E0B' },
    reminder: { label: 'Remind', color: '#EC4899' },
  };
  return map[action];
};

const ActionIcon = ({ action }: { action: EntityAction }) => {
  const { Colors } = useThemeStore();
  const meta = getActionMeta(action, Colors);
  if (!meta) return null;
  if (action === 'call')     return <PhoneIcon  color={meta.color} />;
  if (action === 'email')    return <MailIcon   color={meta.color} />;
  if (action === 'maps')     return <MapPinIcon color={meta.color} />;
  if (action === 'reminder') return <BellIcon   color={meta.color} />;
  return null;
};

export default function ResultsScreen() {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);

  const { imageUri, filename, mimeType, docId, pages: pagesParam } = useLocalSearchParams<{
    imageUri: string;
    filename?: string;
    mimeType?: string;
    docId?: string;
    pages?: string;
  }>();

  const batchPages: string[] = React.useMemo(() => {
    if (pagesParam) {
      try { return JSON.parse(pagesParam); } catch { return []; }
    }
    return [];
  }, [pagesParam]);

  const { processDocument: runDocumentProcessing } = useDocumentApi();
  
  // Load existing doc synchronously to prevent UI jitter
  const initialDoc = docId ? useDocStore.getState().getById(docId) : null;
  
  const [loading, setLoading] = useState(!initialDoc && !!imageUri);
  const [error, setError] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<Document | null>(initialDoc || null);
  const [pageIndex, setPageIndex] = useState(0);
  const [notesText, setNotesText] = useState(initialDoc?.notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [copiedEntityIndex, setCopiedEntityIndex] = useState<number | null>(null);

  const rawFolders = useDocStore((state) => state.folders);
  const currentUserKey = useDocStore((state) => state.currentUserKey);
  const updateDoc = useDocStore((state) => state.updateDocument);
  const allDocuments = useDocStore((state) => state.documents);

  const folders = React.useMemo(() => {
    const key = currentUserKey?.trim().toLowerCase() || 'guest';
    return rawFolders.filter((f) => (f.ownerKey?.trim().toLowerCase() || 'guest') === key);
  }, [rawFolders, currentUserKey]);

  const relatedDocs = React.useMemo(() => {
    if (!documentData) return [];
    const key = currentUserKey?.trim().toLowerCase() || 'guest';
    return allDocuments.filter(
      (d) => d.id !== documentData.id &&
        d.type === documentData.type &&
        (d.ownerKey?.trim().toLowerCase() || 'guest') === key
    ).slice(0, 4);
  }, [allDocuments, documentData, currentUserKey]);

  useEffect(() => {
    if (initialDoc) return; // Already loaded synchronously

    if (imageUri && !docId) {
      processDocument();
    } else if (!initialDoc) {
      setError('No image provided.');
      setLoading(false);
    }
  }, [imageUri, docId]);

  const processDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      const processed = await runDocumentProcessing(imageUri, {
        filename,
        mimeType,
      });
      const classifyResult = processed.classification;
      let extractResult = processed.entities || [];
      const structuredData = (processed as any).structured_data;

      if (extractResult.length === 0 && structuredData?.csv_export_data?.length > 0) {
        extractResult = structuredData.csv_export_data.map((item: any) => {
          let t = (item.category || item.field || 'other').toLowerCase();
          if (t === 'organization') t = 'company';
          if (t === 'invoice_number') t = 'invoice';
          if (t === 'payment_terms') t = 'terms';
          return {
            type: t.length > 15 ? t.substring(0, 15) : t,
            value: item.value,
            confidence: 0.95
          };
        });
      }

      const newDoc: Document = {
        id: Date.now().toString(),
        ownerKey: currentUserKey,
        imageUri,
        pages: batchPages.length > 1 ? batchPages : undefined,
        filename: filename || `scan_${Date.now()}.jpg`,
        mimeType,
        uploadedAt: new Date().toISOString(),
        status: 'done',
        type: (classifyResult?.class || processed.doc_type || 'unknown') as DocumentType,
        confidence: classifyResult?.confidence ?? processed.confidence ?? 0,
        entities: extractResult,
        structuredData: structuredData,
        rawText: processed.raw_text || 'No raw text available.',
      };

      setDocumentData(newDoc);
      setNotesText('');

      const allDocs = useDocStore.getState().documents.filter(
        (d) => (d.ownerKey || 'guest') === (currentUserKey || 'guest')
      );
      const duplicate = findDuplicate(newDoc, allDocs);

      if (duplicate) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showCustomAlert(
          '⚠️ Possible Duplicate Found',
          `This document looks ${Math.round(duplicate.score * 100)}% similar to "${duplicate.doc.filename}". Save anyway?`,
          [
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => router.back(),
            },
            {
              text: 'Save Anyway',
              onPress: async () => {
                useDocStore.getState().addDocument(newDoc);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                notifySuccess(`Saved (duplicate of "${duplicate.doc.filename}").`);
                // Sync to server (fire-and-forget)
                const token = await AsyncStorage.getItem('auth_token');
                if (token && token !== 'guest') {
                  saveDocumentToServer(token, imageUri, newDoc);
                }
              },
            },
          ]
        );
      } else {
        useDocStore.getState().addDocument(newDoc);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notifySuccess(`Successfully extracted data.`);
        // ── Sync to server (fire-and-forget) ─────────────────────────────
        // Persist the processed document to the backend database so it
        // survives app reinstalls / data clears.
        const token = await AsyncStorage.getItem('auth_token');
        if (token && token !== 'guest') {
          saveDocumentToServer(token, imageUri, newDoc);
        }
        // ─────────────────────────────────────────────────────────────────
      }

    } catch (err: any) {
      console.error('Processing error:', err);
      setDocumentData(null);
      setError('Failed to process document.');
      notifyError('Could not process the document.');
    } finally {
      setLoading(false);
    }
  };

  const handleEntityAction = async (entity: Entity) => {
    const action = getEntityAction(entity.type);
    if (!action) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action === 'call') {
      const url = `tel:${entity.value.replace(/\s/g, '')}`;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else showCustomAlert('Cannot open phone app', entity.value);
    } else if (action === 'email') {
      const url = `mailto:${entity.value}`;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else showCustomAlert('Cannot open mail app', entity.value);
    } else if (action === 'maps') {
      await Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(entity.value)}`);
    } else if (action === 'reminder') {
      handleSetReminder(entity.value);
    }
  };

  const handleSetReminder = async (dateStr: string) => {
    showCustomAlert('🔔 Set Reminder', `Set a reminder for: "${dateStr}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Set Reminder',
        onPress: async () => {
          try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
              showCustomAlert('Permission Required', 'Enable notifications in device settings.');
              return;
            }
            const trigger = new Date();
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime()) && parsed > new Date()) {
              trigger.setTime(parsed.getTime());
              trigger.setHours(9, 0, 0, 0);
            } else {
              trigger.setDate(trigger.getDate() + 1);
              trigger.setHours(9, 0, 0, 0);
            }
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '📄 DocAgent Reminder',
                body: `${documentData?.filename || 'Document'} — ${dateStr}`,
                data: { docId: documentData?.id },
              },
              trigger: { date: trigger } as any,
            });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showCustomAlert('✅ Reminder Set', `Reminder scheduled.`);
          } catch (e) {
            showCustomAlert('Error', 'Could not set reminder.');
          }
        },
      },
    ]);
  };

  const handleCopyAllFields = async () => {
    if (!documentData?.structuredData?.csv_export_data) return;
    const textToCopy = documentData.structuredData.csv_export_data.map((item: any) => `${item.field}: ${item.value}`).join('\n');
    await Clipboard.setStringAsync(textToCopy);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showCustomAlert('Copied', 'All fields copied to clipboard.');
  };

  const handleCopyEntity = async (entity: Entity, index: number) => {
    await Clipboard.setStringAsync(entity.value);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopiedEntityIndex(index);
    setTimeout(() => setCopiedEntityIndex(null), 2000);
  };

  const handleSaveNotes = async () => {
    if (!documentData) return;
    updateDoc(documentData.id, { notes: notesText });
    setDocumentData({ ...documentData, notes: notesText });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2500);
  };

  const handleExportCSV = async () => {
    if (!documentData) return;
    try {
      const safeName = (documentData.filename || 'export').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const metaRows = [
        `"DOCUMENT REPORT"`,
        `""`,
        `"File Name","${(documentData.filename || '').replace(/"/g, '""')}"`,
        `"Document Type","${(documentData.type || '').replace(/_/g, ' ')}"`,
        `"Scan Date","${documentData.uploadedAt ? new Date(documentData.uploadedAt).toLocaleString() : ''}"`,
        `"Status","${documentData.status || ''}"`,
        `"Notes","${(documentData.notes || '').replace(/"/g, '""')}"`,
        `""`,
        `"EXTRACTED FIELDS"`,
        `"Field","Value"`,
      ];

      let entityRows: string[] = [];
      if (documentData.structuredData?.csv_export_data?.length) {
        entityRows = documentData.structuredData.csv_export_data.map(
          (e: any) => `"${e.field || ''}","${(e.value || '').replace(/"/g, '""')}","${e.category || ''}"`
        );
        metaRows[metaRows.length - 1] = `"Field","Value","Category"`;
      } else {
        entityRows = (documentData.entities || []).map(
          (e) => `"${e.type}","${e.value.replace(/"/g, '""')}"`
        );
      }

      const csv = [...metaRows, ...entityRows].join('\n');
      const { StorageAccessFramework } = FileSystem;
      if (StorageAccessFramework) {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          showCustomAlert('Permission Denied', 'Storage access was denied.');
          return;
        }
        const savedUri = await StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          `${safeName}.csv`,
          'text/csv'
        );
        await FileSystem.writeAsStringAsync(savedUri, csv, { encoding: 'utf8' });
        showCustomAlert('Downloaded! ✅', `${safeName}.csv has been saved.`);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${safeName}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });
        showCustomAlert('Downloaded! ✅', `${safeName}.csv saved in Files app.`);
      }
      notifyExport(`${safeName}.csv downloaded.`);
    } catch (e) {
      showCustomAlert('CSV Export Failed', 'Could not generate CSV.');
    }
  };

  const handleShare = async () => {
    if (!documentData) return;
    try {
      const exportPayload = {
        filename: documentData.filename,
        type: documentData.type,
        confidence: documentData.confidence,
        uploadedAt: documentData.uploadedAt,
        entities: documentData.entities,
        rawText: documentData.rawText,
      };
      const jsonString = JSON.stringify(exportPayload, null, 2);
      const safeName = (documentData.filename || 'export').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileUri = `${FileSystem.cacheDirectory}${safeName}.json`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: 'utf8' });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showCustomAlert('Sharing not available', 'Device does not support file sharing.');
        return;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: `Share ${safeName}.json`,
        UTI: 'public.json',
      });
      notifyExport('JSON shared successfully.');
    } catch (error) {
      showCustomAlert('Share Failed', 'Could not share JSON.');
    }
  };

  const handleDownload = async () => {
    if (!documentData) return;
    try {
      const exportPayload = {
        filename: documentData.filename,
        type: documentData.type,
        confidence: documentData.confidence,
        uploadedAt: documentData.uploadedAt,
        entities: documentData.entities,
        rawText: documentData.rawText,
      };
      const jsonString = JSON.stringify(exportPayload, null, 2);
      const safeName = (documentData.filename || 'export').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const { StorageAccessFramework } = FileSystem;

      if (StorageAccessFramework) {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          showCustomAlert('Permission Denied', 'Storage access denied.');
          return;
        }
        const savedUri = await StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          `${safeName}.json`,
          'application/json'
        );
        await FileSystem.writeAsStringAsync(savedUri, jsonString, { encoding: 'utf8' });
        showCustomAlert('Downloaded! ✅', `${safeName}.json saved.`);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${safeName}.json`;
        await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: 'utf8' });
        showCustomAlert('Downloaded! ✅', `${safeName}.json saved in Files app.`);
      }
      notifyExport(`${safeName}.json downloaded.`);
    } catch (error) {
      showCustomAlert('Download Failed', 'Could not save the JSON file.');
    }
  };

  const handleAskQuestion = () => {
    if (documentData) {
      router.push(`/qa?docId=${documentData.id}`);
    }
  };

  const handleSelectFolder = (fId: string) => {
    if (!documentData) return;
    const currentFolders = documentData.folderIds || [];
    const isSelected = currentFolders.includes(fId);
    const newFolderIds = isSelected 
      ? currentFolders.filter(id => id !== fId)
      : [...currentFolders, fId];

    setDocumentData({ ...documentData, folderIds: newFolderIds });
    updateDoc(documentData.id, { folderIds: newFolderIds });
  };

  const handleCopyRawText = async () => {
    if (!documentData?.rawText) return;
    await Clipboard.setStringAsync(documentData.rawText);
    showCustomAlert('Copied', 'Raw text copied to clipboard.');
  };

  const handleExportRawText = async () => {
    if (!documentData?.rawText) return;
    try {
      const fileUri = `${FileSystem.cacheDirectory}raw_text.txt`;
      await FileSystem.writeAsStringAsync(fileUri, documentData.rawText, { encoding: 'utf8' });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: 'Share Raw Text' });
      notifyExport('Text ready to share.');
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenDocument = async () => {
    if (!imageUri) return;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showCustomAlert('Not available', 'Document opening not supported.');
        return;
      }
      await Sharing.shareAsync(imageUri, { dialogTitle: 'Open Document' });
    } catch (e) {
      showCustomAlert('Error', 'Could not open the document.');
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Top Bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)' as any)} style={s.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Extraction Results</Text>
        <TouchableOpacity onPress={handleShare} style={s.iconBtn}>
          <ShareIconSvg />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 220 }}>
        {/* Page Carousel (batch) or single preview */}
        {mimeType !== 'application/pdf' && (
          batchPages.length > 1 ? (
            <View style={s.previewArea}>
              <FlatList
                data={batchPages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                onMomentumScrollEnd={(e) => {
                  setPageIndex(Math.round(e.nativeEvent.contentOffset.x / W));
                }}
                renderItem={({ item }) => (
                  <View style={s.carouselItem}>
                    <Image source={{ uri: item }} style={s.carouselImage} resizeMode="contain" />
                  </View>
                )}
              />
              <View style={s.pageIndicators}>
                {batchPages.map((_, i) => (
                  <View key={i} style={[s.dot, i === pageIndex && s.dotActive]} />
                ))}
              </View>
              <Text style={s.pageLabel}>
                Page {pageIndex + 1} of {batchPages.length}
              </Text>
              <View style={{ alignItems: 'center', paddingBottom: Spacing.md }}>
                <TouchableOpacity onPress={handleOpenDocument} style={s.viewFileBtn}>
                  <Text style={s.viewFileText}>👁️ View Original Files</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : imageUri ? (
            <View style={s.previewAreaSingle}>
              <View style={s.imageFrame}>
                <Image source={{ uri: imageUri }} style={s.singleImage} resizeMode="cover" />
              </View>
              <TouchableOpacity onPress={handleOpenDocument} style={s.viewFileBtn}>
                <Text style={s.viewFileText}>👁️ View Original Image</Text>
              </TouchableOpacity>
            </View>
          ) : null
        )}
        {!!imageUri && mimeType === 'application/pdf' && (
          <View style={s.previewAreaSingle}>
            <View style={s.pdfIconBox}>
              <Text style={{ fontSize: 36 }}>📄</Text>
            </View>
            <Text style={s.pdfTitle}>PDF Document</Text>
            <Text style={s.pdfSubtitle} numberOfLines={1}>{filename || 'document.pdf'}</Text>
            <TouchableOpacity onPress={handleOpenDocument} style={s.viewFileBtn}>
              <Text style={s.viewFileText}>👁️ View Original PDF</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error State */}
        {error ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: Colors.error, marginBottom: 16, textAlign: 'center' }}>{error}</Text>
            <TouchableOpacity onPress={processDocument} style={s.retryBtn}>
              <Text style={{ color: '#000', fontWeight: 'bold' }}>Retry Extraction</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <ScannerSkeleton />
        ) : documentData ? (
          <View style={{ padding: Spacing.xl }}>
            {/* Classification Card */}
            <View style={s.classCardOuter}>
              <LinearGradient
                colors={Gradients.holo}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={s.classCardGlowBar}
              />
              <View style={s.classCardInner}>
                <Text style={s.sectionSubtitle}>DOCUMENT TYPE</Text>
                <Text style={s.docTitle}>{documentData.type}</Text>
              </View>
            </View>

            {/* Extracted Information */}
            <Text style={s.sectionTitle}>Extracted Information</Text>
            <View style={s.glassCard}>
              {(() => {
                const importantTypes = ['date', 'total', 'company', 'name', 'invoice_number', 'email', 'phone', 'address', 'tax'];
                const filteredEntities = (documentData.entities || []).filter(e => importantTypes.includes(e.type.toLowerCase()));
                return filteredEntities.length > 0 ? (
                  filteredEntities.map((entity, index) => {
                    const iconColor = getEntityIconColor(entity.type, Colors);
                    const isLast = index === filteredEntities.length - 1;
                    const action = getEntityAction(entity.type);
                    const meta = getActionMeta(action, Colors);
                  return (
                    <View
                      key={index}
                      style={[s.entityRow, !isLast && s.borderBottom]}
                    >
                      {/* SVG Radial Glow Behind Entity Dot */}
                      <View style={s.glowWrapper}>
                        <RadialGlow color={iconColor} size={40} />
                        <View style={[s.entityGlowDot, { backgroundColor: iconColor }]} />
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <Text style={s.entityLabel}>{entity.type.toUpperCase()}</Text>
                        <Text style={s.entityValue} numberOfLines={2}>{entity.value}</Text>
                      </View>
                      
                      <View style={s.entityActionsWrap}>
                        {/* Copy button */}
                        <TouchableOpacity
                          onPress={() => handleCopyEntity(entity, index)}
                          style={s.entityActionBtn}
                        >
                          <CopyIcon color={copiedEntityIndex === index ? Colors.primary : Colors.textMuted} />
                        </TouchableOpacity>
                        
                        {/* Action pill */}
                        {action && (
                          <TouchableOpacity
                            onPress={() => handleEntityAction(entity)}
                            style={[s.actionPill, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }]}
                          >
                            <ActionIcon action={action} />
                            <Text style={[s.actionPillText, { color: meta?.color }]}>
                              {meta?.label}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                  })
                ) : (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: Colors.textMuted }}>No important entities extracted.</Text>
                  </View>
                );
              })()}
            </View>

            {/* Enterprise Structured Data */}
            {documentData.structuredData && (
              <>
                {/* Summary */}
                {!!documentData.structuredData.summary?.short_summary && (
                  <View style={s.glassCard}>
                    <View style={s.cardHeader}>
                      <SparklesIcon color={Colors.primary} size={13} />
                      <Text style={s.cardHeaderTitle}>Summary Insights</Text>
                    </View>
                    <View style={s.cardBody}>
                      <Markdown style={getMarkdownStyles(Colors)}>
                        {documentData.structuredData.summary.short_summary}
                      </Markdown>
                      {documentData.structuredData.summary.key_points?.map((pt: string, idx: number) => (
                        <View key={idx} style={s.bulletRow}>
                          <Text style={s.bullet}>•</Text>
                          <Text style={s.bulletText}>{pt}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Financial Information */}
                {!!documentData.structuredData.financial_information?.total_amount && (
                  <View style={s.glassCard}>
                    <View style={[s.cardHeader, { backgroundColor: 'rgba(59,232,172,0.03)' }]}>
                      <Text style={[s.cardHeaderTitle, { color: Colors.primary }]}>Financial Intelligence</Text>
                    </View>
                    <View style={s.cardBody}>
                      <View style={s.finRow}>
                        <Text style={s.finLabel}>Total Amount</Text>
                        <Text style={s.finValueBig}>
                          {documentData.structuredData.financial_information.currency} {documentData.structuredData.financial_information.total_amount}
                        </Text>
                      </View>
                      {!!documentData.structuredData.financial_information.subtotal && (
                        <View style={s.finRowSm}>
                          <Text style={s.finLabelSm}>Subtotal</Text>
                          <Text style={s.finValueSm}>
                            {documentData.structuredData.financial_information.subtotal}
                          </Text>
                        </View>
                      )}
                      {!!documentData.structuredData.financial_information.tax && (
                        <View style={s.finRowSm}>
                          <Text style={s.finLabelSm}>Tax</Text>
                          <Text style={s.finValueSm}>
                            {documentData.structuredData.financial_information.tax}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}



                {/* All Extracted Fields */}
                {documentData.structuredData.csv_export_data?.length > 0 && (
                  <View style={s.glassCard}>
                    <View style={[s.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                      <Text style={s.cardHeaderTitle}>All Fields Table</Text>
                      <TouchableOpacity onPress={handleCopyAllFields} style={{ padding: 4 }}>
                        <CopyIcon color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.cardBody}>
                      {documentData.structuredData.csv_export_data.map((item: any, idx: number) => (
                        <View key={idx} style={[s.finRowSm, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', paddingBottom: 8, marginBottom: 8 }]}>
                          <Text style={s.finLabelSm}>{item.field}</Text>
                          <Text style={s.finValueSm}>{item.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Folder Selection */}
            {folders.length > 0 && (
              <View style={{ marginBottom: Spacing.xl }}>
                <Text style={s.sectionTitle}>Assign to Folder</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {folders.map(f => {
                    const isSelected = (documentData.folderIds || []).includes(f.id);
                    return (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() => handleSelectFolder(f.id)}
                        style={[s.folderPill, isSelected && s.folderPillSelected]}
                      >
                        <Text style={[s.folderPillText, isSelected && { color: '#000' }]}>{f.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Personal Notes */}
            <View style={s.glassCard}>
              <View style={[s.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={s.cardHeaderTitle}>Personal Notes</Text>
                <TouchableOpacity
                  onPress={handleSaveNotes}
                  style={[s.saveNotesBtn, { backgroundColor: notesSaved ? 'rgba(59,232,172,0.12)' : 'rgba(255,255,255,0.04)' }]}
                >
                  <Text style={[s.saveNotesText, { color: notesSaved ? Colors.primary : Colors.textSecondary }]}>
                    {notesSaved ? '✓ Saved' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={notesText}
                onChangeText={setNotesText}
                placeholder="Add annotation notes here..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                style={s.notesInput}
              />
            </View>

            {/* Related Documents */}
            {relatedDocs.length > 0 && (
              <View style={{ marginBottom: Spacing.xl }}>
                <Text style={s.sectionTitle}>Related Documents</Text>
                <View style={s.glassCard}>
                  {relatedDocs.map((rd, i) => (
                    <TouchableOpacity
                      key={rd.id}
                      onPress={() => router.push(`/results?docId=${rd.id}` as any)}
                      style={[s.relatedRow, i < relatedDocs.length - 1 && s.borderBottom]}
                    >
                      <View style={s.relatedIcon}>
                        <Text style={{ fontSize: 15 }}>📄</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.relatedTitle} numberOfLines={1}>{rd.filename}</Text>
                        <Text style={s.relatedDate}>
                          {new Date(rd.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Raw Text */}
            <View style={s.glassCard}>
              <View style={s.cardBody}>
                <Text style={[s.sectionTitle, { marginBottom: Spacing.md }]}>Document Raw Text</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={handleCopyRawText} style={s.rawBtn} activeOpacity={0.8}>
                    <Text style={s.rawBtnText}>📋 Copy OCR Text</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleExportRawText} style={s.rawBtn} activeOpacity={0.8}>
                    <Text style={s.rawBtnText}>⬇ Export Text</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Sticky Bar actions */}
      {documentData && (
        <View style={s.bottomSticky}>
          <TouchableOpacity onPress={handleAskQuestion} activeOpacity={0.8} style={s.askBtn}>
            <LinearGradient
              colors={Gradients.holo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.askBtnGradient}
            >
              <Text style={s.askBtnText}>Ask AI about this Document</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={handleDownload} activeOpacity={0.8} style={s.dlBtnJSON}>
              <Text style={s.dlBtnTextJSON}>JSON Schema</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleExportCSV} activeOpacity={0.8} style={s.dlBtnCSV}>
              <Text style={s.dlBtnTextCSV}>CSV Table</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Loading Overlay is removed since ScannerSkeleton is used inline */}
    </SafeAreaView>
  );
}

const getStyles = (Colors: any, Gradients: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    backgroundColor: Colors.bg,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  
  previewArea: { backgroundColor: 'rgba(6,9,20,0.4)', paddingBottom: Spacing.md },
  carouselItem: { width: W, height: W * 0.65, alignItems: 'center', justifyContent: 'center' },
  carouselImage: { width: W * 0.9, height: '100%', borderRadius: Radius.xl },
  pageIndicators: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 6, gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { width: 14, backgroundColor: Colors.primary },
  pageLabel: { textAlign: 'center', color: Colors.textMuted, fontSize: 11, paddingBottom: 6 },
  viewFileBtn: { backgroundColor: 'rgba(59,232,172,0.1)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.md },
  viewFileText: { color: Colors.primary, fontWeight: '600', fontSize: 12 },
  
  previewAreaSingle: { padding: Spacing.base, alignItems: 'center', backgroundColor: 'rgba(6,9,20,0.3)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  imageFrame: {
    width: W * 0.44,
    height: W * 0.6,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  singleImage: { width: '100%', height: '100%' },
  pdfIconBox: { width: 80, height: 104, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  pdfTitle: { color: Colors.textPrimary, fontWeight: '600', fontSize: 13 },
  pdfSubtitle: { color: Colors.textMuted, fontSize: 11, marginTop: 2, marginBottom: 12 },
  
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.lg },
  
  // Classification header card
  classCardOuter: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(15,22,40,0.3)',
    marginBottom: Spacing.xl,
  },
  classCardGlowBar: {
    width: 4,
  },
  classCardInner: {
    flex: 1,
    padding: Spacing.base,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: Spacing.md },
  sectionSubtitle: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginBottom: 4 },
  docTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', textTransform: 'capitalize' },
  
  // Glass card containers
  glassCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(15,22,40,0.25)',
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  cardHeaderTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  cardBody: { padding: Spacing.base },
  
  // Entity lists
  entityRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  glowWrapper: {
    position: 'relative',
    width: 40,
    height: 40,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityGlowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
  },
  entityLabel: { color: Colors.textMuted, fontSize: 8, fontWeight: '600', letterSpacing: 1, marginBottom: 1 },
  entityValue: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  entityActionsWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entityActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
  },
  actionPillText: { fontSize: 9, fontWeight: '700' },
  
  summaryText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: Spacing.md },
  bulletRow: { flexDirection: 'row', marginBottom: 6 },
  bullet: { color: Colors.primary, marginRight: 6 },
  bulletText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, flex: 1 },
  
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  finLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  finValueBig: { color: Colors.primary, fontSize: 18, fontWeight: '800' },
  finRowSm: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  finLabelSm: { color: Colors.textMuted, fontSize: 12 },
  finValueSm: { color: Colors.textPrimary, fontSize: 12, fontWeight: '600' },
  
  riskMissingWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(244,63,94,0.15)' },
  riskMissingTitle: { color: Colors.error, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  
  folderPill: {
    paddingHorizontal: 12,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  folderPillSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  folderPillText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  
  saveNotesBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  saveNotesText: { fontSize: 10, fontWeight: '700' },
  notesInput: { padding: Spacing.base, fontSize: 13, color: Colors.textPrimary, minHeight: 72, textAlignVertical: 'top', backgroundColor: 'rgba(255,255,255,0.02)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  
  relatedRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: 12, gap: 10 },
  relatedIcon: { width: 32, height: 32, borderRadius: Radius.md, backgroundColor: 'rgba(192,132,252,0.15)', alignItems: 'center', justifyContent: 'center' },
  relatedTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600', flex: 1 },
  relatedDate: { color: Colors.textMuted, fontSize: 10, marginTop: 1 },
  
  rawBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingVertical: 10, borderRadius: Radius.lg },
  rawBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  
  bottomSticky: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(11,16,32,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: Spacing.xl,
    gap: 8,
  },
  askBtn: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  askBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
  dlBtnJSON: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  dlBtnTextJSON: { color: Colors.textSecondary, fontWeight: '700', fontSize: 12 },
  dlBtnCSV: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  dlBtnTextCSV: { color: '#000', fontWeight: '700', fontSize: 12 },
});

