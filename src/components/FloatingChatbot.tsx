import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { GiftedChat, IMessage, Bubble, Send } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import axios from 'axios';
import { EnergyDataService } from '../services/EnergyDataService';
import { EnergyData } from '../services/EnergyPredictionService';
import { auth } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

const FloatingChatbot = () => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [userEnergyData, setUserEnergyData] = useState<EnergyData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // BottomSheet ref
  const bottomSheetRef = useRef<BottomSheet>(null);

  // ScrollView ref for auto-scrolling
  const scrollViewRef = useRef<ScrollView>(null);

  // BottomSheet snap points
  const snapPoints = useMemo(() => ['65%', '90%'], []);

  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  const predefinedCapsules = [
    'What was my energy usage yesterday?',
    'How does my usage compare to last week?',
    'What can I do to reduce my bills?',
    'Which day did I use the most energy?',
    'Give me personalized energy tips',
    'How much am I spending on electricity?',
  ];

  // Initialize with welcome message and load user data
  useEffect(() => {
    loadUserEnergyData();
    if (messages.length === 0) {
      const welcomeMessage: IMessage = {
        _id: 'welcome',
        text: "Hi! I'm your personalized energy assistant. I can analyze your actual energy usage data, provide tailored insights, and help you save money. Ask me about your consumption patterns!",
        createdAt: new Date(),
        user: { _id: 2, name: 'WattWise AI', avatar: '⚡' },
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  // Load user's actual energy data
  const loadUserEnergyData = async () => {
    try {
      setIsLoadingData(true);
      console.log('🤖 Loading user energy data for chatbot...');
      const energyData = await EnergyDataService.getUserEnergyData();
      if (energyData) {
        setUserEnergyData(energyData);
        console.log('✅ User energy data loaded for chatbot:', {
          avgUsage: energyData.averageDailyKwh.toFixed(1),
          last7Days: energyData.last7Days.length,
          deviceCount: energyData.deviceCount
        });
      } else {
        console.log('⚠️ No energy data found for chatbot');
      }
    } catch (error) {
      console.error('❌ Error loading energy data for chatbot:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Auto-scroll to bottom when messages change (newest messages at bottom)
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessageToAPI = async (text: string) => {
    setIsLoading(true);
    try {
      // Build context with user's actual energy data
      let userDataContext = '';
      if (userEnergyData) {
        const yesterday = userEnergyData.last7Days[userEnergyData.last7Days.length - 1];
        const weekAvg = userEnergyData.last7Days.reduce((a, b) => a + b, 0) / userEnergyData.last7Days.length;
        const monthlyEstimate = userEnergyData.averageDailyKwh * 30 * 25; // 25 LKR per kWh
        
        userDataContext = `
REAL USER ENERGY DATA CONTEXT:
- Current average daily usage: ${userEnergyData.averageDailyKwh.toFixed(1)} kWh
- Yesterday's usage: ${yesterday.toFixed(1)} kWh
- Last 7 days average: ${weekAvg.toFixed(1)} kWh
- Last 7 days data: [${userEnergyData.last7Days.map(d => d.toFixed(1)).join(', ')}] kWh
- Device count: ${userEnergyData.deviceCount} devices
- Monthly budget: ${userEnergyData.monthlyBudget ? `LKR ${userEnergyData.monthlyBudget}` : 'Not set'}
- Estimated monthly cost: LKR ${monthlyEstimate.toFixed(0)}
- User ID: ${userEnergyData.userId}

Use this REAL data to provide specific, personalized responses. Reference actual numbers and patterns.
`;
      } else {
        userDataContext = `
USER DATA: Not available yet (still loading or no data found).
Provide general energy advice but mention that specific insights would be available once data is loaded.
`;
      }

      const enhancedPrompt = `${userDataContext}

You are WattWise AI, a smart energy assistant with access to the user's real energy consumption data. 
Provide helpful, specific responses based on their actual usage patterns. 

User Question: "${text}"

Guidelines:
- Use the actual data provided above to give personalized insights
- Reference specific numbers from their usage (yesterday's consumption, weekly averages, etc.)
- Compare their patterns (higher/lower days, trends)
- Provide actionable advice based on their device count and spending
- Be conversational but informative
- Keep responses under 100 words unless they ask for detailed analysis
- If asking about "yesterday" or "last week", use the actual data provided

Response:`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: enhancedPrompt,
                },
              ],
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
        }
      );

      const botReply =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm sorry, I couldn't process that. Could you try rephrasing?";

      const botResponse: IMessage = {
        _id: Math.random().toString(),
        text: botReply,
        createdAt: new Date(),
        user: { _id: 2, name: 'WattWise AI', avatar: '⚡' },
      };

      setMessages(previousMessages => [...previousMessages, botResponse]);
    } catch (error: any) {
      console.error('Error communicating with Gemini API:', error);
      console.error('Error details:', error.response?.data);

      let errorMessage = "I'm having trouble connecting right now. Please try again in a moment.";

      if (error.response?.status === 400) {
        errorMessage = 'Invalid API request. Please check your API key configuration.';
      } else if (error.response?.status === 403) {
        errorMessage = 'API key is not authorized. Please verify your Gemini API key.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Model not found. Using an outdated model name.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit reached. Please wait a moment before trying again.';
      } else if (!GEMINI_API_KEY) {
        errorMessage =
          'API key is missing. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.';
      }

      const errorResponse: IMessage = {
        _id: Math.random().toString(),
        text: errorMessage,
        createdAt: new Date(),
        user: { _id: 2, name: 'WattWise AI', avatar: '⚡' },
      };

      setMessages(previousMessages => [...previousMessages, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSend = (newMessages: IMessage[] = []) => {
    setMessages(previousMessages => [...previousMessages, ...newMessages]);
    const userMessage = newMessages[0].text;
    sendMessageToAPI(userMessage);
  };

  const handleSendPress = () => {
    if (inputText.trim()) {
      const message: IMessage = {
        _id: Math.random().toString(),
        text: inputText,
        createdAt: new Date(),
        user: { _id: 1, name: 'User' },
      };
      onSend([message]);
      setInputText('');
    }
  };

  const handleCapsulePress = (capsuleText: string) => {
    const message: IMessage = {
      _id: Math.random().toString(),
      text: capsuleText,
      createdAt: new Date(),
      user: { _id: 1, name: 'User' },
    };
    onSend([message]);
  };

  const toggleChatbot = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0); // Start at first snap point (60%)
  }, []);

  const handleSheetChanges = useCallback((index: number) => {
    // Handle sheet state changes if needed
  }, []);

  // Render backdrop for BottomSheet
  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  );

  const renderBubble = (props: any) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: '#49B02D',
          },
          left: {
            backgroundColor: '#f0f0f0',
          },
        }}
        textStyle={{
          right: {
            color: '#fff',
          },
          left: {
            color: '#000',
          },
        }}
      />
    );
  };

  const renderSend = (props: any) => {
    return (
      <Send {...props}>
        <View style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#49B02D" />
        </View>
      </Send>
    );
  };

  const renderFooter = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#49B02D" />
          <Text style={styles.loadingText}>Thinking...</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <>
      <TouchableOpacity style={styles.floatingButton} onPress={toggleChatbot} activeOpacity={0.8}>
        <Ionicons name="flash" size={28} color="#fff" />
        <View style={[styles.badge, { backgroundColor: userEnergyData ? '#e8f5e8' : '#fff' }]}>
          <Text style={styles.badgeText}>AI</Text>
        </View>
      </TouchableOpacity>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        enableDynamicSizing={true}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#49B02D' }}
        backgroundStyle={{ backgroundColor: '#fff' }}
        enablePanDownToClose={true}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          {/* Header */}
          <View style={styles.chatHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                <Ionicons name="flash" size={22} color="#49B02D" />
              </View>
              <View>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitleWattWise}>WattWise</Text>
                  <Text style={styles.headerTitleAI}>AI</Text>
                </View>
                <Text style={styles.headerSubtitle}>
                  {isLoadingData 
                    ? 'Loading your data...' 
                    : userEnergyData 
                      ? `${userEnergyData.averageDailyKwh.toFixed(1)} kWh daily avg • ${userEnergyData.deviceCount} devices`
                      : 'General energy tips available'
                  }
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={loadUserEnergyData}
                style={styles.refreshButton}
                disabled={isLoadingData}
              >
                <Ionicons 
                  name="refresh" 
                  size={20} 
                  color={isLoadingData ? "#ccc" : "#49B02D"} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => bottomSheetRef.current?.close()}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Action Capsules */}
          {messages.length <= 1 && (
            <View style={styles.capsulesContainer}>
              <Text style={styles.capsulesTitle}>Quick Actions</Text>
              <View style={styles.capsulesRow}>
                {predefinedCapsules.map((capsule, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.capsule}
                    onPress={() => handleCapsulePress(capsule)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.capsuleText}>{capsule}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Chat Messages */}
          <View style={styles.messagesWrapper}>
            {messages.length > 0 && (
              <Text style={styles.debugText}>Messages: {messages.length}</Text>
            )}
            {/* Scrollable message list with fixed height */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollableMessageList}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.scrollContent}
            >
              {messages.map((message, index) => (
                <View
                  key={message._id}
                  style={[
                    styles.messageItem,
                    message.user._id === 1 ? styles.userMessage : styles.botMessage,
                  ]}
                >
                  <Text style={[styles.messageText, message.user._id === 1 && { color: '#fff' }]}>
                    {message.text}
                  </Text>
                  <Text style={[styles.messageTime, message.user._id === 1 && { color: '#fff' }]}>
                    {new Date(message.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Custom Input Field */}
          <View style={styles.customInputContainer}>
            <TextInput
              style={styles.customInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              onSubmitEditing={handleSendPress}
              multiline
              blurOnSubmit={false}
              placeholderTextColor="#9ca3af"
              returnKeyType="send"
            />
            <TouchableOpacity onPress={handleSendPress} style={styles.customSendButton}>
              <Ionicons name="send" size={24} color="#49B02D" />
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#49B02D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#49B02D',
  },
  badgeText: {
    color: '#49B02D',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomSheetContent: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingBottom: 8, // Add padding to ensure input is fully visible
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexShrink: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(73, 176, 45, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(73, 176, 45, 0.3)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleWattWise: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  headerTitleAI: {
    fontSize: 16,
    fontWeight: '600',
    color: '#49B02D',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  closeButton: {
    padding: 4,
  },
  capsulesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    flexShrink: 0,
  },
  capsulesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10,
  },
  capsulesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  capsule: {
    backgroundColor: '#49B02D',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  capsuleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#64748b',
    fontSize: 14,
  },
  messagesContainer: {
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  messagesWrapper: {
    flex: 1,
    backgroundColor: '#fff',
    maxHeight: '100%', // Ensure it doesn't grow beyond container
  },
  scrollableMessageList: {
    flex: 1,
    maxHeight: 250, // Reduced height to ensure input is always visible
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  debugText: {
    padding: 10,
    backgroundColor: 'rgba(73, 176, 45, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(73, 176, 45, 0.2)',
    textAlign: 'center',
    fontSize: 14,
    color: '#49B02D',
    fontWeight: '600',
    borderRadius: 8,
  },
  simpleMessageList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageItem: {
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#49B02D',
    alignSelf: 'flex-end',
  },
  botMessage: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    minHeight: 60,
    flexShrink: 0,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    maxHeight: 100,
    marginRight: 8,
    textAlignVertical: 'center',
  },
  customSendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
  },
});

export default FloatingChatbot;
