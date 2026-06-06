import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Dimensions, Platform, StatusBar, } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Sử dụng icon có sẵn của Expo
import { Notification, Language, ChatChannel } from '@/src/types/types';
import { TRANSLATIONS } from '@/src/constants/constants';
import { useMarkAsRead, useMarkAsReadAll } from '@/src/hooks/useUser';

const { width } = Dimensions.get('window');

interface NotificationPanelProps {
  notifications: Notification[];
  channels: ChatChannel[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick: (notif: Notification) => void;
  language: Language;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClose,
  onClearAll,
  onNotificationClick,
  language,
  channels,
}) => {
  const t = (key: string) => TRANSLATIONS[language][key] || key;
  const markAsReadMutation = useMarkAsRead();
  const markAsReadAllMutation = useMarkAsReadAll();
  const handleCLick = async (notif: Notification) => {
    if (!notif.read && notif.type !== 'message') {
      await markAsReadMutation.mutateAsync({ noticeId: notif.id, type: notif.type });
    }
    onNotificationClick(notif);
  }
  const handlelClearAll = async () => {
    await markAsReadAllMutation.mutateAsync({});
    onClearAll();
  }
  const renderIcon = (type: string, senderName: string) => {
    switch (type) {
      case 'reply':
        return <Ionicons name="arrow-back" size={18} color="#047857" />;
      case 'channel':
      case 'message':
        return <Ionicons name="chatbubble-ellipses" size={18} color="white" />;
      case 'mention':
        return <Ionicons name='at-outline' size={18} color="white" />;
      case 'assignment':
        return <Ionicons name='clipboard' size={18} color="white" />;
      case 'urgent':
        return <Ionicons name="warning" size={18} color="white" />;
      default:
        return <Text style={styles.initialText}>{senderName.charAt(0)}</Text>;
    }
  };

  const getActionText = (notif: Notification) => {
    switch (notif.type) {
      case 'assignment': return 'assigned you a note';
      case 'mention': return 'mentioned you';
      case 'reply': return 'replied to you';
      case 'message': return 'sent a message';
      case 'channel': 
        const channelName = channels.find(c => c.id === notif.recipientId)?.name || '';
        return `sent a message to #${channelName}`;
      case 'urgent': return 'posted urgent note';
      default: return 'updated system';
    }
  };

  const renderNotifItem = ({ item: notif }: { item: Notification }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => handleCLick(notif)}
      style={[
        styles.notifCard,
        notif.read ? styles.readCard : styles.unreadCard,
      ]}
    >
      {!notif.read && <View style={styles.unreadDot} />}
      <View style={styles.cardContent}>
        {/* Icon Box */}
        <View style={[
          styles.iconBox,
          notif.type === 'mention' ? styles.bgMention :
          notif.type == 'message' ? styles.bgPrimary :
          notif.type === 'reply' ? styles.bgReply :
          notif.type === 'urgent' ? styles.bgUrgent :
          notif.type === 'assignment' ? styles.bgAssignment :
          styles.bgPrimary
        ]}>
          {renderIcon(notif.type, notif.senderName)}
        </View>

        {/* Text Box */}
        <View style={styles.textColumn}>
          <Text style={styles.senderName} numberOfLines={1}>
            {notif.senderName} 
            <Text style={styles.actionText}> {getActionText(notif)}</Text>
          </Text>
          <Text style={styles.notifBody} numberOfLines={2}>"{notif.text}"</Text>
          <Text style={styles.timeText}>
            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('alerts')}</Text>
            <Text style={styles.subtitle}>{t('liveStream')}</Text>
          </View>
          <View style={styles.headerActions}>
            {notifications.some(n => !n.read) && (
              <TouchableOpacity onPress={handlelClearAll}>
                <Text style={styles.clearBtnText}>{t('clearAll')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* List */}
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.timestamp.toString()}
          renderItem={renderNotifItem}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={40} color="#a7f3d0" />
              </View>
              <Text style={styles.emptyText}>{t('noAlerts')}</Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ecfdf5',
  },
  title: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clearBtnText: { fontSize: 10, fontWeight: '900', color: '#059669', textTransform: 'uppercase' },
  closeBtn: { padding: 4 },
  listPadding: { padding: 16, gap: 12, flexGrow: 1 },
  notifCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    position: 'relative',
  },
  unreadCard: {
    borderColor: '#dcfce7',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  readCard: { borderColor: '#f1f5f9', opacity: 0.6 },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  cardContent: { flexDirection: 'row', gap: 14 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgPrimary: { backgroundColor: '#10b981' },
  bgMention: { backgroundColor: '#dcfce7' },
  bgReply: { backgroundColor: '#f0fdf4' },
  bgUrgent: { backgroundColor: '#f43f5e' },
  bgAssignment: { backgroundColor: '#3b82f6' },
  initialText: { fontSize: 14, fontWeight: '900', color: '#065f46' },
  textColumn: { flex: 1 },
  senderName: { fontSize: 12, fontWeight: '900', color: '#1e293b' },
  actionText: { fontWeight: '700', color: '#94a3b8' },
  notifBody: { fontSize: 13, color: '#475569', fontWeight: '500', marginTop: 2, lineHeight: 18 },
  timeText: { fontSize: 9, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', marginTop: 8 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#f0fdf4',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 11, fontWeight: '900', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 2 },
});

export default NotificationPanel;