import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { notifyProcessing } from '../utils/notifications';
import { Spacing, Radius } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import { showCustomAlert } from '../components/CustomAlert';

const { width: W, height: H } = Dimensions.get('window');
const SCAN_W = 280;
const SCAN_H = 380;

// ─── Icons ────────────────────────────────────────────────────────────────────

const XIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FlipIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" stroke="#fff" strokeWidth={2} />
    <Circle cx={12} cy={13} r={3} stroke="#fff" strokeWidth={2} />
  </Svg>
);

const FlashIcon = ({ mode }: { mode: 'on' | 'off' | 'auto' }) => {
  const color = mode === 'off' ? '#9CA3AF' : mode === 'auto' ? '#FCD34D' : '#FFF';
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill={mode === 'on' ? color : 'none'} />
    </Svg>
  );
};

const GalleryIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={2} stroke={Colors.textPrimary} strokeWidth={2} />
      <Circle cx={8.5} cy={8.5} r={1.5} fill={Colors.textPrimary} />
      <Path d="M21 15l-5-5L5 21" stroke={Colors.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const FilesIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke={Colors.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6" stroke={Colors.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 13H8M16 17H8" stroke={Colors.textPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const ShutterIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3v18M3 12h18M12 12m-9 0a9 9 0 1 1 18 0 9 9 0 1 1-18 0" stroke="#000" strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

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

const BatchIcon = ({ active }: { active: boolean }) => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={6} width={14} height={16} rx={2} stroke={active ? Colors.primary : '#fff'} strokeWidth={2} fill={active ? 'rgba(59,232,172,0.15)' : 'none'} />
      <Rect x={7} y={3} width={14} height={16} rx={2} stroke={active ? Colors.secondary : 'rgba(255,255,255,0.5)'} strokeWidth={2} fill="none" />
    </Svg>
  );
};

const TrashSmallIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Scanner Screen ───────────────────────────────────────────────────────────

export default function ScannerScreen() {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);

  const { mode = 'camera' } = useLocalSearchParams<{ mode: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'on' | 'off' | 'auto'>('auto');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  // ── Batch scan state ─────────────────────────────────────────────────────────
  const [batchMode, setBatchMode] = useState(false);
  const [capturedPages, setCapturedPages] = useState<string[]>([]);

  // ── Animated vertical scanline ───────────────────────────────────────────────
  const scanLineY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mode === 'camera') {
      const runScanLine = () => {
        scanLineY.setValue(0);
        Animated.loop(
          Animated.sequence([
            Animated.timing(scanLineY, {
              toValue: SCAN_H - 4,
              duration: 2200,
              useNativeDriver: true,
            }),
            Animated.timing(scanLineY, {
              toValue: 0,
              duration: 2200,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      runScanLine();
    }
  }, [mode]);

  // ── Neural extraction progress increments ───────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (processing) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((p) => {
          if (p < 96) return p + 4;
          return p;
        });
      }, 80);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [processing]);

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
        setProcessing(false);
        pushToResults({ uri, filename: 'scan.jpg', mimeType: 'image/jpeg' });
      }
    } catch (err) {
      console.error(err);
      showCustomAlert('Error', 'Failed to capture photo.');
      setProcessing(false);
    }
  };

  const handleBatchDone = async () => {
    if (capturedPages.length === 0) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setProcessing(true);
    const [firstPage] = capturedPages;
    const name = `batch_scan_${capturedPages.length}pages.jpg`;
    await notifyProcessing(name);
    setProcessing(false);
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
      showCustomAlert(
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
          await notifyProcessing(firstName);
          setProcessing(false);
          pushToResults({ uri: uris[0], filename: firstName, mimeType: 'image/jpeg' });
        } else {
          const batchName = `gallery_batch_${uris.length}pages.jpg`;
          await notifyProcessing(batchName);
          setProcessing(false);
          pushToResults({
            uri: uris[0],
            filename: batchName,
            mimeType: 'image/jpeg',
            pages: uris,
          });
        }
      } else {
        setProcessing(false);
      }
    } catch (err) {
      showCustomAlert('Error', 'Failed to pick image(s).');
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
        setProcessing(false);
        pushToResults({
          uri: result.assets[0].uri,
          filename,
          mimeType: result.assets[0].mimeType || undefined,
        });
      } else {
        setProcessing(false);
      }
    } catch (err) {
      showCustomAlert('Error', 'Failed to pick document.');
      setProcessing(false);
    }
  };

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
              {/* Animated green scan line */}
              <Animated.View style={[s.scanLine, { transform: [{ translateY: scanLineY }] }]}>
                <LinearGradient
                  colors={['transparent', 'rgba(59,232,172,0.8)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>

              {/* Glowing emerald corner frame markers */}
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

        {/* Top bar (AI Capture) */}
        <View style={s.topBar}>
          <View>
            <Text style={s.topHeaderSubtitle}>AI CAPTURE</Text>
            {batchMode && (
              <Text style={s.topHeaderBatch}>
                Batch Scan • {capturedPages.length} page{capturedPages.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          <View style={s.topActions}>
            {/* Batch mode toggle */}
            <TouchableOpacity
              style={[s.iconBtn, batchMode && { backgroundColor: 'rgba(59,232,172,0.2)', borderColor: 'rgba(59,232,172,0.4)' }]}
              onPress={toggleBatchMode}
              activeOpacity={0.8}
            >
              <BatchIcon active={batchMode} />
            </TouchableOpacity>
            {/* Flip camera */}
            <TouchableOpacity style={s.iconBtn} onPress={() => setFacing((f) => f === 'back' ? 'front' : 'back')} activeOpacity={0.8}>
              <FlipIcon />
            </TouchableOpacity>
            {/* Flash */}
            <TouchableOpacity style={s.iconBtn} onPress={toggleFlash} activeOpacity={0.8}>
              <FlashIcon mode={flash} />
            </TouchableOpacity>
            {/* Exit Close */}
            <TouchableOpacity style={[s.iconBtn, s.exitBtn]} onPress={() => router.back()} activeOpacity={0.8}>
              <XIcon />
            </TouchableOpacity>
          </View>
        </View>

        {/* Batch page strip — shown when batchMode & pages captured */}
        {batchMode && capturedPages.length > 0 && (
          <View style={s.pageStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10, alignItems: 'center' }}
            >
              {capturedPages.map((uri, index) => (
                <View key={index} style={s.pageThumbnailWrap}>
                  <Image source={{ uri }} style={s.pageThumbnail} resizeMode="cover" />
                  <View style={s.pageBadge}>
                    <Text style={s.pageBadgeText}>{index + 1}</Text>
                  </View>
                  <TouchableOpacity style={s.pageRemoveBtn} onPress={() => removePage(index)}>
                    <TrashSmallIcon />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom Actions Dock capsule (Gallery, Capture, Files) */}
        <View style={[s.actionsDock, batchMode && capturedPages.length > 0 && { bottom: 120 }]}>
          {/* Gallery Button */}
          <TouchableOpacity style={s.dockActionBtn} onPress={pickImage} activeOpacity={0.8}>
            <View style={s.dockIconCircle}>
              <GalleryIcon />
            </View>
            <Text style={s.dockLabel}>Gallery</Text>
          </TouchableOpacity>

          {/* Core Shutter / Capture Button */}
          <TouchableOpacity style={s.dockActionBtn} onPress={handleCapture} activeOpacity={0.85}>
            <LinearGradient
              colors={Gradients.holo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.shutterHolo}
            >
              <ShutterIcon />
            </LinearGradient>
            <Text style={[s.dockLabel, { color: Colors.primary, fontWeight: '700' }]}>Capture</Text>
          </TouchableOpacity>

          {/* Files Button */}
          <TouchableOpacity style={s.dockActionBtn} onPress={pickDocument} activeOpacity={0.8}>
            <View style={s.dockIconCircle}>
              <FilesIcon />
            </View>
            <Text style={s.dockLabel}>Files</Text>
          </TouchableOpacity>
        </View>

        {/* "Done" floating button for Batch processing */}
        {batchMode && capturedPages.length > 0 && (
          <TouchableOpacity style={s.batchDoneBtn} onPress={handleBatchDone} activeOpacity={0.85}>
            <LinearGradient
              colors={Gradients.holo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.batchDoneGradient}
            >
              <Text style={s.batchDoneBtnText}>✓  Analyze  ({capturedPages.length} Pages)</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Premium Neural extraction progress overlay */}
        {processing && (
          <View style={s.processingOverlay}>
            <View style={s.progressCard}>
              <View style={s.progressHeader}>
                <SparklesIcon color={Colors.primary} size={15} />
                <Text style={s.progressHeaderText}>Neural extraction • {progress}%</Text>
              </View>
              
              <View style={s.progressBarBackground}>
                <LinearGradient
                  colors={Gradients.holo}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.progressBarFill, { width: `${progress}%` }]}
                />
              </View>
              
              <Text style={s.progressSubtext}>
                {progress < 40 
                  ? 'Decrypting layout matrices...' 
                  : progress < 75 
                  ? 'Synthesizing OCR text features...' 
                  : 'Running intelligence classifications...'}
              </Text>
              
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 14 }} />
            </View>
          </View>
        )}
      </View>
    );
  }

  // ── File Picker Screen ───────────────────────────────────────────────────────
  return (
    <View style={s.pickerContainer}>
      <View style={s.pickerHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.pickerBackBtn} activeOpacity={0.8}>
          <XIcon />
        </TouchableOpacity>
        <Text style={s.pickerTitle}>Upload Document</Text>
      </View>

      <View style={s.pickerContent}>
        <View style={s.dropZone}>
          <View style={s.dropZoneIconWrap}>
            <FilesIcon />
          </View>
          <Text style={s.dropZoneTitle}>Select a document</Text>
          <Text style={s.dropZoneSub}>PDF, JPG, PNG supported</Text>
        </View>

        <TouchableOpacity
          style={s.primaryPickerBtn}
          onPress={pickDocument}
          activeOpacity={0.85}
        >
          <Text style={s.primaryPickerBtnText}>Browse Files (PDFs)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryPickerBtn}
          onPress={pickImage}
          activeOpacity={0.85}
        >
          <Text style={s.secondaryPickerBtnText}>Open Photo Library</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => switchMode('camera')} activeOpacity={0.7} style={s.switchModeBtn}>
          <Text style={s.switchModeText}>Switch to Camera</Text>
        </TouchableOpacity>
      </View>

      {processing && (
        <View style={s.processingOverlay}>
          <View style={s.progressCard}>
            <View style={s.progressHeader}>
              <SparklesIcon color={Colors.primary} size={15} />
              <Text style={s.progressHeaderText}>Neural extraction • {progress}%</Text>
            </View>
            <View style={s.progressBarBackground}>
              <LinearGradient
                colors={Gradients.holo}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={s.progressSubtext}>Ingesting document upload pipeline...</Text>
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 14 }} />
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const getStyles = (Colors: any, Gradients: any) => StyleSheet.create({
  blackFill: { flex: 1, backgroundColor: '#060914' },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Cutout overlay
  overlay: { flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(6,9,20,0.68)' },
  overlayMiddle: { flexDirection: 'row', height: SCAN_H },
  overlaySide: { flex: 1, backgroundColor: 'rgba(6,9,20,0.68)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(6,9,20,0.68)' },
  scanWindow: { width: SCAN_W, height: SCAN_H, backgroundColor: 'transparent', position: 'relative', overflow: 'hidden' },

  // Animated Scanline
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    zIndex: 5,
  },

  // Glowing Frame Corners
  corner: { position: 'absolute', width: 22, height: 22, borderColor: Colors.primary },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: Radius.md },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: Radius.md },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: Radius.md },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: Radius.md },

  // Hint
  hintWrap: { position: 'absolute', top: (H - SCAN_H) / 2 + SCAN_H + 18, left: 0, right: 0, alignItems: 'center' },
  hintText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center', paddingHorizontal: 20 },

  // Top header bar
  topBar: { position: 'absolute', top: 56, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  topHeaderSubtitle: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  topHeaderBatch: { color: Colors.primary, fontSize: 11, fontWeight: '600', marginTop: 2 },
  topActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15,22,40,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitBtn: {
    backgroundColor: 'rgba(244,63,94,0.15)',
    borderColor: 'rgba(244,63,94,0.3)',
  },

  // Bottom Actions Dock
  actionsDock: {
    position: 'absolute',
    bottom: 36,
    left: 20,
    right: 20,
    height: 94,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(11,16,32,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  dockActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  dockIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  shutterHolo: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dockLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },

  // Batch page strip
  pageStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 106,
    backgroundColor: 'rgba(6,9,20,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 12,
  },
  pageThumbnailWrap: {
    width: 60,
    height: 76,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    position: 'relative',
  },
  pageThumbnail: { width: '100%', height: '100%' },
  pageBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBadgeText: { color: '#000', fontSize: 9, fontWeight: '800' },
  pageRemoveBtn: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(244,63,94,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Batch Done button
  batchDoneBtn: {
    position: 'absolute',
    bottom: 156,
    alignSelf: 'center',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  batchDoneGradient: {
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  batchDoneBtnText: { color: '#000', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },

  // Premium loading progress card
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,9,20,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    paddingHorizontal: 32,
  },
  progressCard: {
    width: '100%',
    maxWidth: 320,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(15,22,40,0.8)',
    alignItems: 'center',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  progressHeaderText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressSubtext: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Camera permissions
  permissionTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  permissionSub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 28 },
  settingsBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.lg },
  settingsBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  grantText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },

  // File Picker mode
  pickerContainer: { flex: 1, backgroundColor: Colors.bg },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    backgroundColor: Colors.bg,
  },
  pickerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  pickerTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' },
  pickerContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 36 },
  dropZone: {
    backgroundColor: 'rgba(59,232,172,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(59,232,172,0.15)',
    borderStyle: 'dashed',
    borderRadius: Radius['2xl'],
    padding: 36,
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  dropZoneIconWrap: {
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
  dropZoneTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  dropZoneSub: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  primaryPickerBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  primaryPickerBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  secondaryPickerBtn: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 14,
    borderRadius: Radius.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  secondaryPickerBtnText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  switchModeBtn: { paddingVertical: 12, alignItems: 'center' },
  switchModeText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
});

