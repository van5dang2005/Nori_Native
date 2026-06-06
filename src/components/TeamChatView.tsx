import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ChatChannel, ChatMessage, UserRole, TeamMember, Language } from '@/src/types/types';
import { useCreateChannelMessage, useCreateDirectMessage } from '@/src/hooks/useMessage';
import { useChatMessages } from '@/src/hooks/useChatMessage';
import LoadingOverlay from './LoadingOverlay';

interface TeamChatViewProps {
  channels: ChatChannel[];
  teamMembers: TeamMember[];
  activeTargetId: string;
  onSelectTarget: (id: string) => void;
  messages: ChatMessage[];
  onSendMessage: (text: string, targetId: string, id: string) => void;
  userRole: UserRole;
  currentUserId: string;
  onDeleteMessage: (id: string) => void;
  language: Language;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const TeamChatView: React.FC<TeamChatViewProps> = ({
  channels, teamMembers, activeTargetId, onSelectTarget,
  messages, setMessages, onSendMessage, userRole, currentUserId
}) => {
  const [inputText, setInputText] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const isChannel = activeTargetId.startsWith('ch-');
  const activeChannel = channels.find(c => c.id === activeTargetId);
  const activeUser = teamMembers.find(m => m.id === activeTargetId);

  const createChannelMessageMutation = useCreateChannelMessage();
  const createDirectMessageMutation = useCreateDirectMessage();
  const { data: messagesData, isLoading: isLoadngMessage } = useChatMessages(activeTargetId, isChannel);

  // Filter & Sort Messages
  const displayMessages = useMemo(() => {
    const filtered = messages.filter(m =>
      isChannel
        ? m.channelId === activeTargetId
        : (m.authorId === currentUserId && m.recipientId === activeTargetId) || 
          (m.authorId === activeTargetId && m.recipientId === currentUserId)
    );
    return filtered.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, activeTargetId, currentUserId, isChannel]);

  // Sync API messages to local state
  useEffect(() => {
    if (!messagesData?.data) return;
    const apiMessages = messagesData.data;

    setMessages(prev => {
      const ids = new Set(prev.map(m => m.id));
      const mapped = apiMessages
        .filter(m => !ids.has(m.id.toString()))
        .map(m => ({
          id: m.id.toString(),
          authorId: 'id-' + m.user_id,
          authorName: m.user?.name || 'Unknown',
          recipientId: isChannel ? null : 'id-' + m.messageable_id,
          channelId: isChannel ? 'ch-' + m.messageable_id : null,
          role: 'user',
          text: m.content,
          avatar: m.user?.img || '',
          timestamp: new Date(m.created_at).getTime(),
        }));
      return mapped.length ? [...prev, ...mapped] : prev;
    });
  }, [messagesData, isChannel, setMessages, teamMembers]);

  const handleSubmit = async () => {
    if (!inputText.trim() || userRole === UserRole.VIEWER) return;
    
    try {
      let res;
      const content = inputText.trim();
      if (isChannel) {
        res = await createChannelMessageMutation.mutateAsync({
          channelId: activeTargetId.replace('ch-', ''),
          payload: { content, attachments: undefined },
        });
        onSendMessage(content, activeTargetId, res.data.id.toString());
      } else {
        res = await createDirectMessageMutation.mutateAsync({
          recipientId: activeTargetId.replace('id-', ''),
          payload: { content, attachments: undefined },
        });
        onSendMessage(content, activeTargetId, res.data.id.toString());
      }
      setInputText("");
      setShowMentions(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    const lastAtSymbol = text.lastIndexOf('@');
    if (lastAtSymbol !== -1) {
      const query = text.substring(lastAtSymbol + 1);
      setMentionQuery(query);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: TeamMember) => {
    const lastAtSymbol = inputText.lastIndexOf('@');
    const newText = inputText.substring(0, lastAtSymbol) + `@${member.name} `;
    setInputText(newText);
    setShowMentions(false);
  };

  const filteredMentions = useMemo(() => {
    const list = teamMembers.filter(m => m.id !== currentUserId);
    const q = mentionQuery.toLowerCase();
    return q ? list.filter(m => m.name.toLowerCase().includes(q)) : list;
  }, [teamMembers, currentUserId, mentionQuery]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isSelf = item.authorId === currentUserId;
    return (
      <View style={[styles.messageContainer, isSelf && styles.messageSelf]}>
        <Image source={{ uri: item?.avatar }} style={styles.avatar} />
        <View style={[styles.messageContent, isSelf && styles.messageContentSelf]}>
          <View style={[styles.messageHeader, isSelf && styles.messageHeaderSelf]}>
            <Text style={styles.authorName}>{item?.authorName}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.bubble, isSelf ? styles.bubbleSelf : styles.bubbleOther]}>
            <Text style={[styles.messageText, isSelf && styles.textWhite]}>
              {item.text}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoadngMessage) return <LoadingOverlay visible={true} />;

  const isLoading = createChannelMessageMutation.isPending || createDirectMessageMutation.isPending;

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            <Text style={styles.hashTag}>{isChannel ? '#' : '@'}</Text>
            {isChannel ? activeChannel?.name : activeUser?.name}
          </Text>
        </View>

        {/* Chat List */}
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {/* Mentions Suggestion */}
        {showMentions && filteredMentions.length > 0 && (
          <View style={styles.mentionPopup}>
            {filteredMentions.map(member => (
              <TouchableOpacity 
                key={member.id} 
                style={styles.mentionItem}
                onPress={() => insertMention(member)}
              >
                <Image source={{ uri: member.avatar }} style={styles.mentionAvatar} />
                <View>
                  <Text style={styles.mentionName}>{member.name}</Text>
                  <Text style={styles.mentionRole}>{member.role}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder={userRole === UserRole.VIEWER ? "Read-only access" : "Message teammate..."}
            editable={userRole !== UserRole.VIEWER && !isLoading}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={handleSubmit}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.sendIcon}>➔</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'white' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  hashTag: { color: '#cbd5e1', fontWeight: '300' },
  listContent: { padding: 16, paddingBottom: 32 },
  messageContainer: { flexDirection: 'row', marginBottom: 20, maxWidth: '85%' },
  messageSelf: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#e2e8f0' },
  messageContent: { marginLeft: 12, flex: 1 },
  messageContentSelf: { marginLeft: 0, marginRight: 12, alignItems: 'flex-end' },
  messageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  messageHeaderSelf: { flexDirection: 'row-reverse' },
  authorName: { fontSize: 11, fontWeight: '900', color: '#1e293b' },
  timestamp: { fontSize: 8, color: '#94a3b8' },
  bubble: { padding: 12, borderRadius: 16, borderWidth: 1 },
  bubbleOther: { backgroundColor: 'white', borderColor: '#f1f5f9', borderTopLeftRadius: 0 },
  bubbleSelf: { backgroundColor: '#059669', borderColor: '#059669', borderTopRightRadius: 0 },
  messageText: { fontSize: 14, fontWeight: '500', color: '#334155' },
  textWhite: { color: 'white' },
  inputWrapper: {
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  sendBtn: {
    marginLeft: 10,
    width: 44,
    height: 44,
    backgroundColor: '#059669',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#cbd5e1' },
  sendIcon: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  mentionPopup: {
    position: 'absolute',
    bottom: 70,
    left: 12,
    right: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    maxHeight: 200,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ecfdf5',
  },
  mentionItem: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  mentionAvatar: { width: 24, height: 24, borderRadius: 8, marginRight: 10 },
  mentionName: { fontSize: 12, fontWeight: '900', color: '#1e293b' },
  mentionRole: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase' },
});

export default TeamChatView;