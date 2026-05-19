import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Linking,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { notifyProcessing } from '../utils/notifications';

const { width: W, height: H } = Dimensions.get('window');
const SCAN_W = 280;
const SCAN_H = 380;

// ─── Icons ────────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FlipIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" stroke="#fff" strokeWidth={2} />
    <Circle cx={12} cy={13} r={3} stroke="#fff" strokeWidth={2} />
  </Svg>
);

const FlashIcon = ({ mode }: { mode: 'on' | 'off' | 'auto' }) => {
  const color = mode === 'off' ? '#9CA3AF' : mode === 'auto' ? '#FCD34D' : '#FFF';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill={mode === 'on' ? color : 'none'} />
    </Svg>
  );
};

const GalleryIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={3} width={18} height={18} rx={2} stroke="#fff" strokeWidth={2} />
    <Circle cx={8.5} cy={8.5} r={1.5} fill="#fff" />
    <Path d="M21 15l-5-5L5 21" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UploadBigIcon = () => (
  <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#6366F1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 8l-5-5-5 5M12 3v12" stroke="#6366F1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BatchIcon = ({ active }: { active: boolean }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={6} width={14} height={16} rx={2} stroke={active ? '#6366F1' : '#fff'} strokeWidth={2} fill={active ? 'rgba(99,102,241,0.25)' : 'none'} />
    <Rect x={7} y={3} width={14} height={16} rx={2} stroke={active ? '#818CF8' : 'rgba(255,255,255,0.5)'} strokeWidth={2} fill="none" />
  </Svg>
);

const TrashSmallIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Scanner Screen ───────────────────────────────────────────────────────────

