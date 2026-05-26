import React, { useState, useCallback, createRef, useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';
import { Spacing, Radius } from '../constants/theme';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type CustomAlertOptions = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

export interface CustomAlertRef {
  show: (options: CustomAlertOptions) => void;
  hide: () => void;
}

export const customAlertRef = createRef<CustomAlertRef>();

export const showCustomAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
  customAlertRef.current?.show({ title, message, buttons });
};

export const CustomAlert = () => {
  const { Colors } = useThemeStore();
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<CustomAlertOptions | null>(null);
  
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useImperativeHandle(customAlertRef, () => ({
    show: (options) => {
      setConfig(options);
      setVisible(true);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    hide: hideAlert
  }));

  const hideAlert = useCallback((callback?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setConfig(null);
      if (callback) callback();
    });
  }, [scaleAnim, opacityAnim]);

  if (!visible || !config) return null;

  const buttons = config.buttons && config.buttons.length > 0 
    ? config.buttons 
    : [{ text: 'OK', onPress: () => {} }];

  const isError = config.title.toLowerCase().includes('error') || config.title.toLowerCase().includes('fail') || config.title.toLowerCase().includes('denied');
  const accentColor = isError ? Colors.error : Colors.primary;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityAnim, backgroundColor: 'rgba(0,0,0,0.90)' }]} />
        
        <View style={styles.centerContainer}>
          <Animated.View 
            style={[
              styles.alertCard, 
              { backgroundColor: Colors.bg, borderColor: 'rgba(255,255,255,0.08)' },
              { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
            ]}
          >
            {/* Accent Top Border */}
            <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
            
            <View style={styles.content}>
              <Text style={[styles.title, { color: Colors.textPrimary }]}>{config.title}</Text>
              {config.message ? (
                <Text style={[styles.message, { color: Colors.textSecondary }]}>{config.message}</Text>
              ) : null}
            </View>
            
            <View style={[styles.buttonRow, { borderTopColor: 'rgba(255,255,255,0.05)' }]}>
              {buttons.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                const isLast = index === buttons.length - 1;
                
                let textColor = Colors.textPrimary;
                if (isDestructive) textColor = Colors.error;
                else if (!isCancel && index === buttons.length - 1) textColor = Colors.primary;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button, 
                      !isLast && { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)' }
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      hideAlert(btn.onPress);
                    }}
                  >
                    <Text style={[
                      styles.buttonText, 
                      { color: textColor },
                      isLast && !isCancel && !isDestructive && { fontWeight: '700' }
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  alertCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
  }
});
