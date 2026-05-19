import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Animated, StatusBar, useColorScheme, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useDocumentApi } from '../hooks/useDocumentApi';
import { Document, QAMessage } from '../types';
import { useDocStore } from '../store/useDocStore';

// ─── Icons ────────────────────────────────────────────────────────────────────

const BackArrow = ({ color = '#0F172A' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SendIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const FallbackDocIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="#6366F1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#6366F1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Typing Indicator Component ───────────────────────────────────────────────

const TypingIndicator = () => {
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
    <View className="flex-row items-center px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm self-start mb-4 max-w-[80%] border border-slate-200 dark:border-slate-700/50">
      <Animated.View style={{ opacity: dot1 }} className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full mx-0.5" />
      <Animated.View style={{ opacity: dot2 }} className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full mx-0.5" />
      <Animated.View style={{ opacity: dot3 }} className="w-2 h-2 bg-slate-500 dark:bg-slate-400 rounded-full mx-0.5" />
    </View>
  );
};

// ─── Input Bar Component (Memoized to prevent context loss on typing) ───

const MessageInput = React.memo(({ onSend, isLoading }: { onSend: (text: string) => void, isLoading: boolean }) => {
  const [text, setText] = useState('');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'flex-end', 
      paddingHorizontal: 16, 
      paddingTop: 12, 
      paddingBottom: Platform.OS === 'ios' ? 16 : 24, 
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
    }}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Ask anything about this document..."
        placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
        multiline
        maxLength={500}
        scrollEnabled
        style={{ 
          flex: 1, 
          backgroundColor: isDark ? '#1E293B' : '#F8FAFC', 
          borderRadius: 24, 
          minHeight: 48, 
          maxHeight: 120, 
          paddingHorizontal: 20, 
          paddingTop: 12, 
          paddingBottom: 12, 
          fontSize: 15, 
          color: isDark ? '#F1F5F9' : '#0F172A',
          marginRight: 12,
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#E2E8F0',
        }}
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={!text.trim() || isLoading}
        style={{ 
          width: 48, 
          height: 48, 
          borderRadius: 24, 
          backgroundColor: text.trim() ? '#4F46E5' : (isDark ? '#1E293B' : '#E2E8F0'), 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: 2
        }}
      >
        <SendIcon />
      </TouchableOpacity>
    </View>
  );
});