export default function ScannerScreen() {
  const { mode = 'camera' } = useLocalSearchParams<{ mode: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'on' | 'off' | 'auto'>('auto');
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // ── Batch scan state ─────────────────────────────────────────────────────────
  const [batchMode, setBatchMode] = useState(false);
  const [capturedPages, setCapturedPages] = useState<string[]>([]);

  const pushToResults = (params: {
    uri: string;
    filename?: string;
    mimeType?: string;
    pages?: string[];
  }) => {
    const query = new URLSearchParams();
    query.set('imageUri', params.uri);
    if (params.filename) query.set('filename', params.filename);
    if (params.mimeType) query.set('mimeType', params.mimeType);
    if (params.pages && params.pages.length > 1) {
      query.set('pages', JSON.stringify(params.pages));
    }
    router.replace(`/results?${query.toString()}` as any);
  };

  const switchMode = (newMode: 'camera' | 'picker') => router.replace(`/scanner?mode=${newMode}`);

  const cropAndResize = async (photoUri: string, photoWidth: number, photoHeight: number) => {
    const scaleX = photoWidth / W;
    const scaleY = photoHeight / H;
    const coverScale = Math.max(scaleX, scaleY);

    let cropW = Math.floor(SCAN_W * coverScale);
    let cropH = Math.floor(SCAN_H * coverScale);

    if (cropW > photoWidth) cropW = photoWidth;
    if (cropH > photoHeight) cropH = photoHeight;

    let originX = Math.floor((photoWidth - cropW) / 2);
    let originY = Math.floor((photoHeight - cropH) / 2);

    if (originX < 0) originX = 0;
    if (originY < 0) originY = 0;
    if (originX + cropW > photoWidth) cropW = photoWidth - originX;
    if (originY + cropH > photoHeight) cropH = photoHeight - originY;

    const result = await ImageManipulator.manipulateAsync(
      photoUri,
      [
        { crop: { originX, originY, width: cropW, height: cropH } },
        { resize: { width: 1024, height: 1400 } },
      ],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (!photo) throw new Error('No photo');

      const uri = await cropAndResize(photo.uri, photo.width, photo.height);

      if (batchMode) {
        setCapturedPages((prev) => [...prev, uri]);
        await Haptics.selectionAsync();
        setProcessing(false);
      } else {
        await notifyProcessing('scan.jpg');
        pushToResults({ uri, filename: 'scan.jpg', mimeType: 'image/jpeg' });
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to capture photo.');
      setProcessing(false);
    }
  };

  const handleBatchDone = async () => {
    if (capturedPages.length === 0) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const [firstPage] = capturedPages;
    const name = `batch_scan_${capturedPages.length}pages.jpg`;
    await notifyProcessing(name);
    pushToResults({
      uri: firstPage,
      filename: name,
      mimeType: 'image/jpeg',
      pages: capturedPages,
    });
  };

  const removePage = (index: number) => {
    setCapturedPages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleBatchMode = () => {
    if (batchMode && capturedPages.length > 0) {
      Alert.alert(
        'Exit Batch Mode?',
        'You have captured pages. Exiting will discard them.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard & Exit',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setBatchMode(false);
              setCapturedPages([]);
            },
          },
        ],
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setBatchMode((prev) => !prev);
      setCapturedPages([]);
    }
  };

  const toggleFlash = () => setFlash((f) => f === 'auto' ? 'on' : f === 'on' ? 'off' : 'auto');

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setProcessing(true);

        // Resize all selected images
        const resized = await Promise.all(
          result.assets.map((asset) =>
            ImageManipulator.manipulateAsync(
              asset.uri,
              [{ resize: { width: 1024 } }],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            )
          )
        );

        const uris = resized.map((r) => r.uri);
        const firstName = result.assets[0].fileName || 'library-image.jpg';

        if (uris.length === 1) {
          // Single photo — behave as before
          await notifyProcessing(firstName);
          pushToResults({ uri: uris[0], filename: firstName, mimeType: 'image/jpeg' });
        } else {
          // Multiple photos — treat as batch scan
          const batchName = `gallery_batch_${uris.length}pages.jpg`;
          await notifyProcessing(batchName);
          pushToResults({
            uri: uris[0],
            filename: batchName,
            mimeType: 'image/jpeg',
            pages: uris,
          });
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image(s).');
      setProcessing(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        setProcessing(true);
        const filename = result.assets[0].name;
        await notifyProcessing(filename);
        pushToResults({
          uri: result.assets[0].uri,
          filename,
          mimeType: result.assets[0].mimeType || undefined,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document.');
      setProcessing(false);
    }
  };

  // ── Camera Mode ─────────────────────────────────────────────────────────────

  if (mode === 'camera') {
    if (!permission) return <View style={s.blackFill} />;

    if (!permission.granted) {
      return (
        <View style={[s.blackFill, s.center, { paddingHorizontal: 32 }]}>
          <Text style={s.permissionTitle}>Camera permission required</Text>
          <Text style={s.permissionSub}>Please allow camera access to scan documents.</Text>
          <TouchableOpacity style={s.settingsBtn} onPress={() => Linking.openSettings()}>
            <Text style={s.settingsBtnText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 16 }} onPress={requestPermission}>
            <Text style={s.grantText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={s.blackFill}>
        {/* Camera */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          flash={flash}
          enableTorch={flash === 'on'}
        />

        {/* Dark overlay with scan window cutout */}
        <View style={[StyleSheet.absoluteFillObject, s.overlay]} pointerEvents="none">
          <View style={s.overlayTop} />
          <View style={s.overlayMiddle}>
            <View style={s.overlaySide} />
            <View style={s.scanWindow}>
              <View style={[s.corner, s.cornerTL]} />
              <View style={[s.corner, s.cornerTR]} />
              <View style={[s.corner, s.cornerBL]} />
              <View style={[s.corner, s.cornerBR]} />
            </View>
            <View style={s.overlaySide} />
          </View>
          <View style={s.overlayBottom} />
        </View>

        {/* Hint label */}
        <View style={s.hintWrap} pointerEvents="none">
          <Text style={s.hintText}>
            {batchMode
              ? capturedPages.length === 0
                ? 'Batch mode — capture each page'
                : `Page ${capturedPages.length} captured — tap to add more`
              : 'Align document inside the frame'}
          </Text>
        </View>

        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <BackIcon />
          </TouchableOpacity>

          <Text style={s.topTitle}>
            {batchMode ? `Batch Scan  •  ${capturedPages.length} page${capturedPages.length !== 1 ? 's' : ''}` : 'Scan Document'}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Batch mode toggle */}
            <TouchableOpacity
              style={[s.iconBtn, batchMode && { backgroundColor: 'rgba(99,102,241,0.35)' }]}
              onPress={toggleBatchMode}
              activeOpacity={0.8}
            >
              <BatchIcon active={batchMode} />
            </TouchableOpacity>
            {/* Flip camera */}
            <TouchableOpacity style={s.iconBtn} onPress={() => setFacing((f) => f === 'back' ? 'front' : 'back')} activeOpacity={0.8}>
              <FlipIcon />
            </TouchableOpacity>
          </View>
        </View>

        {/* Batch page strip — shown when batchMode & pages captured */}
        {batchMode && capturedPages.length > 0 && (
          <View style={s.pageStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 10, alignItems: 'center' }}
            >
              {capturedPages.map((uri, index) => (
                <View key={index} style={s.pageThumbnailWrap}>
                  <Image source={{ uri }} style={s.pageThumbnail} resizeMode="cover" />
                  {/* Page number badge */}
                  <View style={s.pageBadge}>
                    <Text style={s.pageBadgeText}>{index + 1}</Text>
                  </View>
                  {/* Remove button */}
                  <TouchableOpacity style={s.pageRemoveBtn} onPress={() => removePage(index)}>
                    <TrashSmallIcon />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom bar — moves up when page strip is visible */}
        <View style={[s.bottomBar, batchMode && capturedPages.length > 0 && { bottom: 110 }]}>
          <TouchableOpacity style={s.iconBtn} onPress={() => switchMode('picker')} activeOpacity={0.8}>
            <GalleryIcon />
          </TouchableOpacity>

          {/* Shutter */}
          <TouchableOpacity style={s.shutter} onPress={handleCapture} activeOpacity={0.85}>
            <View style={[s.shutterInner, batchMode && { backgroundColor: '#818CF8' }]} />
          </TouchableOpacity>

          <TouchableOpacity style={s.iconBtn} onPress={toggleFlash} activeOpacity={0.8}>
            <FlashIcon mode={flash} />
          </TouchableOpacity>
        </View>

        {/* "Done" button — sits above the shutter row, never overlaps */}
        {batchMode && capturedPages.length > 0 && (
          <TouchableOpacity style={s.batchDoneBtn} onPress={handleBatchDone} activeOpacity={0.85}>
            <Text style={s.batchDoneBtnText}>✓  Done  ({capturedPages.length} page{capturedPages.length !== 1 ? 's' : ''})</Text>
          </TouchableOpacity>
        )}

        {/* Processing overlay */}
        {processing && (
          <View style={s.processingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={s.processingText}>
              {batchMode ? `Saving page ${capturedPages.length + 1}…` : 'Processing…'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // ── File Picker Mode ─────────────────────────────────────────────────────────
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Top bar */}
      <View className="flex-row items-center pt-14 pb-4 px-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={isDark ? "#fff" : "#111"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-900 dark:text-white ml-2 tracking-tight">Upload Document</Text>
      </View>

      <View className="flex-1 justify-center px-6">
        {/* Drop zone */}
        <View className="bg-white dark:bg-slate-800 border-2 border-dashed border-indigo-100 dark:border-indigo-900/50 rounded-[32px] p-9 items-center mb-8 shadow-sm">
          <View className="w-[90px] h-[90px] rounded-full bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center mb-5">
            <UploadBigIcon />
          </View>
          <Text className="text-lg font-extrabold text-slate-900 dark:text-white mb-1.5">Select a document</Text>
          <Text className="text-sm text-slate-400 dark:text-slate-500">PDF, JPG, PNG supported</Text>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={pickDocument}
          activeOpacity={0.85}
          className="bg-indigo-600 py-4 rounded-2xl items-center mb-3 shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <Text className="text-white text-base font-bold">Browse Files (PDFs)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={pickImage}
          activeOpacity={0.85}
          className="bg-white dark:bg-slate-800 py-4 rounded-2xl items-center border-1.5 border-indigo-100 dark:border-indigo-900/50 mb-3"
        >
          <Text className="text-indigo-600 dark:text-indigo-400 text-base font-bold">Open Photo Library</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => switchMode('camera')} activeOpacity={0.7} className="py-3 items-center">
          <Text className="text-slate-400 dark:text-slate-500 text-[15px] font-semibold">Switch to Camera</Text>
        </TouchableOpacity>
      </View>

      {processing && (
        <View className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 items-center justify-center z-[100]">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="text-indigo-600 dark:text-indigo-400 mt-4 text-base font-bold">Preparing file…</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  blackFill: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Camera overlays
  overlay: { flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  overlayMiddle: { flexDirection: 'row', height: SCAN_H },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  scanWindow: { width: SCAN_W, height: SCAN_H, backgroundColor: 'transparent' },

  // Corners
  corner: { position: 'absolute', width: 22, height: 22, borderColor: '#FFFFFF' },
  cornerTL: { top: -1, left: -1, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 4 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 4 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 4 },

  // Hint
  hintWrap: { position: 'absolute', top: (H - SCAN_H) / 2 + SCAN_H + 14, left: 0, right: 0, alignItems: 'center' },
  hintText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500', letterSpacing: 0.3, textAlign: 'center', paddingHorizontal: 20 },

  // Top / bottom bars
  topBar: { position: 'absolute', top: 52, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  bottomBar: { position: 'absolute', bottom: 44, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 32 },

  iconBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },

  // Shutter
  shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff', borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)' },

  // Batch page strip — anchored to very bottom
  pageStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 106,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingVertical: 10,
  },
  pageThumbnailWrap: {
    width: 64,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.8)',
  },
  pageThumbnail: { width: '100%', height: '100%' },
  pageBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  pageRemoveBtn: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Batch Done button — floats above the shutter row
  batchDoneBtn: {
    position: 'absolute',
    bottom: 200,   // above shutter bar (110) + shutter height (72) + gap (18)
    alignSelf: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  batchDoneBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },

  // Processing
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  processingText: { color: '#fff', marginTop: 16, fontSize: 16, fontWeight: '600' },

  // Permission
  permissionTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  permissionSub: { color: '#9CA3AF', fontSize: 15, textAlign: 'center', marginBottom: 28 },
  settingsBtn: { backgroundColor: '#6366F1', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
  settingsBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  grantText: { color: '#6366F1', fontWeight: '600', fontSize: 15 },

  // Picker mode
  primaryBtn: { backgroundColor: '#6366F1', paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginBottom: 12, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
});
