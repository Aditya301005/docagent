import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView,
  Platform, Image, Animated, Alert, StyleSheet, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useDocumentApi } from '../hooks/useDocumentApi';
import { Document, QAMessage } from '../types';
import { useDocStore } from '../store/useDocStore';
import { Spacing, Radius } from '../constants/theme';
import { useThemeStore } from '../store/useThemeStore';
import Markdown from 'react-native-markdown-display';
import { showCustomAlert } from '../components/CustomAlert';

const getMarkdownStyles = (Colors: any) => ({
  body: { color: Colors.textPrimary, fontSize: 15, lineHeight: 22 },
  strong: { color: Colors.primaryLight, fontWeight: 'bold' as const },
  em: { color: Colors.textSecondary, fontStyle: 'italic' as const },
  heading1: { color: Colors.textPrimary, fontSize: 20, fontWeight: 'bold' as const, marginVertical: 8 },
  heading2: { color: Colors.textPrimary, fontSize: 18, fontWeight: 'bold' as const, marginVertical: 6 },
  heading3: { color: Colors.textPrimary, fontSize: 16, fontWeight: 'bold' as const, marginVertical: 4 },
  code_inline: { backgroundColor: 'rgba(255,255,255,0.1)', color: Colors.secondary, paddingHorizontal: 4, borderRadius: 4 },
  code_block: { backgroundColor: 'rgba(0,0,0,0.3)', color: Colors.secondary, padding: 8, borderRadius: 8 },
  list_item: { marginBottom: 4 },
  bullet_list: { marginLeft: 0 },
});

const CodeBlock = ({ codeText, lang, Colors }: any) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(codeText.trim());
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={{
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
      marginVertical: 8,
      overflow: 'hidden',
      width: '100%',
    }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
      }}>
        <Text style={{
          color: Colors.textSecondary,
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>{lang}</Text>
        <TouchableOpacity onPress={handleCopy} activeOpacity={0.7} style={{
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 6,
          backgroundColor: copied ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: copied ? 'rgba(0,200,150,0.3)' : 'rgba(255,255,255,0.08)',
        }}>
          <Text style={{
            color: copied ? Colors.primary : Colors.textSecondary,
            fontSize: 10,
            fontWeight: '700',
          }}>{copied ? 'Copied ✓' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={{
          color: Colors.primaryLight,
          padding: 12,
          fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
          fontSize: 12,
          lineHeight: 18,
        }}>{codeText.trim()}</Text>
      </ScrollView>
    </View>
  );
};

const getMarkdownRules = (Colors: any) => ({
  fence: (node: any) => (
    <CodeBlock key={node.key} codeText={node.content} lang={node.info || 'code'} Colors={Colors} />
  )
});

const AIAvatar = () => {
  const { Colors } = useThemeStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const scale = pulseAnim;
  const opacity = pulseAnim.interpolate({
    inputRange: [1, 2],
    outputRange: [0.6, 0],
  });

  return (
    <View style={{ width: 14, height: 14, justifyContent: 'center', alignItems: 'center', marginRight: 4, marginBottom: -2 }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: Colors.primary,
          transform: [{ scale }],
          opacity,
        }}
      />
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: Colors.primary,
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 4,
          elevation: 3,
        }}
      />
    </View>
  );
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const BackArrow = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={Colors.textPrimary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const SendIcon = ({ active }: { active?: boolean }) => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={active ? '#FFFFFF' : Colors.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

const DocFallbackIcon = () => {
  const { Colors } = useThemeStore();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke={Colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={Colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────

const TypingIndicator = () => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const cycle = () => {
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dot1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      ]).start(() => cycle());
    };
    cycle();
  }, []);

  return (
    <View style={s.typingBubble}>
      <AIAvatar />
      <View style={s.typingDots}>
        <Animated.View style={[s.typingDot, { opacity: dot1 }]} />
        <Animated.View style={[s.typingDot, { opacity: dot2 }]} />
        <Animated.View style={[s.typingDot, { opacity: dot3 }]} />
      </View>
    </View>
  );
};