export default function QAScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
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
        // Load document from Zustand synchronously
        const currentDoc = useDocStore.getState().getById(docId) || null;
        setDoc(currentDoc);

        // Load existing QA history or set initial greeting
        const qaRaw = await AsyncStorage.getItem(`qa_${docId}`);
        if (qaRaw) {
          setMessages(JSON.parse(qaRaw));
        } else if (currentDoc) {
          const initialMsgs: QAMessage[] = [{
            id: 'init',
            role: 'assistant',
            content: `I have analyzed your ${currentDoc.type?.replace('_', ' ') || 'document'}. Ask me anything!`,
            timestamp: new Date().toISOString()
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
    if (docId) {
      await AsyncStorage.setItem(`qa_${docId}`, JSON.stringify(newMsgs));
    }
  };

  // ── Off-topic guard ───────────────────────────────────────────────────────
  // Returns true if the question is clearly NOT about the document content.
  const isOffTopic = (q: string): boolean => {
    const t = q.toLowerCase().trim();

    // Greetings / chit-chat
    const greetings = [
      /^hi+\b/, /^hey+\b/, /^hello+\b/, /^howdy/, /^hola/, /^sup\b/,
      /^good\s*(morning|afternoon|evening|night|day)/,
      /^how are you/, /^how r u/, /^how do you do/,
      /^what('?s| is) up/, /^wassup/, /^yo\b/,
    ];
    if (greetings.some(r => r.test(t))) return true;

    // Identity / meta questions about the AI
    const identity = [
      /who (are|made|built|created|trained) you/,
      /what (are|is) (you|your name|your purpose|your job)/,
      /are you (an? )?(ai|bot|robot|chatbot|llm|language model|google|gemini|gpt|openai)/,
      /^(are you|r u) (human|real|alive|sentient)/,
      /^tell me about yourself/,
      /^introduce yourself/,
      /^what can you do\b/,
      /^do you have feelings/,
    ];
    if (identity.some(r => r.test(t))) return true;

    // Pure general-knowledge / non-document topics
    const generalKnowledge = [
      /^what is the capital of/,
      /^who is the (president|prime minister|ceo|founder) of/,
      /^tell me (a )?joke/,
      /^(write|give me|generate) (a |an )?(poem|story|essay|code|song|recipe)/,
      /^(what|who) won (the )?/,
      /^(what is|define|explain) [a-z]+\s*$/, // single-word definitions
      /^(translate|convert) /,
      /^(weather|temperature) in /,
      /^play (music|song)/,
      /^(open|search|google|browse)/,
    ];
    if (generalKnowledge.some(r => r.test(t))) return true;

    return false;
  };

  const sendMessage = async (questionText: string) => {
    if (!questionText.trim() || !doc?.imageUri) return;

    const userMsg: QAMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: questionText,
      timestamp: new Date().toISOString()
    };

    const updatedWithUser = [...messages, userMsg];
    await saveMessages(updatedWithUser);

    // ── Block off-topic questions immediately, never hit the API ──
    if (isOffTopic(questionText)) {
      const offTopicMsg: QAMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm only able to answer questions about this document. Try asking something like "What is the total amount?", "Who is the company?", or "What is the date on this document?"`,
        timestamp: new Date().toISOString()
      };
      await saveMessages([...updatedWithUser, offTopicMsg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    setIsLoading(true);

    try {
      const result = await askQuestion(doc.imageUri, questionText, {
        filename: doc.filename,
        mimeType: doc.mimeType,
      });
      const { answer, confidence } = result;

      let finalAnswer = answer;
      if (!finalAnswer || finalAnswer.trim() === '' || confidence < 0.3) {
        finalAnswer = "I couldn't find that information in the document.";
      }

      const assistantMsg: QAMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: finalAnswer,
        timestamp: new Date().toISOString()
      };

      await saveMessages([...updatedWithUser, assistantMsg]);
    } catch (err: any) {
      console.error('QA Error:', err);
      const errorMsg: QAMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I had trouble reaching the processing server. Please ensure the backend is running.",
        timestamp: new Date().toISOString()
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
    Alert.alert('Copied', 'Message copied to clipboard', [{ text: 'OK' }]);
  };

  const renderMessage = ({ item }: { item: QAMessage }) => {
    const isUser = item.role === 'user';
    
    return (
      <View className={`mb-4 max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`}>
        <TouchableOpacity 
          activeOpacity={0.7}
          onLongPress={() => handleLongPressMessage(item.content)}
          className={`px-4 py-3 rounded-2xl ${
            isUser ? 'bg-indigo-600 dark:bg-indigo-500 rounded-tr-sm shadow-sm' : 'bg-slate-100 dark:bg-slate-800 rounded-tl-sm border border-slate-200 dark:border-slate-700/50 shadow-sm'
          }`}
        >
          <Text 
            style={{ lineHeight: 22, letterSpacing: 0.2 }}
            className={`text-[15px] ${isUser ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}
          >
            {item.content}
          </Text>
        </TouchableOpacity>
        <Text 
          className={`text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1.5 ${isUser ? 'text-right mr-1' : 'ml-1'}`}
        >
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
      <View 
        style={{ flex: 1, paddingTop: insets.top }}
        className="bg-slate-50 dark:bg-slate-900"
      >
        {/* ── Header ── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
        }}>
          {/* iOS-style back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 8,
              paddingVertical: 8,
              borderRadius: 8,
              marginRight: 4,
              minWidth: 64,
            }}
            activeOpacity={0.5}
          >
            <BackArrow color={isDark ? '#FFFFFF' : '#0F172A'} />
            <Text style={{
              color: isDark ? '#FFFFFF' : '#0F172A',
              fontSize: 17,
              fontWeight: '400',
              marginLeft: 2,
            }}>Back</Text>
          </TouchableOpacity>
          
          <View className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 items-center justify-center overflow-hidden mr-3">
            {doc?.imageUri ? (
              <Image source={{ uri: doc.imageUri }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <FallbackDocIcon />
            )}
          </View>
          
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight" numberOfLines={1}>
              {doc?.filename || 'Document Q&A'}
            </Text>
            <Text className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase mt-0.5">
              DocAgent
            </Text>
          </View>
        </View>

        {/* ── Chat List ── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          className="flex-1 bg-slate-50 dark:bg-slate-900"
          contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />

        {/* ── Input Bar ── */}
        <MessageInput onSend={sendMessage} isLoading={isLoading} />
      </View>
    </KeyboardAvoidingView>
  );
}
