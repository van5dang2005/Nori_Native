import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
// Remove Picker import if not used elsewhere
// import { Picker } from '@react-native-picker/picker';
import ModalPicker from './ModalPicker';
import { Ionicons } from '@expo/vector-icons';
import { Customer, CustomerLog, UserRole, Attachment, LogPriority, TeamMember, LogCategory, LogStatus, Language, LogType, LogComment } from '@/src/types/types';
import { TRANSLATIONS, LOG_TYPE_STYLES } from '@/src/constants/constants';
import FilePreviewModal from './FilePreviewModal';
import LoadingOverlay from './LoadingOverlay';
import { useCreateNote, useUpdateNote, useNotesByCustomer, useUpdateNoteArchivedStatus, useUpdateNotePinStatus } from '@/src/hooks/useNote';
import { useAuth } from '@/src/hooks/useAuth';
import { useCreateComment } from '@/src/hooks/useComment';
import { CreateCommentPayload } from '@/src/services/commentService';
import Spinner from './Spinner';
import PaginationComponent from './Pagination';
import CreateNoteModal from './CreateNote';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDebounce } from '@/src/hooks/useDebounce';
import { useFilterUsers } from '@/src/hooks/useUser';

interface CustomerViewProps {
  customer: Customer;
  currentUserId: string;
  scrolledLogId?: string | null;
  onAddLog: (logId: string, targetId: string, content: string, category: LogCategory, isPrivate: boolean, attachments: Attachment[], priority?: LogPriority, dueDate?: number, assigneeId?: string, customTimestamp?: number, status?: LogStatus, logType?: LogType) => void;
  onEditLog: (id: string, newContent: string, priority?: LogPriority, dueDate?: number, assigneeId?: string, status?: LogStatus, logType?: LogType) => void;
  onMentions: (text: string, targetCustomerId?: string, targetLogId?: string, isChat?: boolean, excludeText?: string, excludeUserId?: string, targetChatId?: string) => void;
  onEditCustomer: () => void;
  userRole: UserRole;
  language: Language;
}

