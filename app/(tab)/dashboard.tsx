import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, TextInput, Animated, Modal } from 'react-native';
import { UserRole, Customer, CustomerLog, LogCategory, ChatMessage, ChatChannel, TeamMember, LogComment, Attachment, Notification, LogPriority, LogHistoryItem, LogStatus, Language, Theme, LogType } from '@/src/types/types';
import { TRANSLATIONS, DEFAULT_PREFS } from '@/src/constants/constants';
import Sidebar from '@/src/components/Sidebar';
import HomeView from '@/src/components/HomeView';
import PendingActivationView from '@/src/components/PendingActivationView';
import NotificationPanel from '@/src/components/NotificationPanel';
import TeamChatView from '@/src/components/TeamChatView';
import SearchResultsView from '@/src/components/SearchResultsView';
import PersonalNotesView from '@/src/components/PersonalNotesView';
import PipelineView from '@/src/components/PipelineView';
import ChannelModal from '@/src/components/ChannelModal';
import LoadingOverlay from '@/src/components/LoadingOverlay';
import { useNotificationsMessages } from '@/src/hooks/useNotifications';
import { useAuth } from '@/src/hooks/useAuth';
import { useDashboardUsers, useMeNotifications } from '@/src/hooks/useUser';
import { useChannel } from '@/src/hooks/useChannel';
import { useCustomers } from '@/src/hooks/useCustomer';
import { useNotes } from '@/src/hooks/useNote';
import TeamManagementModal from '@/src/components/TeamManagementModal';
import UserProfileModal from '@/src/components/UserProfileModal';
import CustomerPage from './customers';
import NotesPage from './notes';
import { ENV } from "@/src/config/env";
import { io } from "socket.io-client";
import { mapNote } from '@/src/mappers/note.mapper';
import { mapUser } from '@/src/mappers/user.mapper';
import QuickNoteModal from '@/src/components/QuickNoteModal';
import { mapComment } from '@/src/mappers/comment.mapper';
const AnimatedView = Animated.View as any;
const isDev = ENV.MODE_APP === "dev";
const socket = isDev ? io(ENV.SOCKET_URL, { withCredentials: true, transports: ["polling"], reconnectionAttempts: 5, })
  : io(ENV.SOCKET_URL, {
    withCredentials: true,
    transports: ["polling"]
  });