const MessageInput = React.memo(({ onSend, isLoading }: { onSend: (text: string) => void; isLoading: boolean }) => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  const [text, setText] = useState('');
  const hasText = text.trim().length > 0;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSend = () => {
    if (!hasText || isLoading) return;
    onSend(text.trim());
    setText('');
  };

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <View style={s.inputBar}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Ask anything about this document..."
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={500}
        style={s.msgInput}
      />
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={handleSend}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={!hasText || isLoading}
          style={[s.sendBtn, hasText && s.sendBtnActive]}
          activeOpacity={1}
        >
          <SendIcon active={hasText} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

// ─── Quick Suggestions ────────────────────────────────────────────────────────

const SUGGESTIONS = ['What is the total amount?', 'Who issued this?', 'What is the date?', 'List key details'];

const QuickSuggestions = ({ onSelect }: { onSelect: (q: string) => void }) => {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  return (
    <View style={s.suggestionsWrap}>
      {SUGGESTIONS.map(q => (
        <TouchableOpacity key={q} onPress={() => onSelect(q)} style={s.suggestionChip} activeOpacity={0.7}>
          <Text style={s.suggestionText}>{q}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ─── Off-topic Guard ──────────────────────────────────────────────────────────

const isOffTopic = (q: string): boolean => {
  const t = q.toLowerCase().trim();
  const patterns = [
    /^hi+\b/, /^hey+\b/, /^hello+\b/, /^how are you/,
    /^what('?s| is) up/, /^yo\b/,
    /who (are|made|built|created|trained) you/,
    /what (are|is) (you|your name|your purpose)/,
    /are you (an? )?(ai|bot|robot|chatbot|llm|language model)/,
    /^tell me about yourself/,
    /^what is the capital of/,
    /^tell me (a )?joke/,
    /^(write|give me|generate) (a |an )?(poem|story|essay|song)/,
  ];
  return patterns.some(r => r.test(t));
};

// ─── QA Screen ───────────────────────────────────────────────────────────────

export default function QAScreen() {
  const { Colors, Gradients } = useThemeStore();
  const s = getStyles(Colors, Gradients);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { askQuestion } = useDocumentApi();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const initialLoad = async () => {
      if (!docId) return;
      try {
        const currentDoc = useDocStore.getState().getById(docId) || null;
        setDoc(currentDoc);

        const qaRaw = await AsyncStorage.getItem(`qa_${docId}`);
        if (qaRaw) {
          setMessages(JSON.parse(qaRaw));
        } else if (currentDoc) {
          const initialMsgs: QAMessage[] = [{
            id: 'init',
            role: 'assistant',
            content: `I've analyzed your **${currentDoc.type?.replace('_', ' ') || 'document'}**. What would you like to know? Try asking about amounts, dates, names, or any detail in the document.`,
            timestamp: new Date().toISOString(),
          }];
          setMessages(initialMsgs);
          await AsyncStorage.setItem(`qa_${docId}`, JSON.stringify(initialMsgs));
        }
      } catch (err) {
        console.error('Failed loading doc/qa', err);
      }
    };
    initialLoad();
  }, [docId]);

  const saveMessages = async (newMsgs: QAMessage[]) => {
    setMessages(newMsgs);
    if (docId) await AsyncStorage.setItem(`qa_${docId}`, JSON.stringify(newMsgs));
  };

  const sendMessage = async (questionText: string) => {
    if (!questionText.trim() || !doc?.imageUri) return;

    const userMsg: QAMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: questionText,
      timestamp: new Date().toISOString(),
    };

    const updatedWithUser = [...messages, userMsg];
    await saveMessages(updatedWithUser);

    if (isOffTopic(questionText)) {
      const offTopicMsg: QAMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm only able to answer questions about this document. Try asking something like "What is the total amount?", "Who is the company?", or "What is the date on this document?"`,
        timestamp: new Date().toISOString(),
      };
      await saveMessages([...updatedWithUser, offTopicMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    setIsLoading(true);
    try {
      const result = await askQuestion(doc.imageUri, questionText, { filename: doc.filename, mimeType: doc.mimeType });
      const { answer, confidence } = result;
      let finalAnswer = answer;
      if (!finalAnswer || finalAnswer.trim() === '' || confidence < 0.3) {
        finalAnswer = "I couldn't find that information in the document.";
      }
      const assistantMsg: QAMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: finalAnswer,
        timestamp: new Date().toISOString(),
      };
      await saveMessages([...updatedWithUser, assistantMsg]);
    } catch (err: any) {
      const errorMsg: QAMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I had trouble reaching the processing server. Please ensure the backend is running.",
        timestamp: new Date().toISOString(),
      };
      await saveMessages([...updatedWithUser, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleLongPressMessage = async (content: string) => {
    await Clipboard.setStringAsync(content);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    showCustomAlert('Copied', 'Message copied to clipboard', [{ text: 'OK' }]);
  };

  const showSuggestions = messages.length <= 1;

  const renderMessage = ({ item }: { item: QAMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.msgWrap, isUser && s.msgWrapUser]}>
        {!isUser && (
          <AIAvatar />
        )}
        <TouchableOpacity
          activeOpacity={0.75}
          onLongPress={() => handleLongPressMessage(item.content)}
          style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}
        >
          {isUser ? (
            <Text style={[s.bubbleText, s.bubbleTextUser]}>
              {item.content}
            </Text>
          ) : (
            <Markdown style={getMarkdownStyles(Colors)} rules={getMarkdownRules(Colors)}>
              {item.content}
            </Markdown>
          )}
        </TouchableOpacity>
        <Text style={[s.timestamp, isUser && { textAlign: 'right', marginRight: 4 }]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={[s.container, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <BackArrow />
          </TouchableOpacity>

          <View style={s.docPreview}>
            <View style={s.docPreviewThumb}>
              {doc?.imageUri ? (
                <Image source={{ uri: doc.imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <DocFallbackIcon />
              )}
            </View>
          </View>

          <View style={s.headerInfo}>
            <Text style={s.headerDocName} numberOfLines={1}>{doc?.filename || 'Document Q&A'}</Text>
            <View style={s.headerAIBadge}>
              <View style={s.headerAIDot} />
              <Text style={s.headerAILabel}>DocAgent AI</Text>
            </View>
          </View>
        </View>

        <View style={s.headerDivider} />

        {/* Chat */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          style={s.chatList}
          contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing.base }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            <>
              {isLoading && <TypingIndicator />}
              {showSuggestions && !isLoading && (
                <QuickSuggestions onSelect={sendMessage} />
              )}
            </>
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={renderMessage}
        />

        {/* Input */}
        <MessageInput onSend={sendMessage} isLoading={isLoading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (Colors: any, Gradients: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPreview: {
    width: 40,
    height: 40,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,200,150,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,200,150,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPreviewThumb: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerDocName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  headerAIBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  headerAIDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  headerAILabel: { color: Colors.success, fontSize: 11, fontWeight: '700' },

  headerDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.base },

  chatList: { flex: 1 },

  msgWrap: {
    marginBottom: Spacing.base,
    maxWidth: '85%',
    alignSelf: 'flex-start',
    gap: 5,
  },
  msgWrapUser: { alignSelf: 'flex-end' },
  aiAvatarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 4,
    marginBottom: -2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  bubble: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bubbleAI: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#FFF', fontWeight: '500' },
  bubbleTextAI: { color: Colors.textPrimary, fontWeight: '400' },
  timestamp: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', marginLeft: 4 },

  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  typingAIOrb: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    borderTopLeftRadius: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryLight,
  },

  suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.lg },
  suggestionChip: {
    backgroundColor: 'rgba(0,200,150,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,200,150,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  suggestionText: { color: Colors.primaryLight, fontSize: 13, fontWeight: '600' },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing['2xl'],
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  msgInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