const CustomerView: React.FC<CustomerViewProps> = ({customer, currentUserId, scrolledLogId, onAddLog, onEditLog, onEditCustomer, onMentions, userRole, language}) => {
  const { current_user_id, current_user, role } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [logs, setLogs] = useState<CustomerLog[]>([]);
  const [activeTab, setActiveTab] = useState<'intel' | 'pinned' | 'vault' | 'archived'>('intel');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyParentCommentId, setReplyParentCommentId] = useState<string | undefined>(undefined);
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);

  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editLogType, setEditLogType] = useState<LogType>('General');
  const [editPriority, setEditPriority] = useState<LogPriority>('low');
  const [editStatus, setEditStatus] = useState<LogStatus>('open');
  const [editAssigneeId, setEditAssigneeId] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState<Date | null>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  const [highlightedLogId, setHighlightedLogId] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionTarget, setMentionTarget] = useState<'main' | 'reply' | 'edit'>('main');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);

  const mainTextAreaRef = useRef<TextInput>(null);
  const replyTextAreaRefs = useRef<{ [key: string]: TextInput | null }>({});
  const editTextAreaRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const t = (key: string) => TRANSLATIONS[language][key] || key;
  const canPostNote = useMemo(() => userRole !== UserRole.VIEWER && userRole !== UserRole.ONBOARD, [userRole]);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [piningId, setPiningId] = useState<string | null>(null);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  // Add states for modal visibility
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [priorityModalVisible, setPriorityModalVisible] = useState(false);
  const [assigneeModalVisible, setAssigneeModalVisible] = useState(false);

  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState<{id: string, name: string}[]>([]);
  const { data: logsBycustomerId, pagination: paginationNotesData, isLoading: isLoadingNotes } = useNotesByCustomer(customer.id, { page: currentPage });
  const debouncedSearch = useDebounce(mentionQuery, 500);
  const { data: usersData, isLoading: isLoadingUsers } = useFilterUsers(1, debouncedSearch, customer.allowedUserIds, customer.isPublic ? true : customer.allowedRoles.includes(UserRole.SALE),
     customer.isPublic ? true : customer.allowedRoles.includes(UserRole.VIEWER),
      customer.isPublic ? true : customer.allowedRoles.includes(UserRole.LOGISTICS));
  const teamMembers = usersData || [];

  const { mutate: createComment } = useCreateComment();
  const { mutate: archivedNote, isPending: isArchiving } = useUpdateNoteArchivedStatus();
  const { mutate: pinnedNote, isPending: isPinning } = useUpdateNotePinStatus();
  const { mutate: updateNote, isPending: isUpdatingNote } = useUpdateNote();


  const availableAssignees = usersData?.filter(i=> i.isArchived === false) || [];

  useEffect(() => {
    if (logsBycustomerId && logsBycustomerId.length > 0) {
      setLogs(logsBycustomerId);
    }
  }, [logsBycustomerId]);
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    // Trên Android, khi chọn xong hoặc cancel, Picker sẽ tự đóng
    if (Platform.OS === 'android') {
      setShowDatePicker(showDatePicker);
    }
    
    if (selectedDate) {
      setEditDueDate(selectedDate);
    }
  };
  const handleEditLogWithAPI = (id: string, newContent: string, priority?: LogPriority, dueDate?: number, assigneeId?: string, status?: LogStatus, logType?: LogType) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    updateNote(
      {
        noteID: id,
        payload: {
          content: newContent,
          priority: priority || log.priority,
          status: status || log.status,
          log_type: logType || log.logType,
          category: log.category,
          is_private: log.isPrivate,
          deadline: dueDate ? new Date(dueDate).toISOString().split('T')[0] : undefined,
          assign_id: editAssigneeId ? editAssigneeId.replace('id-', '') : undefined,
        }
      },
      {
        onSuccess: () => {
          onEditLog(log.id, editValue, editPriority, editDueDate ? new Date(editDueDate).getTime() : undefined, editAssigneeId || undefined, editStatus, editLogType);
          setEditingLogId(null);
        },
      }
    );
  };


  const handleTextChange = (value: string, target: 'main' | 'reply' | 'edit') => {
    const lastAtSymbol = value.lastIndexOf('@');

    if (target === 'reply') {
      setReplyText(value);
      setMentionUsers((prev) =>
        prev.filter((m) => value.includes(`@${m.name}`))
      );
    }
    else if (target === 'edit') setEditValue(value);

    const charBeforeAt = lastAtSymbol > 0 ? value[lastAtSymbol - 1] : ' ';
    const charAfterAt = value[lastAtSymbol + 1] || '';

    const isValidBefore = (charBeforeAt === ' ' || charBeforeAt === '\n');

    // ✅ thêm check charAfterAt
    const isValidAfter = charAfterAt === '' || /^[a-zA-Z0-9]/.test(charAfterAt);

    const isValidMentionStart = lastAtSymbol !== -1 && isValidBefore && isValidAfter;


    if (isValidMentionStart) {
      const query = value.substring(lastAtSymbol + 1);

      // ❗ nếu có space hoặc xuống dòng thì stop mention
      if (query.includes(' ') || query.includes('\n')) {
        setShowMentions(false);
        return;
      }

      setMentionQuery(query);
      setShowMentions(true);
      setMentionTarget(target);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: TeamMember) => {
    setMentionUsers(prev => [...prev, { id: member.id, name: member.name }]);
    let currentText = mentionTarget === 'reply' ? replyText : editValue;
    let setter =  mentionTarget === 'reply' ? setReplyText : setEditValue;
    let ref = mentionTarget === 'main' ? mainTextAreaRef : mentionTarget === 'edit' ? editTextAreaRef : replyTextAreaRefs.current[replyingToId || ''];

    const lastAtSymbol = currentText.lastIndexOf('@');
    const newText = currentText.substring(0, lastAtSymbol) + `@${member.name} `;
    setter(newText);
    setShowMentions(false);

    let actualRef: TextInput | null;
    if (ref && 'current' in ref) {
      actualRef = ref.current;
    } else {
      actualRef = ref as TextInput | null;
    }

    requestAnimationFrame(() => {
      if (actualRef) {
        actualRef.focus();
      }
    });
  };

  const handleFileSelection = async (target: 'main' | 'reply') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true });
      if (!result.canceled) {
        const newAttachments: Attachment[] = result.assets.map(file => {
          let fileType: Attachment['type'] = 'file';
          if (file.mimeType?.startsWith('image/')) fileType = 'image';
          else if (file.mimeType?.startsWith('video/')) fileType = 'video';
          else if (file.mimeType === 'application/pdf') fileType = 'pdf';

          return {
            id: `att-${Date.now()}-${Math.random()}`,
            name: file.name,
            url: file.uri,
            type: fileType,
            size: file.size || 0,
            file: file as any,
          };
        });
        setReplyAttachments(prev => [...prev, ...newAttachments])
      }
    } catch (error) {}
  };

  const handleEditInit = (log: CustomerLog) => {
    setEditingLogId(log.id);
    setEditValue(log.content);
    setEditLogType(log.logType || 'General');
    setEditPriority(log.priority || 'low');
    setEditStatus(log.status || 'open');
    setEditAssigneeId(log.assigneeId || '');
    setEditDueDate(log.deadline ? new Date(log.deadline) : null);
  };

  const visibleLogs = useMemo(() => {
    const list = logs.filter(l => !l.isPrivate || l.authorId === currentUserId);
    if (activeTab === 'archived') return list.filter(l => l.isArchived);
    if (activeTab === 'pinned') return list.filter(l => l.isPinned && !l.isArchived);
    return list.filter(l => !l.isArchived);
  }, [logs, currentUserId, activeTab]);

  const groupedLogs = useMemo(() => {
    let list = visibleLogs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l => l.content?.toLowerCase().includes(q) || l.authorName.toLowerCase().includes(q));
    }

    const sorted = [...list].sort((a, b) => {
      if (activeTab === 'intel') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }
      return b.timestamp - a.timestamp;
    });

    const groups: { [key: string]: CustomerLog[] } = {};
    sorted.forEach(log => {
      const dateKey = new Date(log.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });
    return groups;
  }, [visibleLogs, searchQuery, activeTab]);

  const allVaultFiles = useMemo(() => {
    const files: (Attachment & { logId: string, timestamp: number })[] = [];
    visibleLogs.forEach(log => {
      if (log.attachments) {
        log.attachments.forEach(att => {
          files.push({ ...att, logId: log.id, timestamp: log.timestamp });
        });
      }
      if (log.comments) {
        log.comments.forEach(comment => {
          if (comment.attachments) {
            comment.attachments.forEach(att => {
              files.push({ ...att, logId: log.id, timestamp: comment.timestamp });
            });
          }
        });
      }
    });
    return files.sort((a, b) => b.timestamp - a.timestamp);
  }, [visibleLogs]);

  const highlightMentions = (text: string, isPrivate: boolean) => {
    const parts = text?.split(/(@\w+(?:\s\w+)?)/g);
    return parts?.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <Text key={i} style={[styles.mentionText, isPrivate ? styles.bgPrimaryTextWhite : styles.bgPrimaryLightTextPrimary]}>
            {part}
          </Text>
        );
      }
      return <Text key={i}>{part}</Text>;
    });
  };

  const handleAddComment = async (logId: string, text: string, atts: Attachment[], pId?: string) => {
    const payload: CreateCommentPayload = {
      text,
      mentionIds: mentionUsers.map((u) => u.id),
      parent_id: pId ? pId.replace('c-', '') : null,
      attachments: atts.map(att => att.file as any),
    };

    await createComment(
      { noteID: logId, payload },
      {
        onSuccess: (response) => {
          setLogs(prev =>
            prev.map(log =>
              log.id === logId
                ? {
                  ...log,
                  comments: [
                    ...(log.comments || []),
                    {
                      id: `c-${response.id}`,
                      parentId: pId,
                      authorId: current_user_id,
                      authorName: current_user.name,
                      authorRole: role,
                      text,
                      timestamp: Date.now(),
                      attachments: atts,
                    },
                  ],
                }
                : log
            )
          );
          onMentions(text, customer.id, logId);
        },
      }
    );
  };

  const handleArchiveLog = async (id: string, archive: boolean) => {
    setArchivingId(id);
    try {
      await archivedNote(
        { id: id, isArchived: archive },
        {
          onSuccess: () => {
            setLogs(prev =>
              prev.map(l => (l.id === id ? { ...l, isArchived: archive } : l))
            );
          },
          onSettled: () => { setArchivingId(null); }
        }
      );
    } catch (err: any) {
      setArchivingId(null);
    }
  };

  const handlePinLog = async (id: string, pin: boolean) => {
    setPiningId(id);
    try {
      await pinnedNote(
        { id: id, isPinned: pin },
        {
          onSuccess: () => {
            setLogs(prev =>
              prev.map(l => (l.id === id ? { ...l, isPinned: pin } : l))
            );
          },
          onSettled: () => { setPiningId(null); }
        },
      );
    } catch (err: any) {
      setPiningId(null);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderThreadedComments = (log: CustomerLog, parentId?: string, depth: number = 0) => {
    const currentLevelComments = log.comments?.filter(c => c.parentId === parentId) || [];
    if (currentLevelComments.length === 0) return null;
    return (
      <View style={[styles.threadContainer, depth > 0 && styles.threadIndented]}>
        {currentLevelComments.map(c => (
          <View key={c.id} style={styles.commentContainer}>
            {depth > 0 && <View style={styles.threadLine} />}
            <View style={styles.rowBetweenStart}>
              <Text style={styles.commentHeader}>
                {c.authorName} • <Text style={styles.commentTime}>{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                {depth > 0 && <Text style={styles.replyChainText}> REPLY CHAIN</Text>}
              </Text>
              {userRole !== UserRole.ONBOARD && (
                <TouchableOpacity
                  onPress={() => {
                    setReplyingToId(log.id);
                    setReplyParentCommentId(c.id);
                    setReplyText(`@${c.authorName} `);
                    setTimeout(() => replyTextAreaRefs.current[log.id]?.focus(), 50);
                  }}
                  style={styles.replyButton}
                >
                  <Text style={styles.replyButtonText}>Reply</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.commentContent, log.isPrivate ? styles.textSlate300 : styles.textSlate600]}>
              {highlightMentions(c.text, log.isPrivate)}
            </Text>
            {c.attachments && c.attachments.length > 0 && (
              <View style={styles.attachmentRow}>
                {c.attachments.map(att => (
                  <TouchableOpacity
                    key={att.id}
                    onPress={() => setPreviewFile(att)}
                    style={styles.attachmentItem}
                  >
                    {att.type === 'image' ? (
                      <Image source={{ uri: att.url }} style={styles.attachmentImageSmall} resizeMode="cover" />
                    ) : att.type === 'video' ? (
                      <Ionicons name="videocam" size={14} color="#f43f5e" />
                    ) : (
                      <Ionicons name="document" size={14} color="#0f172a" />
                    )}
                    <Text style={styles.attachmentNameSmall}>{att.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {renderThreadedComments(log, c.id, depth + 1)}
          </View>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.mainContainer}>
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} language={language} />

      {showMentions && availableAssignees.length > 0 && (
        <View style={styles.mentionsPopup}>
          <View style={styles.mentionsHeader}>
            <Text style={styles.mentionsHeaderText}>{t('select_personnel')}</Text>
          </View>
          <ScrollView style={styles.mentionsList}>
            {availableAssignees.map((member, idx) => (
              <TouchableOpacity
                key={member.id}
                onPress={() => insertMention(member)}
                style={[styles.mentionRow, selectedIndex === idx && styles.mentionRowSelected]}
              >
                <Image source={{ uri: member.avatar }} style={styles.mentionAvatar} resizeMode="cover" />
                <View>
                  <Text style={styles.mentionName}>{member.name}</Text>
                  <Text style={styles.mentionRole}>{t(member.role)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView ref={scrollViewRef} style={styles.flex1} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrapper}>
          <View style={styles.customerHeaderCard}>
            <View style={styles.customerAvatarBlock}>
              <Text style={styles.customerAvatarText}>{customer.name.charAt(0)}</Text>
            </View>
            <View style={styles.customerInfoBlock}>
              <View style={styles.customerNameRow}>
                <Text style={styles.customerNameText}>{customer.name}</Text>
                {(userRole === UserRole.SUPERVISOR || userRole === UserRole.MANAGER) && (
                  <TouchableOpacity onPress={onEditCustomer} style={styles.editCustomerBtn}>
                    <Ionicons name="pencil" size={20} color="#cbd5e1" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.customerCompanyText}>{customer.company}</Text>

              <View style={styles.personnelRow}>
                <View style={styles.personnelAvatars}>
                  {availableAssignees?.map((m, index) => (
                    <Image key={m.id} source={{ uri: m.avatar }} style={[styles.personnelAvatarImg, index > 0 && styles.avatarOverlap]} resizeMode="cover" />
                  ))}
                  <View style={[styles.personnelCountBadge, availableAssignees?.length > 0 && styles.avatarOverlap]}>
                    <Text style={styles.personnelCountText}>{availableAssignees?.length || 0}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.tabsContainerRow}>
            <View style={styles.tabsWrapper}>
              <TouchableOpacity onPress={() => setActiveTab('intel')} style={[styles.tabButton, activeTab === 'intel' && styles.tabButtonActive]}>
                <Text style={[styles.tabText, activeTab === 'intel' ? styles.tabTextIntelActive : styles.tabTextInactive]}>{t('activityFeed')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('pinned')} style={[styles.tabButton, activeTab === 'pinned' && styles.tabButtonActive]}>
                <Text style={[styles.tabText, activeTab === 'pinned' ? styles.tabTextPinnedActive : styles.tabTextInactive]}>Pinned Intel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('vault')} style={[styles.tabButton, activeTab === 'vault' && styles.tabButtonActive]}>
                <Text style={[styles.tabText, activeTab === 'vault' ? styles.tabTextVaultActive : styles.tabTextInactive]}>{t('files')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTab('archived')} style={[styles.tabButton, activeTab === 'archived' && styles.tabButtonActive]}>
                <Text style={[styles.tabText, activeTab === 'archived' ? styles.tabTextArchivedActive : styles.tabTextInactive]}>{t('archived')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(activeTab === 'intel' || activeTab === 'archived' || activeTab === 'pinned') && (
            <View style={styles.logsSection}>
              <View style={styles.searchContainer}>
                <View style={styles.searchIcon}>
                  <Ionicons name="search" size={20} color="#cbd5e1" />
                </View>
                <TextInput
                  placeholder={t(`search_${activeTab}_records`)}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                />
              </View>

              {Object.keys(groupedLogs).length === 0 ? (
                <View style={styles.emptyLogsCard}>
                  <Text style={styles.emptyLogsText}>{t('noMatchingRecords')}</Text>
                </View>
              ) : Object.entries(groupedLogs).map(([date, items]) => (
                <View key={date} style={styles.dateGroupContainer}>
                  <View style={styles.dateHeaderRow}>
                    <View style={styles.lineFlex} />
                    <Text style={styles.dateHeaderText}>{date}</Text>
                    <View style={styles.lineFlex} />
                  </View>
                  {items.map(log => {
                    const isJumped = highlightedLogId === log.id;
                    const isEditing = editingLogId === log.id;
                    const isShowingHistory = showHistoryId === log.id;
                    const canManageLog = log.authorId === currentUserId || userRole === UserRole.SUPERVISOR || userRole === UserRole.MANAGER;
                    const lastEditor = teamMembers.find(m => m.id === log.lastEditorId);

                    return (
                      <View key={log.id} style={[styles.logCard, log.isPrivate ? styles.logCardPrivate : styles.logCardPublic, isJumped && styles.logCardJumped, log.isPinned && styles.logCardPinned]}>
                        <View style={styles.logCardInner}>
                          <View style={styles.logHeaderRow}>
                            <View style={styles.logAuthorInfo}>
                              <View style={styles.logAuthorAvatar}>
                                <Text style={styles.logAuthorAvatarText}>{log.authorName.charAt(0)}</Text>
                              </View>
                              <View>
                                <View style={styles.logAuthorNameRow}>
                                  {log.isPinned && (
                                    <View style={styles.badgePinned}>
                                      <Ionicons name="pin" size={10} color="white" />
                                      <Text style={styles.badgePinnedText}>Pinned</Text>
                                    </View>
                                  )}                                                       
                                </View>
                                <View style={styles.logAuthorNameRow}>                                  
                                  {log.logType && log.logType !== 'General' && (
                                    <View style={[styles.typeBadge, { borderColor: LOG_TYPE_STYLES[log.logType]?.bg, }]}>
                                      <Text style={[styles.typeBadgeText, { color: LOG_TYPE_STYLES[log.logType]?.border }]}>
                                        {log.logType}
                                      </Text>
                                    </View>
                                  )}                                                        
                                </View>             
                                <View style={styles.logAuthorNameRow}>                                 
                                  <Text style={[styles.logAuthorNameText, log.isPrivate ? styles.textWhite : styles.textSlate900]}>{log.authorName}</Text>
                                                              
                                </View>
                                <View style={styles.logMetaBox}>
                                  <Text style={styles.logTimeText}>
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.authorRole}
                                  </Text>                                
                                  {lastEditor && (
                                    <Text style={styles.logModifiedText}>
                                      Modified by {lastEditor.name}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </View>
                            <View style={styles.logStatusTags}>
                              <View style={styles.rowGap2}>                             
                                <View style={[styles.tagPriority, log.priority === 'urgent' ? styles.tagUrgent : log.priority === 'high' ? styles.tagHigh : log.priority === 'medium' ? styles.tagMedium : styles.tagLow]}>
                                  <Text style={[styles.tagPriorityText, (log.priority === 'low' || !log.priority) ? styles.textPrimary : styles.textWhite]}>{t(log.priority || 'low')}</Text>
                                </View>
                                <View style={[styles.tagStatus, log.status === 'open' ? styles.tagOpen : log.status === 'resolved' ? styles.tagResolved : styles.tagClosed]}>
                                  <Text style={styles.tagStatusText}>{t(log.status)}</Text>
                                </View>
                                 
                              </View>
                              {log.isPrivate && (
                                <View style={styles.tagPrivate}>
                                  <Text style={styles.tagPrivateText}>{t('privateNote')}</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {isEditing ? (
                            <View style={styles.editFormContainer}>
                              <View style={styles.editTypesRow}>
                                {(['PO', 'Complaint', 'Document', 'Price', 'General'] as LogType[]).map(type => (
                                  <TouchableOpacity
                                    key={type}
                                    onPress={() => setEditLogType(type)}
                                    style={[styles.typeBtn, editLogType === type ? styles.typeBtnActive : styles.typeBtnInactive]}
                                  >
                                    <Text style={[styles.typeBtnText, editLogType === type ? styles.textWhite : styles.textSlate400]}>{type}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                              <TextInput
                                ref={editTextAreaRef}
                                multiline
                                value={editValue}
                                onChangeText={(text) => handleTextChange(text, 'edit')}
                                onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
                                style={[styles.editInputArea, log.isPrivate ? styles.editInputPrivate : styles.editInputPublic]}
                              />

                               <View style={styles.editControlsGrid}>
                                <View style={styles.editControlBox}>
                                  <Text style={styles.editControlLabel}>{t('caseStatus')}</Text>
                                  <View style={styles.editPickerWrapper}>
                                    <TouchableOpacity onPress={() => setStatusModalVisible(true)} style={styles.pickerTouchable}>
                                      <Text style={styles.pickerText}>{t(editStatus) || t('open')}</Text>
                                    </TouchableOpacity>
                                    <ModalPicker
                                      visible={statusModalVisible}
                                      onClose={() => setStatusModalVisible(false)}
                                      selectedValue={editStatus}
                                      onValueChange={(value) => {
                                        setEditStatus(value as any);
                                        setStatusModalVisible(false);
                                      }}
                                      options={[
                                        { label: t('open'), value: 'open' },
                                        { label: t('resolved'), value: 'resolved' },
                                        { label: t('closed'), value: 'closed' },
                                      ]}
                                    />
                                  </View>
                                </View>
                                <View style={styles.editControlBox}>
                                  <Text style={styles.editControlLabel}>{t('urgency')}</Text>
                                  <View style={styles.editPickerWrapper}>
                                    <TouchableOpacity onPress={() => setPriorityModalVisible(true)} style={styles.pickerTouchable}>
                                      <Text style={styles.pickerText}>{t(editPriority) || t('low')}</Text>
                                    </TouchableOpacity>
                                    <ModalPicker
                                      visible={priorityModalVisible}
                                      onClose={() => setPriorityModalVisible(false)}
                                      selectedValue={editPriority}
                                      onValueChange={(value) => {
                                        setEditPriority(value as any);
                                        setPriorityModalVisible(false);
                                      }}
                                      options={[
                                        { label: t('low'), value: 'low' },
                                        { label: t('medium'), value: 'medium' },
                                        { label: t('high'), value: 'high' },
                                        { label: t('urgent'), value: 'urgent' },
                                      ]}
                                    />
                                  </View>
                                </View>
                                <View style={styles.editControlBox}>
                                  <Text style={styles.editControlLabel}>Assign Task</Text>
                                  <View style={styles.editPickerWrapper}>
                                    <TouchableOpacity onPress={() => setAssigneeModalVisible(true)} style={styles.pickerTouchable}>
                                      <Text style={styles.pickerText}>{editAssigneeId ? availableAssignees.find(m => m.id === editAssigneeId)?.name || 'Unassigned' : 'Unassigned'}</Text>
                                    </TouchableOpacity>
                                    <ModalPicker
                                      visible={assigneeModalVisible}
                                      onClose={() => setAssigneeModalVisible(false)}
                                      selectedValue={editAssigneeId}
                                      onValueChange={(value) => {
                                        setEditAssigneeId(value);
                                        setAssigneeModalVisible(false);
                                      }}
                                      options={[
                                        { label: 'Unassigned', value: '' },
                                        ...availableAssignees.map(m => ({ label: m.name, value: m.id })),
                                      ]}
                                    />
                                  </View>
                                </View> 
                                <View style={styles.inputGroup}>
                                  <Text style={styles.labelSlate}>{t('deadline')}</Text>
                                  
                                  <TouchableOpacity 
                                    activeOpacity={0.7}
                                    style={styles.datePickerTrigger} 
                                    onPress={() => setShowDatePicker(!showDatePicker)}
                                  >
                                    <View style={styles.dateInfo}>
                                      <Ionicons name="calendar-sharp" size={14} color="#64748b" />
                                      <Text style={styles.dateText}>
                                        {editDueDate ? editDueDate.toLocaleDateString('vi-VN') : t('selectDate')}
                                      </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                                  </TouchableOpacity>

                                  {/* Trình chọn ngày hệ thống */}
                                  {showDatePicker && (
                                    <DateTimePicker
                                      value={editDueDate || new Date()}
                                      mode="date"
                                      display={Platform.OS === 'ios' ? 'spinner' : 'default'} // iOS dùng spinner cho sang, Android dùng default
                                      onChange={handleDateChange}
                                      minimumDate={new Date()} // Không cho chọn ngày quá khứ
                                    />
                                  )}
                                </View> 
                              </View>

                              <View style={styles.editActionsRow}>
                                <TouchableOpacity onPress={() => setEditingLogId(null)} style={styles.discardBtn}>
                                  <Text style={styles.discardBtnText}>{t('discardChanges')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleEditLogWithAPI(log.id, editValue, editPriority, editDueDate ? new Date(editDueDate).getTime() : undefined, editAssigneeId || undefined, editStatus, editLogType)} style={styles.saveEditBtn}>
                                  <Text style={styles.saveEditBtnText}>{t('saveNote')}</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <>
                              <Text style={[styles.logContentText, log.isPrivate ? styles.textWhite : styles.textSlate900]}>
                                {highlightMentions(log.content, log.isPrivate)}
                              </Text>
                              {log.attachments && log.attachments.length > 0 && (
                                <View style={styles.attachmentsGrid}>
                                  {log.attachments.map(att => (
                                    <TouchableOpacity
                                      key={att.id}
                                      onPress={() => setPreviewFile(att)}
                                      style={styles.attachmentCard}
                                    >
                                      {att.type === 'image' ? (
                                        <Image source={{ uri: att.url }} style={styles.attachmentThumbImg} resizeMode="cover" />
                                      ) : att.type === 'video' ? (
                                        <View style={[styles.attachmentThumbIconBox, styles.bgRose50]}>
                                          <Ionicons name="videocam" size={32} color="#fca5a5" />
                                        </View>
                                      ) : (
                                        <View style={[styles.attachmentThumbIconBox, styles.bgSlate100]}>
                                          <Ionicons name="document-text" size={32} color="#cbd5e1" />
                                        </View>
                                      )}
                                      <View style={styles.attachmentMetaBox}>
                                        <Text style={styles.attachmentNameText} numberOfLines={1}>{att.name}</Text>
                                        <Text style={styles.attachmentSizeText}>{formatSize(att.size)}</Text>
                                      </View>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}
                              {(log.assigneeId || log.dueDate) && (
                                <View style={styles.taskMetaRow}>
                                  {log.assigneeId && (
                                    <View style={styles.taskMetaItem}>
                                      <Ionicons name="person" size={14} color="#0f172a" />
                                      <Text style={styles.taskMetaAssigneeText}>Assignee: {teamMembers.find(m => m.id === log.assigneeId)?.name}</Text>
                                    </View>
                                  )}
                                  {log.dueDate && (
                                    <View style={styles.taskMetaItem}>
                                      <Ionicons name="calendar" size={14} color="#f43f5e" />
                                      <Text style={styles.taskMetaDateText}>Due: {new Date(log.dueDate).toLocaleDateString()}</Text>
                                    </View>
                                  )}
                                </View>
                              )}
                            </>
                          )}
                          <View style={styles.logActionsFooter}>
                            {userRole !== UserRole.ONBOARD && (
                              <TouchableOpacity onPress={() => { setReplyingToId(replyingToId === log.id && !replyParentCommentId ? null : log.id); setReplyParentCommentId(undefined); setReplyText(''); setReplyAttachments([]); }}>
                                <Text style={styles.actionBtnPrimary}>{t('postReply')}</Text>
                              </TouchableOpacity>
                            )}
                            {canManageLog && !isEditing && (
                              <View style={styles.rowGap4}>
                                <TouchableOpacity onPress={() => handlePinLog(log.id!, !log.isPinned)} disabled={piningId != null}>
                                  {piningId == log.id && isPinning ? <Spinner /> : <Text style={[styles.actionBtnBase, log.isPinned ? styles.textAmber500 : styles.textSlate400]}>{log.isPinned ? t('unpinNote') : t('pinNote')}</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleArchiveLog(log.id!, !log.isArchived)}>
                                  {archivingId == log.id && isArchiving ? <Spinner /> : <Text style={styles.actionBtnBase}>{log.isArchived ? t('restoreNote') : t('archiveNote')}</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleEditInit(log)}>
                                  <Text style={styles.actionBtnBase}>{t('editNote')}</Text>
                                </TouchableOpacity>
                                {log.history && log.history.length > 0 && (
                                  <TouchableOpacity onPress={() => setShowHistoryId(isShowingHistory ? null : log.id)}>
                                    <Text style={[styles.actionBtnBase, isShowingHistory ? styles.textPrimary : styles.textSlate400]}>{isShowingHistory ? 'Hide History' : 'View History'}</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            )}
                          </View>
                        </View>

                        {isShowingHistory && log.history && (
                          <View style={styles.historySection}>
                            <View style={styles.historyHeaderRow}>
                              <View style={styles.lineFlexSlate100} />
                              <Text style={styles.historyHeaderText}>{t('revisionHistory')}</Text>
                              <View style={styles.lineFlexSlate100} />
                            </View>
                            <View style={styles.historyList}>
                              {log.history.map((h, idx) => {
                                const author = teamMembers.find(m => m.id === h.authorId);
                                return (
                                  <View key={idx} style={styles.historyItemBlock}>
                                    <View style={styles.historyItemTitleRow}>
                                      <Text style={styles.historyItemTitleText}>
                                        Edited by {author?.name || 'Unknown Personnel'} • <Text style={styles.textSlate400}>{new Date(h.timestamp).toLocaleString()}</Text>
                                      </Text>
                                    </View>
                                    <Text style={styles.historyItemContentText}>"{h.content}"</Text>
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        {replyingToId === log.id && (
                          <View style={styles.replySectionWrapper}>
                            <View style={styles.replyBox}>
                              <Text style={styles.replyBoxHeader}>
                                {replyParentCommentId ? t('replying_to_comment_thread') : t('replying_to_original_note')}
                              </Text>
                              <TextInput
                                ref={(el) => { replyTextAreaRefs.current[log.id!] = el; }}
                                multiline
                                value={replyText}
                                onChangeText={(text) => handleTextChange(text, 'reply')}
                                onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
                                placeholder={t('describe_situational_response')}
                                style={styles.replyInputArea}
                              />

                              {replyAttachments.length > 0 && (
                                <View style={styles.replyAttachmentsGrid}>
                                  {replyAttachments.map(att => (
                                    <View key={att.id} style={styles.replyAttachmentTag}>
                                      <Text style={styles.replyAttachmentNameText} numberOfLines={1}>{att.name}</Text>
                                      <TouchableOpacity onPress={() => setReplyAttachments(prev => prev.filter(a => a.id !== att.id))}>
                                        <Text style={styles.textRose500}>×</Text>
                                      </TouchableOpacity>
                                    </View>
                                  ))}
                                </View>
                              )}

                              <View style={styles.replyActionsRow}>
                                <TouchableOpacity onPress={() => handleFileSelection('reply')} style={styles.attachBtn}>
                                  <Ionicons name="attach" size={20} color="#94a3b8" />
                                </TouchableOpacity>
                                <View style={styles.rowGap3}>
                                  <TouchableOpacity onPress={() => { setReplyingToId(null); setReplyParentCommentId(undefined); }} style={styles.cancelReplyBtn}>
                                    <Text style={styles.cancelReplyText}>{t('cancel')}</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => { if (replyText.trim() || replyAttachments.length > 0) { handleAddComment(log.id!, replyText, replyAttachments, replyParentCommentId); setReplyText(''); setReplyAttachments([]); setReplyingToId(null); setReplyParentCommentId(undefined); } }} style={styles.postReplyBtn}>
                                    <Text style={styles.postReplyBtnText}>{t('postReply')}</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          </View>
                        )}

                        <View style={styles.commentsSection}>
                          {renderThreadedComments(log)}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {activeTab === 'vault' && (
            <View style={styles.vaultSection}>
              <View style={styles.vaultHeaderRow}>
                <Text style={styles.vaultTitleText}>Security Vault • Assets</Text>
                <View style={styles.vaultCountBadge}>
                  <Text style={styles.vaultCountText}>{allVaultFiles.length} Assets</Text>
                </View>
              </View>

              {allVaultFiles.length === 0 ? (
                <View style={styles.emptyVaultCard}>
                  <Ionicons name="folder-open-outline" size={48} color="#f1f5f9" style={styles.emptyVaultIcon} />
                  <Text style={styles.emptyVaultText}>Asset Directory Empty</Text>
                </View>
              ) : (
                <View style={styles.vaultGrid}>
                  {allVaultFiles.map((file, idx) => (
                    <TouchableOpacity
                      key={`${file.id}-${idx}`}
                      onPress={() => setPreviewFile(file)}
                      style={styles.vaultItemCard}
                    >
                      <View style={styles.vaultItemThumbBox}>
                        {file.type === 'image' ? (
                          <Image source={{ uri: file.url }} style={styles.vaultItemImage} resizeMode="cover" />
                        ) : file.type === 'video' ? (
                          <Ionicons name="videocam" size={40} color="#fecdd3" />
                        ) : file.type === 'pdf' ? (
                          <Ionicons name="document-text" size={40} color="#fde68a" />
                        ) : (
                          <Ionicons name="document" size={40} color="#e2e8f0" />
                        )}
                      </View>
                      <View style={styles.vaultItemMetaBox}>
                        <Text style={styles.vaultItemNameText} numberOfLines={1}>{file.name}</Text>
                        <View style={styles.rowBetween}>
                          <Text style={styles.vaultItemSizeText}>{formatSize(file.size)}</Text>
                          <Text style={[styles.vaultItemTypeText, file.type === 'video' ? styles.textRose500 : file.type === 'pdf' ? styles.textAmber500 : styles.textIndigo500]}>{file.type}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {paginationNotesData && (
            <View style={styles.paginationBox}>
              <PaginationComponent
                currentPage={currentPage}
                totalItems={paginationNotesData.total}
                itemsPerPage={paginationNotesData.per_page}
                onPageChange={setCurrentPage}
              />
            </View>
          )}
        </View>
      </ScrollView>
      {canPostNote && activeTab === 'intel' && (
          <View style={styles.bottomCreateArea}>
            <TouchableOpacity style={styles.expandCreateBtn} onPress={() => setIsCreateNoteOpen(true)}>
              <View style={styles.expandCreateIconBox}>
                  <Ionicons name="add" size={24} color="white" />
              </View>
              <Text style={styles.expandCreateText}>{t('captureNote')}</Text>
            </TouchableOpacity>
          </View>  
      )}
      {canPostNote && (
        <CreateNoteModal
          isOpen={isCreateNoteOpen}
          onClose={() => setIsCreateNoteOpen(false)}
          language={language}
          canPostNote={canPostNote}
          availableAssignees={availableAssignees}
          customer={customer}
          onAddLog={onAddLog}
        />
      )}
    </KeyboardAvoidingView>
    
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: 'rgba(248, 250, 252, 0.3)' },
  flex1: { flex: 1 },
  scrollContent: { paddingBottom: 200 },
  contentWrapper: { maxWidth: 1024, alignSelf: 'center', width: '100%', paddingVertical: 32, paddingHorizontal: 16 },
  
  customerHeaderCard: { backgroundColor: '#ffffff', borderRadius: 32, borderColor: '#f1f5f9', borderWidth: 1, padding: 24, flexDirection: 'column', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  customerAvatarBlock: { width: 80, height: 80, backgroundColor: '#10b981', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 10 },
  customerAvatarText: { fontSize: 30, fontWeight: '900', color: '#ffffff' },
  customerInfoBlock: { flex: 1, alignItems: 'center' },
  customerNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 },
  customerNameText: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  editCustomerBtn: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 12 },
  customerCompanyText: { color: '#10b981', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 },
  personnelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 16 },
  personnelAvatars: { flexDirection: 'row', justifyContent: 'center' },
  personnelAvatarImg: { height: 32, width: 32, borderRadius: 16, borderWidth: 2, borderColor: '#ffffff', backgroundColor: '#e2e8f0' },
  personnelCountBadge: { height: 32, width: 32, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  personnelCountText: { fontSize: 8, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
  avatarOverlap: { marginLeft: -8 },

  tabsContainerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  tabsWrapper: { backgroundColor: '#f1f5f9', padding: 4, borderRadius: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', borderColor: 'rgba(226, 232, 240, 0.5)', borderWidth: 1 },
  tabButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  tabButtonActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  tabTextIntelActive: { color: '#10b981' },
  tabTextPinnedActive: { color: '#d97706' },
  tabTextVaultActive: { color: '#4f46e5' },
  tabTextArchivedActive: { color: '#334155' },
  tabTextInactive: { color: '#94a3b8' },

  logsSection: { marginTop: 32 },
  searchContainer: { position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 20, zIndex: 10 },
  searchInput: { width: '100%', paddingLeft: 56, paddingRight: 32, paddingVertical: 16, backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderWidth: 1, borderRadius: 24, fontSize: 14, fontWeight: 'bold', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  emptyLogsCard: { paddingVertical: 96, alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 40, borderColor: '#e2e8f0', borderWidth: 1, borderStyle: 'dashed', marginTop: 32 },
  emptyLogsText: { fontSize: 14, fontWeight: '900', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 2 },
  
  dateGroupContainer: { marginTop: 32 },
  dateHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  lineFlex: { height: 1, backgroundColor: '#e2e8f0', flex: 1 },
  dateHeaderText: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2 },
  logCard: { borderRadius: 32, borderWidth: 1, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  logCardPublic: { backgroundColor: '#ffffff', borderColor: '#f1f5f9' },
  logCardPrivate: { backgroundColor: '#0f172a1f', borderColor: '#1e293b99' },
  logCardJumped: { borderColor: '#10b981', borderWidth: 2 },
  logCardPinned: { borderColor: 'rgba(14, 165, 233, 0.1)', borderWidth: 2 },
  logCardInner: { padding: 24 },
  logHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  logAuthorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logAuthorAvatar: { width: 40, height: 40, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logAuthorAvatarText: { fontSize: 12, fontWeight: '900', color: '#94a3b8' },
  logAuthorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logAuthorNameText: { fontSize: 12, fontWeight: '900' },
  badgePinned: { backgroundColor: '#f59e0b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgePinnedText: { color: '#ffffff', fontSize: 8, textTransform: 'uppercase', letterSpacing: 2 },
  logMetaBox: { marginTop: 2 },
  logTimeText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: -0.5 },
  logModifiedText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', color: '#059669', letterSpacing: 2 },
  logStatusTags: { alignItems: 'flex-end', gap: 6 },
  rowGap2: { flexDirection: 'row', gap: 8 },
  rowGap4: { flexDirection: 'row', gap: 6 },
  tagPriority: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, borderWidth: 1 },
  tagUrgent: { backgroundColor: '#ef4444', borderColor: '#dc2626' },
  tagHigh: { backgroundColor: '#f43f5e', borderColor: '#be123c' },
  tagMedium: { backgroundColor: '#f59e0b', borderColor: '#d97706' },
  tagLow: { backgroundColor: 'rgba(14, 165, 233, 0.1)', borderColor: 'rgba(14, 165, 233, 0.2)' },
  tagPriorityText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  tagStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, borderWidth: 1, borderColor: 'transparent' },
  tagOpen: { backgroundColor: '#10b981' },
  tagResolved: { backgroundColor: '#2563eb' },
  tagClosed: { backgroundColor: '#475569' },
  tagStatusText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', color: '#ffffff' },
  tagPrivate: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1 },
  tagPrivateText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', color: '#cbd5e1' },

  editFormContainer: { gap: 16 },
  editTypesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  typeBtn: { paddingHorizontal: 4, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  typeBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  typeBtnInactive: { backgroundColor: '#ffffff', borderColor: '#e2e8f0' },
  typeBtnText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  editInputArea: { width: '100%', padding: 16, borderRadius: 16, borderWidth: 1, fontSize: 14, fontWeight: '500', minHeight: 140 },
  editInputPrivate: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#ffffff' },
  editInputPublic: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#334155' },
  editControlsGrid: { marginTop: 16, gap: 12 },
  editControlBox: {},
  editControlLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, paddingHorizontal: 4, marginBottom: 4 },
  editPickerWrapper: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  pickerStyle: { height: 40 },
  editActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  discardBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  discardBtnText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8' },
  saveEditBtn: { backgroundColor: '#10b981', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  saveEditBtnText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', color: '#ffffff' },

  logContentText: { fontSize: 14, fontWeight: '500', lineHeight: 22, marginBottom: 16 },
  attachmentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  attachmentCard: { width: 128, backgroundColor: '#f8fafc', borderColor: '#f1f5f9', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  attachmentThumbImg: { height: 96, width: '100%' },
  attachmentThumbIconBox: { height: 96, width: '100%', alignItems: 'center', justifyContent: 'center' },
  attachmentMetaBox: { padding: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#ffffff' },
  attachmentNameText: { fontSize: 8, fontWeight: 'bold', color: '#334155' },
  attachmentSizeText: { fontSize: 7, fontWeight: 'bold', color: '#94a3b8' },
  taskMetaRow: { flexDirection: 'row', gap: 16, marginBottom: 16, backgroundColor: 'rgba(248, 250, 252, 0.5)', padding: 12, borderRadius: 12, borderColor: '#f1f5f9', borderWidth: 1 },
  taskMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskMetaAssigneeText: { fontSize: 6, fontWeight: '900', textTransform: 'uppercase', color: '#10b981' },
  taskMetaDateText: { fontSize: 6, fontWeight: '900', textTransform: 'uppercase', color: '#f43f5e' },
  logActionsFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(241, 245, 249, 0.1)' },
  actionBtnPrimary: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', color: '#10b981' },
  actionBtnBase: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8' },

  historySection: { paddingHorizontal: 24, paddingBottom: 32 },
  historyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  lineFlexSlate100: { height: 1, backgroundColor: '#f1f5f9', flex: 1 },
  historyHeaderText: { fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2 },
  historyList: { marginTop: 16, gap: 16 },
  historyItemBlock: { paddingLeft: 24, borderLeftWidth: 2, borderLeftColor: '#f1f5f9', marginBottom: 16 },
  historyItemTitleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  historyItemTitleText: { fontSize: 10, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  historyItemContentText: { fontSize: 12, fontWeight: '500', color: '#94a3b8', fontStyle: 'italic' },

  replySectionWrapper: { paddingHorizontal: 24, paddingBottom: 24 },
  replyBox: { backgroundColor: '#f8fafc', borderRadius: 24, padding: 24, borderColor: '#f1f5f9', borderWidth: 1 },
  replyBoxHeader: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', color: 'rgba(14, 165, 233, 0.6)', marginBottom: 8 },
  replyInputArea: { width: '100%', fontSize: 14, fontWeight: 'bold', minHeight: 80, color: '#334155', marginBottom: 16 },
  replyAttachmentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  replyAttachmentTag: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  replyAttachmentNameText: { fontSize: 10, fontWeight: 'bold', maxWidth: 100 },
  replyActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  attachBtn: { padding: 8 },
  rowGap3: { flexDirection: 'row', gap: 12 },
  cancelReplyBtn: { paddingHorizontal: 16, justifyContent: 'center' },
  cancelReplyText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8' },
  postReplyBtn: { backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 12 },
  postReplyBtnText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', color: '#ffffff' },

  commentsSection: { paddingHorizontal: 24, paddingBottom: 24 },
  threadContainer: {},
  threadIndented: { marginLeft: 24, marginTop: 16, borderLeftWidth: 2, borderLeftColor: 'rgba(14, 165, 233, 0.2)', paddingLeft: 24 },
  commentContainer: { position: 'relative', marginBottom: 16 },
  threadLine: { position: 'absolute', left: -24, top: 20, width: 16, height: 1, backgroundColor: 'rgba(14, 165, 233, 0.2)' },
  rowBetweenStart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  commentHeader: { fontSize: 10, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: -0.5 },
  commentTime: { color: '#94a3b8' },
  replyChainText: { fontSize: 8, color: 'rgba(14, 165, 233, 0.4)', fontWeight: 'bold' },
  replyButton: { backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1, borderColor: '#f1f5f9', borderWidth: 1 },
  replyButtonText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', color: 'rgba(14, 165, 233, 0.6)' },
  commentContent: { fontSize: 14, fontWeight: '500', lineHeight: 22, marginBottom: 8 },
  attachmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6, backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderWidth: 1, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  attachmentImageSmall: { width: 20, height: 20, borderRadius: 4 },
  attachmentNameSmall: { fontSize: 9, fontWeight: 'bold' },

  vaultSection: { marginTop: 32 },
  vaultHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 24 },
  vaultTitleText: { fontSize: 20, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5 },
  vaultCountBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9999, borderColor: '#e0e7ff', borderWidth: 1 },
  vaultCountText: { fontSize: 10, fontWeight: '900', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 2 },
  emptyVaultCard: { paddingVertical: 96, alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 40, borderColor: '#e2e8f0', borderWidth: 1, borderStyle: 'dashed' },
  emptyVaultIcon: { marginBottom: 16 },
  emptyVaultText: { fontSize: 14, fontWeight: '900', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 2, marginTop: 16 },
  vaultGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  vaultItemCard: { backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderWidth: 1, borderRadius: 32, overflow: 'hidden', width: '48%', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  vaultItemThumbBox: { height: 128, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  vaultItemImage: { width: '100%', height: '100%' },
  vaultItemMetaBox: { padding: 16, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f8fafc' },
  vaultItemNameText: { fontSize: 10, fontWeight: '900', color: '#1e293b', marginBottom: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vaultItemSizeText: { fontSize: 8, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
  vaultItemTypeText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },

  paginationBox: { marginTop: 24, marginBottom: 80 },

  
  mentionsPopup: { position: 'absolute', bottom: 256, left: '50%', marginLeft: -128, zIndex: 100, width: 256, backgroundColor: '#ffffff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 20, borderColor: 'rgba(14, 165, 233, 0.2)', borderWidth: 1, overflow: 'hidden' },
  mentionsHeader: { padding: 12, backgroundColor: 'rgba(14, 165, 233, 0.1)', borderBottomWidth: 1, borderBottomColor: 'rgba(14, 165, 233, 0.1)' },
  mentionsHeaderText: { fontSize: 10, fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: 2 },
  mentionsList: { maxHeight: 192 },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  mentionRowSelected: { backgroundColor: 'rgba(14, 165, 233, 0.1)' },
  mentionAvatar: { width: 24, height: 24, borderRadius: 8 },
  mentionName: { fontSize: 12, fontWeight: '900', color: '#1e293b' },
  mentionRole: { fontSize: 9, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: -0.5 },
  mentionText: { fontWeight: '900', paddingHorizontal: 4, borderRadius: 4 },
  bgPrimaryTextWhite: { backgroundColor: '#10b981', color: '#ffffff' },
  bgPrimaryLightTextPrimary: { backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#10b981' },
  textWhite: { color: '#ffffff' },
  textSlate900: { color: '#0f172a' },
  textSlate600: { color: '#475569' },
  textSlate500: { color: '#64748b' },
  textSlate400: { color: '#94a3b8' },
  textSlate300: { color: '#cbd5e1' },
  textPrimary: { color: '#10b981' },
  textAmber500: { color: '#f59e0b' },
  textRose500: { color: '#f43f5e' },
  textIndigo500: { color: '#6366f1' },
  bgPrimary: { backgroundColor: '#10b981' },
  bgSlate200: { backgroundColor: '#e2e8f0' },
  bgRose50: { backgroundColor: '#fff1f2' },
  bgSlate100: { backgroundColor: '#f1f5f9' },
  typeBadge: {
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1, // Thay thế cho tracking-widest
  },
  pickerTouchable: { padding: 10, justifyContent: 'center' },
  pickerText: { fontSize: 14, color: '#334155' },
  bottomCreateArea: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 6, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 15 },
  expandCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 8 },
  expandCreateIconBox: { width: 48, height: 48, backgroundColor: '#10b981', borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  expandCreateText: { color: '#6699e0', fontWeight: 'bold', fontSize: 14 },

  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc', // Màu nền nhẹ
    borderRadius: 6,
    alignSelf: 'flex-start', // Chỉ chiếm diện tích vừa đủ nội dung
  },
  dueDateText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },


  inputGroup: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  labelSlate: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8', // slate-400
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
    paddingLeft: 4,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    // Đổ bóng nhẹ cho nút
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e293b',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
});

export default CustomerView;