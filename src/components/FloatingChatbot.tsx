import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Text,
  Animated,
  Easing,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { GiftedChat, IMessage, Bubble, Send } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

const FloatingChatbot = () => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  const predefinedCapsules = [
    'What is my energy usage?',
    'How can I save energy?',
    'Tell me a tip!',
  ];

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: IMessage = {
        _id: 'welcome',
        text: "Hi! I'm your energy assistant. I can help you understand your energy usage, provide saving tips, and answer questions about your home's energy consumption. How can I help you today?",
        createdAt: new Date(),
        user: { _id: 2, name: 'Energy Bot', avatar: '⚡' },
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const sendMessageToAPI = async (text: string) => {
    setIsLoading(true);
    try {
      // CORRECT: Use gemini-2.5-flash with x-goog-api-key header (official method)
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: `You are an energy efficiency assistant helping users manage their home energy consumption. 
                  Answer the following question in a helpful, concise way (2-3 sentences max): ${text}`,
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
        user: { _id: 2, name: 'Energy Bot', avatar: '⚡' },
      };

      setMessages(previousMessages => GiftedChat.append(previousMessages, [botResponse]));
    } catch (error: any) {
      console.error('Error communicating with Gemini API:', error);
      console.error('Error details:', error.response?.data);
      
      let errorMessage = "I'm having trouble connecting right now. Please try again in a moment.";
      
      if (error.response?.status === 400) {
        errorMessage = "Invalid API request. Please check your API key configuration.";
      } else if (error.response?.status === 403) {
        errorMessage = "API key is not authorized. Please verify your Gemini API key.";
      } else if (error.response?.status === 404) {
        errorMessage = "Model not found. Using an outdated model name.";
      } else if (error.response?.status === 429) {
        errorMessage = "Rate limit reached. Please wait a moment before trying again.";
      } else if (!GEMINI_API_KEY) {
        errorMessage = "API key is missing. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.";
      }

      const errorResponse: IMessage = {
        _id: Math.random().toString(),
        text: errorMessage,
        createdAt: new Date(),
        user: { _id: 2, name: 'Energy Bot', avatar: '⚡' },
      };

      setMessages(previousMessages => GiftedChat.append(previousMessages, [errorResponse]));
    } finally {
      setIsLoading(false);
    }
  };

  const onSend = (newMessages: IMessage[] = []) => {
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    const userMessage = newMessages[0].text;
    sendMessageToAPI(userMessage);
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

  const toggleChatbot = () => {
    if (isVisible) {
      // Close animation
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setIsVisible(false));
    } else {
      // Open animation
      setIsVisible(true);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  };

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
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={toggleChatbot}
        activeOpacity={0.8}
      >
        <Ionicons name="flash" size={28} color="#fff" />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AI</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="none"
        transparent={true}
        onRequestClose={toggleChatbot}
      >
        <TouchableWithoutFeedback onPress={toggleChatbot}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.chatContainer,
                  {
                    transform: [{ scale: scaleAnim }],
                    opacity: scaleAnim,
                  },
                ]}
              >
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={styles.keyboardView}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                  {/* Header */}
                  <View style={styles.chatHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.avatarContainer}>
                        <Text style={styles.avatarEmoji}>⚡</Text>
                      </View>
                      <View>
                        <Text style={styles.headerTitle}>Energy Assistant</Text>
                        <Text style={styles.headerSubtitle}>Always here to help</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={toggleChatbot} style={styles.closeButton}>
                      <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
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
                  <GiftedChat
                    messages={messages}
                    onSend={onSend}
                    user={{ _id: 1, name: 'User' }}
                    renderBubble={renderBubble}
                    renderSend={renderSend}
                    renderFooter={renderFooter}
                    placeholder="Ask me anything about energy..."
                    alwaysShowSend
                    maxComposerHeight={100}
                    minComposerHeight={50}
                  />
                </KeyboardAvoidingView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    width: width * 0.9,
    height: height * 0.75,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  keyboardView: {
    flex: 1,
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#49B02D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  closeButton: {
    padding: 4,
  },
  capsulesContainer: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
});

export default FloatingChatbot;