const DashboardScreen: React.FC = () => {
  const { logoutUser, role, current_user_id, current_user, user, language, update_language } = useAuth();
  const { data: usersData, isLoading: isLoadingUsers } = useDashboardUsers();
  const { data: meNotificationsData, isLoading: isLoadingMeNotifications } = useMeNotifications();

  const { data: channelsData, isLoading: isLoadingChannels } = useChannel();
  const [currentCustomerPage, setCurrentCustomerPage] = useState(1);
  const { data: customersData, pagination: paginationCustomerData, isLoading: isLoadingCustomers } = useCustomers(currentCustomerPage);
  const { data: notesData, pagination: paginationNotesData, isLoading: isLoadingNotes } = useNotes();
  const { data: notificationsMessagesData, isLoading: isLoadingNotifications } = useNotificationsMessages();
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(role);
  const [currentUserId, setCurrentUserId] = useState<string>(current_user_id);
  const [activeView, setActiveView] = useState<'home' | 'customers' | 'team-chat' | 'search' | 'all-customers' | 'personal-notes' | 'pipeline'>('home');
  const [activeFilter, setActiveFilter] = useState<'none' | 'urgent' | 'deadlines' | 'all-logs' | 'pinned' | 'health'>('none');
  const [customers, setCustomers] = useState<Customer[]>(customersData || []);
  const [teamMembers, setTeamMembers] = useState<TeamMember[] | null>(usersData || []);
  const [currentUserObj, setCurrentUserObj] = useState<TeamMember | null>(current_user);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [scrolledLogId, setScrolledLogId] = useState<string | null>(null);

  const [activeChatTargetId, setActiveChatTargetId] = useState<string>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [logs, setLogs] = useState<CustomerLog[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isTeamMgmtOpen, setIsTeamMgmtOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [isLoad, setLoad] = useState(false);

  const sidebarTranslateX = useMemo(() => new Animated.Value(isSidebarOpen ? 0 : -300), [isSidebarOpen]);

  const t = (key: string) => TRANSLATIONS[language][key] || key;
  const handleIncomingMessage = (dataMsg, roomMsg) => {
    if (!dataMsg) return;

    setMessages(prev => {
      // Kiểm tra id chính xác (convert sang string để so sánh)
      const messageId = dataMsg.id?.toString() || '';
      if (prev.some(m => m.id === messageId)) {
        return prev;
      }

      const mes: ChatMessage = {
        id: messageId,
        authorId: 'id-' + dataMsg.user_id,
        role: 'user',
        text: dataMsg.content,
        timestamp: new Date(dataMsg.created_at).getTime(), // Lấy timestamp từ API
        recipientId: roomMsg.startsWith('ch-')
          ? null
          : 'id-' + dataMsg.messageable_id,
        channelId: roomMsg || null,
      };

      return [...prev, mes];
    });
  };
  const handleIncomingNotification = (dataMsg, roomMsg) => {
    if (!dataMsg) return;

    setNotifications(prev => {
      // Kiểm tra id chính xác (convert sang string để so sánh)
      const messageId = dataMsg.id?.toString() || '';
      if (prev.some(m => m.id === messageId)) {
        return prev;
      }
      if (user.id == dataMsg.user_id) return prev;
      const isChannelNotice = roomMsg.startsWith('ch-');
      const notice: Notification = {
        id: messageId,
        recipientId: isChannelNotice ? 'ch-' + dataMsg.messageable_id : 'id-' + dataMsg.messageable_id,
        senderId: 'id-' + dataMsg.user_id,
        senderName: usersData?.find(u => u.id == 'id-' + dataMsg.user_id)?.name || 'Unknown',
        type: isChannelNotice ? 'channel' : 'message',
        text: dataMsg.content,
        timestamp: new Date(dataMsg.created_at).getTime(),
        read: false,
      };
      return [...prev, notice];
    });
  };
  const handleIncomingAssignNotification = (note: CustomerLog, sender: TeamMember) => {
    if (!note) return;

    setNotifications(prev => {
      // Kiểm tra id chính xác (convert sang string để so sánh)
      const noticeId = 'note-' + note.id?.toString() || '';
      if (prev.some(m => m.id === noticeId)) {
        return prev;
      }
      if (user.id == note.authorId) return prev;
      const notice: Notification = {
        id: noticeId,
        recipientId: note.assigneeId,
        senderId: note.authorId,
        senderName: sender?.name || 'Unknown',
        type: 'assignment',
        text: `${sender?.name || 'Unknown'} assigned you a ${note.logType} with ${note.priority} priority for customer ${note.customer?.company}.`,
        timestamp: new Date(note.dueDate).getTime(),
        link: 'customers',
        read: false,
        targetCustomerId: note.customerId,
      };
      return [...prev, notice];
    });
  };
  const handleIncomingTeamMember = (users: string[]) => {
    setTeamMembers(prev =>
      prev.map(member => ({
        ...member,
        status: users.includes(member.id)
          ? 'online'
          : 'offline'
      }))
    );
  };
  const handleIncomingOfflineTeamMember = (user: string) => {
    setTeamMembers(prev => prev.map(member => ({ ...member, status: member.id === user ? 'offline' : member.status })));
  };
  const handleIncomingReplyNotification = (note: CustomerLog, sender: TeamMember) => {
    if (!note) return;

    setNotifications(prev => {
      // Kiểm tra id chính xác (convert sang string để so sánh)
      const noticeId = 'note-' + note.id?.toString() || '';
      if (prev.some(m => m.id === noticeId)) {
        return prev;
      }
      if (user.id == note.authorId) return prev;
      const notice: Notification = {
        id: noticeId,
        recipientId: currentUserId,
        senderId: sender.id,
        senderName: sender?.name || 'Unknown',
        type: 'reply',
        text: `${sender?.name || 'Unknown'} replied to your message.`,
        timestamp: new Date(note.dueDate).getTime(),
        link: 'customers',
        read: false,
        targetCustomerId: note.customerId,
      };
      return [...prev, notice];
    });
  };
  const handleIncomingMentionNotification = (comment: LogComment, sender: TeamMember, customerId: string | null) => {
    if (!comment) return;

    setNotifications(prev => {
      // Kiểm tra id chính xác (convert sang string để so sánh)
      const noticeId = 'comment-' + comment.id?.toString() || '';
      if (prev.some(m => m.id === noticeId)) {
        return prev;
      }
      if (user.id == comment.authorId) return prev;
      const notice: Notification = {
        id: noticeId,
        recipientId: currentUserId,
        senderId: sender.id,
        senderName: sender?.name || 'Unknown',
        type: 'mention',
        text: `${sender?.name || 'Unknown'} mentioned you in a comment.`,
        timestamp: new Date(comment.timestamp).getTime(),
        link: 'customers',
        read: false,
        targetCustomerId: customerId,
      };
      return [...prev, notice];
    });
  };
  useEffect(() => {
    Animated.timing(sidebarTranslateX, {
      toValue: isSidebarOpen ? 0 : -300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSidebarOpen]);
  useEffect(() => {
    socket.emit("join:user", currentUserId);
    socket.emit("join:assign", currentUserId);
    socket.emit("join:reply-note", currentUserId);
    socket.emit("join:mention", currentUserId);
    console.log("Emit User & Assign & Reply Note:", currentUserId);
    socket.on("online-users", users => {
      console.log("Socket Online Users:", users);
      handleIncomingTeamMember(users);
    });
    socket.on("user-online", id => {
      console.log("Socket User Online:", id);
      handleIncomingTeamMember([id]);
    });
    socket.on("user-offline", (userId: string) => {
      console.log("Socket User Offline:", userId);
      handleIncomingOfflineTeamMember(userId);
    });
    socket.on("direct.message.created", (res) => {
      console.log("Socket DM:", res);
      handleIncomingMessage(res.message, res.room);
      handleIncomingNotification(res.message, res.room);
    });

    socket.on("channel.message.created", (res) => {
      console.log("Socket Channel:", res);
      handleIncomingMessage(res.message, res.room);
      handleIncomingNotification(res.message, res.room);
    });
    socket.on("assign.note.created", (res) => {
      console.log("Socket Note:", res);
      if (res && res.message && res.sender) {
        const noteLog = mapNote(res.message);
        const sender = mapUser(res.sender);
        handleIncomingAssignNotification(noteLog, sender);
      }
    });
    socket.on("reply.note.created", (res) => {
      console.log("Socket Reply Note:", res);
      if (res && res.message && res.sender) {
        const noteLog = mapNote(res.message);
        const sender = mapUser(res.sender);
        handleIncomingReplyNotification(noteLog, sender);
      }
    });
    socket.on("comment.mention.created", (res) => {
      console.log("Socket Mention Note:", res);
      if (res && res.message && res.sender) {
        const customerId = res.message.note?.customer_id || null;
        if(customerId){
          const comment = mapComment(res.message);
          const sender = mapUser(res.sender);
          handleIncomingMentionNotification(comment, sender, customerId);
        }
        
      }
    });
    return () => {
      socket.off("online-users");
      socket.off("user-online");
      socket.off("user-offline");
      socket.off("direct.message.created");
      socket.off("channel.message.created");
      socket.off("reply.note.created");
      socket.off("comment.mention.created");
    };
  }, []);
  useEffect(() => {
    if (usersData) {
      setTeamMembers(usersData);
    }
    if (customersData) {
      setCustomers(customersData);
    }
    if (notesData) {
      setLogs(notesData);
    }
    if (meNotificationsData && meNotificationsData.length > 0) {
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNotifs = meNotificationsData.filter(n => !existingIds.has(n.id));
        return [...newNotifs, ...prev];
      });
    }
    if (notificationsMessagesData && usersData) {
      if (notificationsMessagesData.unread_channel_count > 0) {
        notificationsMessagesData.channel_messages.forEach(msg => {
          handleIncomingNotification(msg, `ch-${msg.messageable_id}`);
        });
      }
      if (notificationsMessagesData.unread_dm_count > 0) {
        notificationsMessagesData.direct_messages.forEach(msg => {
          handleIncomingNotification(msg, `id-${msg.messageable_id}`);
        });
      }
    }
    const newChannelData = channelsData?.map((channel) => ({
      ...channel,
      id: `ch-${channel.id}`,
    }));
    setChannels(newChannelData ?? []);
    if (!isLoad && newChannelData && newChannelData.length > 0) {
      setLoad(true);
      newChannelData.forEach(channel => {
        socket.emit("join:channel", channel.id);
        console.log("Emit Channel:", channel.id);
      });     
    }
  }, [usersData, customersData, channelsData, notesData, notificationsMessagesData, meNotificationsData]);

  const hasCustomerAccess = useCallback((userId: string, role: UserRole, customer?: Customer | null) => {
    if (!customer) return false;
    if (customer.allowedUserIds?.includes(userId)) return true;
    if (role === UserRole.SUPERVISOR || role === UserRole.MANAGER) return true;
    if (customer.isPublic) return true;
    if (customer.allowedRoles?.includes(role)) return true;
    return false;
  }, []);

  const unreadNotifCount = useMemo(() => {
    return notifications.filter(n => (n.read === false && n.recipientId == currentUserId) || (n.type == 'channel') && n.read == false).length;
  }, [notifications, currentUserId]);
  const triggerNotification = useCallback((params: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...params,
      id: `nt-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const handleMentions = useCallback((
    text: string,
    targetCustomerId?: string,
    targetLogId?: string,
    isChat: boolean = false,
    excludeText?: string,
    excludeUserId?: string,
    targetChatId?: string
  ) => {
    teamMembers.forEach(member => {
      if (member.id === currentUserId || member.isArchived || member.id === excludeUserId) return;
      const mentionPattern = new RegExp(`@${member.name.replace(/\s/g, '\\s?')}`, 'i');
      const isMentioned = mentionPattern.test(text) && (excludeText ? !mentionPattern.test(excludeText) : true);
      if (isMentioned) {
        const customer = targetCustomerId ? customers.find(c => c.id === targetCustomerId) : undefined;
        if (targetCustomerId && customer && !hasCustomerAccess(member.id, member.role, customer)) return;
        triggerNotification({
          type: 'mention',
          recipientId: member.id,
          senderName: currentUserObj?.name,
          senderId: currentUserId,
          text: text,
          targetCustomerId,
          targetLogId,
          targetChatId: targetChatId,
          link: isChat ? 'team-chat' : undefined
        });
      }
    });
  }, [teamMembers, currentUserId, currentUserObj?.name, triggerNotification, customers, hasCustomerAccess]);
  const handleLogout = async () => {
    await logoutUser();
    setCurrentUserId('');
    setCurrentUserRole(UserRole.ONBOARD);
  };

  const handleAddLog = (logID: string, targetId: string, content: string, category: LogCategory, isPrivate: boolean = false, attachments?: Attachment[], priority?: LogPriority, dueDate?: number, assigneeId?: string, customTimestamp?: number, status: LogStatus = 'open', logType: LogType = 'General') => {
    const logId = logID ? logID : `l-${Date.now()}`;
    const newLog: CustomerLog = { id: logId, customerId: targetId, authorId: currentUserId, authorName: currentUserObj.name, authorRole: currentUserRole, content, category, logType, timestamp: customTimestamp || Date.now(), isPrivate, isPinned: false, isArchived: false, priority: priority || 'low', status, dueDate, assigneeId, attachments: attachments || [], comments: [], history: [] };
    setLogs(prev => [newLog, ...prev]);
    handleMentions(content, targetId, logId);
    if (!isPrivate && priority === 'urgent' && status === 'open') {
      teamMembers.filter(m => (m.role === UserRole.SUPERVISOR || m.role === UserRole.MANAGER) && !m.isArchived).forEach(admin => {
        if (admin.id !== currentUserId) triggerNotification({ recipientId: admin.id, senderName: currentUserObj.name, senderId: currentUserId, type: 'urgent', text: `URGENT: ${content.substring(0, 50)}`, targetCustomerId: targetId, targetLogId: logId });
      });
    }
  };

  const handleEditLog = (id: string, newContent: string, priority?: LogPriority, dueDate?: number, assigneeId?: string, status: LogStatus = 'open', logType?: LogType) => {
    const oldLog = logs.find(l => l.id === id);
    if (!oldLog) return;
    setLogs(prev => prev.map(l => {
      if (l.id === id) {
        const historyItem: LogHistoryItem = { content: l.content, priority: l.priority, dueDate: l.dueDate, assigneeId: l.assigneeId, timestamp: l.updatedAt || l.timestamp, authorId: l.lastEditorId || l.authorId, status: l.status, logType: l.logType };
        return { ...l, content: newContent, priority: priority || l.priority, dueDate, assigneeId, status, logType: logType || l.logType, updatedAt: Date.now(), lastEditorId: currentUserId, history: [...(l.history || []), historyItem] };
      }
      return l;
    }));
    handleMentions(newContent, oldLog.customerId, id, false, oldLog.content);
  };

  const handleSendMessage = (text: string, targetId: string, id_res: string) => {
    const isChannel = targetId.startsWith('ch-');

    // Check nếu message đã tồn tại (tránh duplicate từ socket)
    setMessages(prev => {
      if (prev.some(m => m.id === id_res)) {
        return prev;
      }

      const newMessage: ChatMessage = {
        id: id_res,
        role: 'user',
        authorId: currentUserId,
        authorName: currentUserObj.name,
        authorRole: currentUserRole,
        text,
        timestamp: Date.now(),
        channelId: isChannel ? targetId : undefined,
        recipientId: !isChannel ? targetId : undefined
      };

      return [...prev, newMessage];
    });

    if (!isChannel) {
      triggerNotification({
        recipientId: targetId,
        senderName: currentUserObj.name,
        senderId: currentUserId,
        type: 'message',
        text: text,
        link: 'team-chat',
        targetChatId: currentUserId
      });
    }
    handleMentions(text, undefined, undefined, true, undefined, !isChannel ? targetId : undefined, targetId);
  };

  const visibleCustomers = useMemo(() => customers.filter(c => hasCustomerAccess(currentUserId, currentUserRole, c)), [customers, currentUserRole, currentUserId, hasCustomerAccess]);

  const handleNotificationClick = (notif: Notification) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setIsNotifOpen(false);
    if (notif.targetCustomerId) {
      setSelectedCustomerId(notif.targetCustomerId);
      setScrolledLogId(notif.targetLogId || null);
      setActiveView('customers');
    } else if (notif.link === 'team-chat' || notif.type === 'message' || notif.type === 'channel' || notif.targetChatId) {
      if (notif.targetChatId) setActiveChatTargetId(notif.targetChatId);
      else if (notif.senderId && notif.type === 'message') setActiveChatTargetId(notif.senderId);
      else if (notif.senderId && notif.type === 'channel') setActiveChatTargetId(notif.recipientId);
      setActiveView('team-chat');
    }
    
  };

  const themeClass = `theme-${currentUserObj?.sidebarPrefs?.theme || 'emerald'}`;

  if ((currentUserRole as UserRole) === UserRole.ONBOARD) return <PendingActivationView member={currentUserObj} onLogout={handleLogout} language={language} />;
  if (isLoadingUsers || isLoadingCustomers || isLoadingNotifications || isLoadingChannels || isLoadingNotes || isLoadingMeNotifications) return <LoadingOverlay visible={true} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.overlay}
          onPress={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AnimatedView style={[styles.sidebarContainer, { transform: [{ translateX: sidebarTranslateX }] }]}>
        <Sidebar
          isOpen={isSidebarOpen}
          currentRole={currentUserRole}
          currentUserId={currentUserId}
          onRoleChange={setCurrentUserRole}
          customers={visibleCustomers.filter(c => c.status !== 'inactive')}
          selectedId={selectedCustomerId}
          onSelect={(id) => { setSelectedCustomerId(id); setActiveView('customers'); setIsSidebarOpen(false); }}
          activeView={activeView}
          onViewChange={(view) => { setActiveView(view); setActiveFilter('none'); setGlobalSearchTerm(''); setIsSidebarOpen(false); }}
          teamMembers={teamMembers.filter(m => !m.isArchived)}
          channels={channels}
          activeChatTargetId={activeChatTargetId}
          onSelectChat={(id) => { setActiveChatTargetId(id); setActiveView('team-chat'); setIsSidebarOpen(false); }}
          onAddCustomer={() => { /* setIsAddCustomerOpen(true); */ setIsSidebarOpen(false); }}
          onManageTeam={() => { setIsTeamMgmtOpen(true) }}
          onOpenProfile={() => { setIsProfileOpen(true); setIsSidebarOpen(false); }}
          onAddChannel={() => { setIsChannelModalOpen(true); setEditingChannel(null); setIsSidebarOpen(false); }}
          onEditChannel={() => { }}
          onLogout={handleLogout}
          currentUser={currentUserObj}
          language={language}
        />
      </AnimatedView>

      <View style={styles.mainContent}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setIsSidebarOpen(true)}  >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>

          <View style={styles.searchContainer}>
            <TextInput
              placeholder={t('searchPlaceholder')}
              value={globalSearchTerm}
              onChangeText={(text) => { setGlobalSearchTerm(text); if (activeView !== 'search') setActiveView('search'); if (text === '') setActiveView('home'); }}
              style={styles.searchInput}
            />
          </View>

          <TouchableOpacity onPress={() => setIsNotifOpen(!isNotifOpen)} style={styles.notifButton}>
            <Text style={styles.notifIcon}>🔔</Text>
            {unreadNotifCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.scrollContent}>
          {activeView === 'home' && (
            <HomeView
              logs={logs}
              customers={visibleCustomers}
              teamMembers={teamMembers.filter(m => !m.isArchived)}
              messages={messages}
              currentUserRole={currentUserRole}
              currentUserId={currentUserId}
              onQuickNote={() => { setIsQuickNoteOpen(true); }}
              onSelectCustomer={(id) => { setSelectedCustomerId(id); setActiveView('customers'); }}
              onSelectLog={(cid, lid) => { setSelectedCustomerId(cid); setActiveView('customers'); }}
              onSelectTeammate={(id) => { setActiveChatTargetId(id); setActiveView('team-chat'); }}
              onFilterClick={(type) => { setActiveFilter(type); setActiveView('search'); }}
              language={language}
              userPrefs={currentUserObj.sidebarPrefs || DEFAULT_PREFS}
            />
          )}
          {activeView == 'all-customers' || activeView == 'customers' ? (
            <CustomerPage handleAddLog={handleAddLog}
              handleEditLog={handleEditLog} handleMentions={handleMentions} activeView={activeView} setActiveView={setActiveView}
              selectedCustomerId={selectedCustomerId} setSelectedCustomerId={setSelectedCustomerId} />
          ) : null
          }
          {activeView === 'team-chat' && (
            <TeamChatView
              channels={channels}
              teamMembers={teamMembers}
              activeTargetId={activeChatTargetId}
              onSelectTarget={(id) => setActiveChatTargetId(id)}
              messages={messages}
              setMessages={setMessages}
              onSendMessage={handleSendMessage}
              userRole={currentUserRole}
              currentUserId={currentUserId}
              onDeleteMessage={(id) => {
                setMessages(prev => prev.filter(m => m.id !== id));
              }}
              language={language}
            />
          )}
          {activeView === 'search' && (
            <SearchResultsView term={globalSearchTerm} activeFilter={activeFilter} onClearFilter={() => { setActiveFilter('none'); setGlobalSearchTerm(''); }} messages={messages} onSelectCustomer={(id) => { setSelectedCustomerId(id); setActiveView('customers'); }} onSelectLog={(cid, lid) => { setSelectedCustomerId(cid); setScrolledLogId(lid); setActiveView('customers'); }} onSelectChat={(id) => { setActiveChatTargetId(id); setActiveView('team-chat'); }} language={language} />
          )}
          {activeView === 'personal-notes' && (
            <NotesPage customers={visibleCustomers} currentUserId={currentUserId} onSelectLog={(cid, lid) => { setSelectedCustomerId(cid); setScrolledLogId(lid); setActiveView('customers'); }} language={language} />
          )}
          {activeView === 'pipeline' && (
            <PipelineView
              teamMembers={teamMembers?.filter(m => !m.isArchived) || []}
              customers={visibleCustomers}
              language={language}
              currentUserId={currentUserId}
            />
          )}
        </View>
      </View>
      <TeamManagementModal isOpen={isTeamMgmtOpen} onClose={() => setIsTeamMgmtOpen(false)} onAction={(action, member) => { if (action === 'add') setTeamMembers(prev => [...prev, member]); else if (action === 'edit') setTeamMembers(prev => prev.map(tm => tm.id === member.id ? member : tm)); else if (action === 'delete') setTeamMembers(prev => prev.map(tm => tm.id === member.id ? { ...tm, isArchived: true } : tm)); }} currentUserId={currentUserId} currentUserRole={currentUserRole} language={language} onRestore={(id) => setTeamMembers(prev => prev.map(tm => tm.id === id ? { ...tm, isArchived: false } : tm))} />
      <ChannelModal isOpen={isChannelModalOpen} onClose={() => setIsChannelModalOpen(false)} channel={editingChannel} onSubmit={(action, data) => {
        if (action === 'add') setChannels(prev => [...prev, { id: `ch-` + data.id, name: data.name || '', description: data.description || '', type: data.type || 'general' }]);
        else if (action === 'edit') setChannels(prev => prev.map(c => c.id === data.id ? { ...c, ...data } as ChatChannel : c));
        else if (action === 'delete') {
          setChannels(prev => {
            const newChannels = prev.filter(c => c.id !== data.id);
            if (activeChatTargetId === data.id) {
              setActiveChatTargetId(newChannels[0]?.id || '');
              if (!newChannels[0]) setActiveView('home');
            }
            return newChannels;
          });
        }
        setIsChannelModalOpen(false);
      }} userRole={currentUserRole} currentUserId={currentUserId} />
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} member={currentUserObj} language={language} onLanguageChange={update_language} />
      <QuickNoteModal isOpen={isQuickNoteOpen} onClose={() => setIsQuickNoteOpen(false)} addLog={handleAddLog}  userRole={currentUserRole} currentUserId={currentUserId} teamMembers={teamMembers.filter(m => !m.isArchived)} initialCustomerId={selectedCustomerId} language={language} />

      {/* Notification Modal */}
      <Modal
        visible={isNotifOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsNotifOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <NotificationPanel
              notifications={notifications.filter(n => n.recipientId === currentUserId || n.type === 'system')}
              onClose={() => setIsNotifOpen(false)}
              onMarkRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
              onClearAll={() => setNotifications(prev => prev.map(n => n.recipientId === currentUserId ? { ...n, read: true } : n))}
              onNotificationClick={handleNotificationClick}
              language={language}
              channels={channels}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 40,
  },
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: 'white',
    zIndex: 50,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    height: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  menuButton: {
    padding: 10,
  },
  menuIcon: {
    fontSize: 24,
    color: '#10b981',
  },
  searchContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
  },
  notifButton: {
    padding: 10,
    position: 'relative',
  },
  notifIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  placeholderView: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
});

export default DashboardScreen;
