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
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useDocStore } from '../store/useDocStore';
import { useDocumentApi } from '../hooks/useDocumentApi';
import { notifySuccess, notifyError, notifyExport } from '../utils/notifications';
import { findDuplicate } from '../utils/duplicateDetection';

import { LoadingOverlay } from '../components/LoadingOverlay';
import { Document, DocumentType, Entity } from '../types';

const { width: W } = Dimensions.get('window');


// ── SVGs ──────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="gray" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShareIconSvg = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="gray" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronDownIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke="#6B7280" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronUpIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 15l-6-6-6 6" stroke="#6B7280" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EntityIconMap: Record<string, string> = {
  company: '#3B82F6', // blue
  date: '#10B981',    // emerald
  total: '#F59E0B',   // amber
  address: '#8B5CF6', // violet
  name: '#EC4899',    // pink
  phone: '#6366F1',   // indigo
  email: '#14B8A6',   // teal
};

const DefaultEntityIconColor = '#9CA3AF';

const CopyIcon = ({ color = '#9CA3AF' }: { color?: string }) => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
    <Path d="M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z" stroke={color} strokeWidth={2} />
    <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth={2} />
  </Svg>
);
const PhoneIcon = ({ color = '#10B981' }: { color?: string }) => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.6 19.79 19.79 0 010 2.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const MailIcon = ({ color = '#6366F1' }: { color?: string }) => (
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

type EntityAction = 'call' | 'email' | 'maps' | 'reminder' | null;
const getEntityAction = (t: string): EntityAction => {
  if (t === 'phone') return 'call';
  if (t === 'email') return 'email';
  if (t === 'address' || t === 'company') return 'maps';
  if (t === 'date') return 'reminder';
  return null;
};
const actionMeta: Record<string, { label: string; color: string }> = {
  call:     { label: 'Call',   color: '#10B981' },
  email:    { label: 'Email',  color: '#6366F1' },
  maps:     { label: 'Maps',   color: '#F59E0B' },
  reminder: { label: 'Remind', color: '#EC4899' },
};
const ActionIcon = ({ action }: { action: EntityAction }) => {
  if (action === 'call')     return <PhoneIcon  color={actionMeta.call.color} />;
  if (action === 'email')    return <MailIcon   color={actionMeta.email.color} />;
  if (action === 'maps')     return <MapPinIcon color={actionMeta.maps.color} />;
  if (action === 'reminder') return <BellIcon   color={actionMeta.reminder.color} />;
  return null;
};

export default function ResultsScreen() {
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
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [rawTextExpanded, setRawTextExpanded] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [notesText, setNotesText] = useState('');
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
    if (docId) {
      const existingDoc = useDocStore.getState().getById(docId);
      if (existingDoc) {
        setDocumentData(existingDoc);
        setNotesText(existingDoc.notes || '');
        setLoading(false);
        return;
      }
    }
    if (imageUri) {
      processDocument();
    } else {
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
      const extractResult = processed.entities || [];

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
        rawText: processed.raw_text || 'No raw text available.',
      };

      setDocumentData(newDoc);
      setNotesText('');

      // ── Duplicate Detection ────────────────────────────────────────────────
      const allDocs = useDocStore.getState().documents.filter(
        (d) => (d.ownerKey || 'guest') === (currentUserKey || 'guest')
      );
      const duplicate = findDuplicate(newDoc, allDocs);

      if (duplicate) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
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
              onPress: () => {
                useDocStore.getState().addDocument(newDoc);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                notifySuccess(`Saved (duplicate of "${duplicate.doc.filename}").`);
              },
            },
          ]
        );
      } else {
        useDocStore.getState().addDocument(newDoc);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        notifySuccess(`Successfully extracted data from ${newDoc.filename}.`);
      }

    } catch (err: any) {
      console.error('Processing error:', err);
      setDocumentData(null);
      setError('Failed to process document. Please ensure the backend is running and returning valid model output.');
      notifyError('Could not process the document. Check your connection or image quality.');
    } finally {
      setLoading(false);
    }
  };

  // ── Tappable Entity Action ────────────────────────────────────────────────
  const handleEntityAction = async (entity: Entity) => {
    const action = getEntityAction(entity.type);
    if (!action) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action === 'call') {
      const url = `tel:${entity.value.replace(/\s/g, '')}`;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else Alert.alert('Cannot open phone app', entity.value);
    } else if (action === 'email') {
      const url = `mailto:${entity.value}`;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else Alert.alert('Cannot open mail app', entity.value);
    } else if (action === 'maps') {
      await Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(entity.value)}`);
    } else if (action === 'reminder') {
      handleSetReminder(entity.value);
    }
  };

  // ── Set Reminder ─────────────────────────────────────────────────────────
  const handleSetReminder = async (dateStr: string) => {
    Alert.alert('🔔 Set Reminder', `Set a reminder for: "${dateStr}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Set Reminder',
        onPress: async () => {
          try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Enable notifications in device settings.');
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
            Alert.alert('✅ Reminder Set', `Reminder for ${trigger.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at 9:00 AM.`);
          } catch (e) {
            Alert.alert('Error', 'Could not set reminder. Please try again.');
          }
        },
      },
    ]);
  };

  // ── Copy Single Entity ────────────────────────────────────────────────────
  const handleCopyEntity = async (entity: Entity, index: number) => {
    await Clipboard.setStringAsync(entity.value);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopiedEntityIndex(index);
    setTimeout(() => setCopiedEntityIndex(null), 2000);
  };

  // ── Save Notes ────────────────────────────────────────────────────────────
  const handleSaveNotes = async () => {
    if (!documentData) return;
    updateDoc(documentData.id, { notes: notesText });
    setDocumentData({ ...documentData, notes: notesText });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2500);
  };

  // ── CSV Export (Download) ─────────────────────────────────────────────────
  const handleExportCSV = async () => {
    if (!documentData) return;
    try {
      const safeName = (documentData.filename || 'export').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

      // ── Header metadata section ──
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

      // ── Entity rows (no confidence) ──
      const entityRows = (documentData.entities || []).map(
        (e) => `"${e.type}","${e.value.replace(/"/g, '""')}"`
      );

      const csv = [...metaRows, ...entityRows].join('\n');

      // ── Save to device ──
      const { StorageAccessFramework } = FileSystem;
      if (StorageAccessFramework) {
        // Android: let user pick save folder
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          Alert.alert('Permission Denied', 'Storage access was denied. Cannot save the file.');
          return;
        }
        const savedUri = await StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          `${safeName}.csv`,
          'text/csv'
        );
        await FileSystem.writeAsStringAsync(savedUri, csv, { encoding: 'utf8' });
        Alert.alert('Downloaded! ✅', `${safeName}.csv has been saved to the selected folder.`);
      } else {
        // iOS: save to documentDirectory (Files app)
        const fileUri = `${FileSystem.documentDirectory}${safeName}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });
        Alert.alert(
          'Downloaded! ✅',
          `${safeName}.csv saved. Find it in the Files app under "On My iPhone" → DocAgent.`
        );
      }
      notifyExport(`${safeName}.csv downloaded.`);
    } catch (e) {
      Alert.alert('CSV Export Failed', 'Could not generate CSV. Please try again.');
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
      const safeName = (documentData.filename || 'export')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileUri = `${FileSystem.cacheDirectory}${safeName}.json`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: 'utf8',
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing not available', 'Your device does not support file sharing.');
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: `Share ${safeName}.json`,
        UTI: 'public.json',
      });

      notifyExport('JSON file shared successfully.');
    } catch (error) {
      console.error('Error sharing JSON file:', error);
      Alert.alert('Share Failed', 'Could not share the JSON file. Please try again.');
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
      const safeName = (documentData.filename || 'export')
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');

      // On Android, use StorageAccessFramework to let user pick a save location (e.g. Downloads)
      // On iOS, save to documentDirectory (accessible via Files app)
      const { StorageAccessFramework } = FileSystem;

      if (StorageAccessFramework) {
        // Android: prompt user to pick a folder
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          Alert.alert('Permission Denied', 'Storage access was denied. Cannot save the file.');
          return;
        }
        const savedUri = await StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          `${safeName}.json`,
          'application/json'
        );
        await FileSystem.writeAsStringAsync(savedUri, jsonString, { encoding: 'utf8' });
        Alert.alert('Downloaded! ✅', `${safeName}.json has been saved to the selected folder.`);
      } else {
        // iOS fallback: save to documentDirectory (visible in Files app)
        const fileUri = `${FileSystem.documentDirectory}${safeName}.json`;
        await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: 'utf8' });
        Alert.alert(
          'Downloaded! ✅',
          `${safeName}.json saved. You can find it in the Files app under "On My iPhone" → DocAgent.`
        );
      }

      notifyExport(`${safeName}.json downloaded to your device.`);
    } catch (error) {
      console.error('Error downloading JSON file:', error);
      Alert.alert('Download Failed', 'Could not save the file to your device. Please try again.');
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
    Alert.alert('Copied', 'Raw text has been copied to your clipboard.');
  };

  const handleExportRawText = async () => {
    if (!documentData?.rawText) return;
    try {
      const fileUri = `${FileSystem.cacheDirectory}raw_text.txt`;
      await FileSystem.writeAsStringAsync(fileUri, documentData.rawText, { encoding: 'utf8' });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: 'Share Raw Text' });
      notifyExport('Text export is ready to share.');
    } catch (error) {
      console.error('Error exporting text:', error);
    }
  };



  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Top Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity onPress={() => router.replace('/(tabs)' as any)} className="p-2">
          <BackIcon />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900 dark:text-white">Extraction Results</Text>
        <TouchableOpacity onPress={handleShare} className="p-2">
          <ShareIconSvg />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 180 }}>
        {/* ── Page Carousel (batch) or single preview ── */}
        {mimeType !== 'application/pdf' && (
          batchPages.length > 1 ? (
            <View className="bg-slate-100 dark:bg-slate-800/50">
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
                  <Image
                    source={{ uri: item }}
                    style={{ width: W, height: W * 0.7 }}
                    resizeMode="contain"
                  />
                )}
              />
              <View className="flex-row justify-center py-2 gap-1.5">
                {batchPages.map((_, i) => (
                  <View key={i} style={{ width: i === pageIndex ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === pageIndex ? '#6366F1' : '#CBD5E1' }} />
                ))}
              </View>
              <Text className="text-center text-xs text-slate-400 pb-2">
                Page {pageIndex + 1} of {batchPages.length}
              </Text>
            </View>
          ) : imageUri ? (
            <View className="p-4 items-center bg-slate-100 dark:bg-slate-800/50">
              <Image
                source={{ uri: imageUri }}
                style={{ width: W * 0.5, height: W * 0.7, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}
                resizeMode="cover"
              />
            </View>
          ) : null
        )}
        {imageUri && mimeType === 'application/pdf' && (
          <View className="p-8 items-center bg-slate-100 dark:bg-slate-800/50">
            <Text className="text-sm font-semibold text-slate-600 dark:text-slate-300">PDF selected</Text>
            <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>{filename || 'document.pdf'}</Text>
          </View>
        )}

        {/* Error State */}
        {error ? (
          <View className="p-6 items-center">
            <Text className="text-rose-500 mb-4">{error}</Text>
            <TouchableOpacity onPress={processDocument} className="bg-indigo-600 px-6 py-3 rounded-xl">
              <Text className="text-white font-semibold">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : documentData ? (
          <View className="p-5">
            {/* Classification Card */}
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6 shadow-sm border-l-4 border-l-indigo-500 border border-slate-100 dark:border-slate-700/50">
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Document Type
              </Text>
              <Text className="text-3xl font-bold text-slate-900 dark:text-white capitalize mb-4">
                {documentData.type}
              </Text>
              <View className="flex-row items-center">
                <View className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full mr-3 overflow-hidden">
                  <View
                    style={{
                      width: `${Math.round(documentData.confidence * 100)}%`,
                      backgroundColor: documentData.confidence > 0.8 ? '#10B981' : '#F59E0B',
                      height: '100%',
                      borderRadius: 999,
                    }}
                  />
                </View>
                <Text className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {Math.round(documentData.confidence * 100)}% confident
                </Text>
              </View>
            </View>

            {/* Extracted Information */}
            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Extracted Information</Text>
            <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm mb-6 overflow-hidden">
              {documentData.entities && documentData.entities.length > 0 ? (
                documentData.entities.map((entity, index) => {
                  const iconColor = EntityIconMap[entity.type] || DefaultEntityIconColor;
                  const isLast = index === (documentData.entities?.length ?? 0) - 1;
                  const action = getEntityAction(entity.type);
                  return (
                    <View
                      key={index}
                      className={`flex-row items-center p-4 ${!isLast ? 'border-b border-slate-100 dark:border-slate-700/50' : ''}`}
                    >
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-4"
                        style={{ backgroundColor: `${iconColor}20` }}
                      >
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                          <Circle cx={12} cy={12} r={8} stroke={iconColor} strokeWidth={3} />
                        </Svg>
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                          {entity.type}
                        </Text>
                        <Text className="text-base font-bold text-slate-900 dark:text-white" numberOfLines={2}>
                          {entity.value}
                        </Text>
                      </View>
                      {/* Confidence badge */}
                      <View className="bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700/50">
                        <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {Math.round(entity.confidence * 100)}%
                        </Text>
                      </View>
                      {/* Copy button */}
                      <TouchableOpacity
                        onPress={() => handleCopyEntity(entity, index)}
                        className="ml-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <CopyIcon color={copiedEntityIndex === index ? '#10B981' : '#9CA3AF'} />
                      </TouchableOpacity>
                      {/* Action button (call/email/maps/remind) */}
                      {action && (
                        <TouchableOpacity
                          onPress={() => handleEntityAction(entity)}
                          className="ml-1.5 px-2 py-1.5 rounded-lg flex-row items-center gap-1"
                          style={{ backgroundColor: `${actionMeta[action].color}18` }}
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        >
                          <ActionIcon action={action} />
                          <Text style={{ color: actionMeta[action].color, fontSize: 10, fontWeight: '700' }}>
                            {actionMeta[action].label}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              ) : (
                <View className="p-6 items-center">
                  <Text className="text-slate-500 dark:text-slate-400">No entities extracted.</Text>
                </View>
              )}
            </View>

            {/* Folder Selection */}
            {folders.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-bold text-slate-900 dark:text-white mb-3 tracking-tight">Assign to Folder</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {folders.map(f => {
                    const isSelected = (documentData.folderIds || []).includes(f.id);
                    return (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() => handleSelectFolder(f.id)}
                        className={`px-4 py-2.5 rounded-xl border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                      >
                        <Text className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{f.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Personal Notes */}
            <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm mb-6 overflow-hidden">
              <View className="p-4 flex-row items-center justify-between border-b border-slate-100 dark:border-slate-700/50">
                <Text className="text-base font-bold text-slate-900 dark:text-white">📝 My Notes</Text>
                <TouchableOpacity
                  onPress={handleSaveNotes}
                  className="px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: notesSaved ? '#10B98120' : '#6366F120' }}
                >
                  <Text style={{ color: notesSaved ? '#10B981' : '#6366F1', fontSize: 12, fontWeight: '700' }}>
                    {notesSaved ? '✓ Saved' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={notesText}
                onChangeText={setNotesText}
                placeholder="Add your personal notes here... (e.g. 'Paid on April 2', 'Follow up needed')"
                placeholderTextColor={colorScheme === 'dark' ? '#64748B' : '#9CA3AF'}
                multiline
                numberOfLines={4}
                style={{
                  padding: 16,
                  fontSize: 14,
                  color: colorScheme === 'dark' ? '#F1F5F9' : '#1E293B',
                  minHeight: 96,
                  textAlignVertical: 'top',
                  fontFamily: 'System',
                }}
              />
            </View>

            {/* Related Documents */}
            {relatedDocs.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-bold text-slate-900 dark:text-white mb-3 tracking-tight">🔗 Related Documents</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 mb-3 -mt-1">
                  Other {documentData.type} documents in your library
                </Text>
                <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
                  {relatedDocs.map((rd, i) => (
                    <TouchableOpacity
                      key={rd.id}
                      onPress={() => router.push(`/results?docId=${rd.id}`)}
                      className={`flex-row items-center px-4 py-3.5 ${
                        i < relatedDocs.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/50' : ''
                      }`}
                    >
                      <View className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 items-center justify-center mr-3">
                        <Text style={{ fontSize: 16 }}>📄</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-800 dark:text-white" numberOfLines={1}>
                          {rd.filename}
                        </Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {new Date(rd.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                      <View className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                        <Text className="text-xs font-bold text-slate-500 dark:text-slate-300">
                          {Math.round(rd.confidence * 100)}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Raw Text — actions only, text never displayed */}
            <View className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm mb-6 p-4">
              <Text className="text-base font-bold text-slate-900 dark:text-white mb-3">Raw Text</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleCopyRawText}
                  className="flex-1 flex-row items-center justify-center bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 py-3 rounded-xl"
                >
                  <Text className="text-slate-700 dark:text-slate-200 font-bold text-sm">📋 Copy Text</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleExportRawText}
                  className="flex-1 flex-row items-center justify-center bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 py-3 rounded-xl"
                >
                  <Text className="text-slate-700 dark:text-slate-200 font-bold text-sm">⬇ Export Text</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Sticky Bar */}
      {documentData && (
        <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-3 pb-6 px-4 shadow-md gap-2.5">
          {/* Row 1: Ask a Question */}
          <TouchableOpacity
            onPress={handleAskQuestion}
            activeOpacity={0.8}
            className="w-full py-3.5 rounded-xl items-center justify-center border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-800"
          >
            <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-base">Ask a Question</Text>
          </TouchableOpacity>
          {/* Row 2: Download JSON | Download CSV */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleDownload}
              activeOpacity={0.8}
              className="flex-1 py-3.5 rounded-xl items-center justify-center bg-emerald-600 shadow-sm"
            >
              <Text className="text-white font-bold text-sm">⬇ Download JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleExportCSV}
              activeOpacity={0.8}
              className="flex-1 py-3.5 rounded-xl items-center justify-center bg-amber-500 shadow-sm"
            >
              <Text className="text-white font-bold text-sm">📊 Download CSV</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Loading Overlay */}
      <LoadingOverlay visible={loading} message="Analyzing document..." />
    </SafeAreaView>
  );
}
