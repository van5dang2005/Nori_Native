import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
  Dimensions
} from 'react-native';
import { 
  Customer, UserRole, TeamMember, LogPriority, LogStatus, 
  Language, LogType, LogCategory, Attachment 
} from '@/src/types/types';
import * as DocumentPicker from 'expo-document-picker'; // 1. Import thư viện
import { TRANSLATIONS } from '@/src/constants/constants';
import { useCreateNote } from '@/src/hooks/useNote';
import { CreateNotePayload } from '@/src/services/noteService';
import { useCustomers } from '@/src/hooks/useCustomer';
import { useDebounce } from '@/src/hooks/useDebounce';
// Giả định bạn dùng expo-document-picker cho việc chọn file
// import * as DocumentPicker from 'expo-document-picker';

interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  addLog: (...args: any[]) => void;
  userRole: UserRole;
  currentUserId: string;
  teamMembers: TeamMember[];
  initialCustomerId?: string;
  language: Language;
}

interface AttachmentFile {
  file: any; // Trong RN thường là object {uri, name, type}
  preview: string;
  name: string;
  size?: number;
}

const QuickNoteModal: React.FC<QuickNoteModalProps> = ({
  isOpen,
  addLog,
  onClose,
  userRole,
  currentUserId,
  teamMembers,
  initialCustomerId,
  language,
}) => {
  const [targetCustomerId, setTargetCustomerId] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [logType, setLogType] = useState<LogType>('General');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentFile[]>([]);
  
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers(1, debouncedSearch);
  const { mutate: createNote, isPending } = useCreateNote();
  
  const customers: Customer[] = customersData || [];
  const t = (key: string) => TRANSLATIONS[language][key] || key;

  // Logic filter customers (Giữ nguyên từ code cũ)
  const allowedCustomers = useMemo(() => {
    return customers.filter(c => {
      if (userRole === UserRole.SUPERVISOR || userRole === UserRole.MANAGER) return true;
      if (c.isPublic) return true;
      if (c.allowedUserIds?.includes(currentUserId)) return true;
      if (c.allowedRoles?.includes(userRole)) return true;
      return false;
    });
  }, [customers, userRole, currentUserId]);
  useEffect(() => {
    if (isOpen) {
      const defaultId = (initialCustomerId && allowedCustomers.some(c => c.id === initialCustomerId))
        ? initialCustomerId
        : (allowedCustomers[0]?.id || '');

      setTargetCustomerId(defaultId);
      setContent('');
      setIsPrivate(false);
      setLogType('General');
      setShowMentions(false);
      setAttachmentFiles([]);
    }
  }, [isOpen, initialCustomerId, allowedCustomers]); // <--- Chú ý ở đây


  const handleInputChange = (text: string) => {
    setContent(text);
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
    const lastAtSymbol = content.lastIndexOf('@');
    const newText = content.substring(0, lastAtSymbol) + `@${member.name} `;
    setContent(newText);
    setShowMentions(false);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled) {
        const newFiles: AttachmentFile[] = result.assets.map(asset => ({
          file: {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType,
            size: asset.size,
          },
          preview: asset.uri, // Với ảnh có thể dùng uri làm preview
          name: asset.name,
          size: asset.size,
        }));
        
        setAttachmentFiles(prev => [...prev, ...newFiles]);
      }
    } catch (err) {
      console.error("Lỗi chọn file:", err);
    }
  };
// 3. Logic xóa file đã chọn
  const removeAttachment = (index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 4. Helper định dạng kích thước (giống bản Web)
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  const handleSubmit = () => {
    if ((!content.trim() && attachmentFiles.length === 0) || !targetCustomerId) return;

    const payload: CreateNotePayload = {
      content,
      category: 'quick_note',
      log_type: logType,
      priority: 'medium',
      status: 'open',
      is_private: isPrivate,
      // Gửi mảng file object {uri, name, type}
      attachments: attachmentFiles.map(att => att.file),
    };

    createNote(
      { customerID: targetCustomerId, payload },
      {
        onSuccess: (response) => {
          // Lưu ý: Cần truyền attachments vào addLog để UI cập nhật ngay
          addLog(
            response.id.toString(), 
            targetCustomerId, 
            content, 
            'quick_note', 
            isPrivate, 
            attachmentFiles.map(a => a.file), // Cập nhật tham số này
            'medium', 
            undefined, 
            undefined, 
            response.timestamp, 
            response.status, 
            logType
          );
          onClose();
        },
      }
    );
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{t('quickNote')}</Text>
              <Text style={styles.headerSubtitle}>INSTANT INTELLIGENCE ENTRY</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            {/* Customer Search & Visibility */}
            <Text style={styles.label}>CUSTOMER & VISIBILITY</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Search customers..."
                value={search}
                onChangeText={setSearch}
              />
              <TouchableOpacity 
                style={[styles.visibilityBtn, isPrivate && styles.visibilityBtnActive]}
                onPress={() => setIsPrivate(!isPrivate)}
              >
                <Text style={[styles.visibilityText, isPrivate && styles.whiteText]}>
                  {isPrivate ? 'PRIVATE' : 'SHARED'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Customer Selector (Simplified for Mobile) */}
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 10}}>
                {allowedCustomers.map(c => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[styles.customerTag, targetCustomerId === c.id && styles.customerTagActive]}
                    onPress={() => setTargetCustomerId(c.id)}
                  >
                    <Text style={[styles.customerTagText, targetCustomerId === c.id && styles.whiteText]}>
                      {c.company}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Note Classification */}
            <Text style={styles.label}>NOTE CLASSIFICATION</Text>
            <View style={styles.typeContainer}>
              {['PO', 'Complaint', 'Document', 'Price', 'General'].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setLogType(type as LogType)}
                  style={[styles.typeBtn, logType === type && styles.typeBtnActive]}
                >
                  <Text style={[styles.typeBtnText, logType === type && styles.whiteText]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Content Area */}
            <View style={styles.contentHeader}>
              <Text style={styles.label}>{t('noteDetails')}</Text>
              <TouchableOpacity onPress={pickDocument}>
                <Text style={styles.attachText}>📎 ATTACH FILE</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={content}
              onChangeText={handleInputChange}
              placeholder="Capture dynamics... @Name to alert team."
            />
            {attachmentFiles.length > 0 && (
              <View style={styles.attachmentList}>
                {attachmentFiles.map((att, idx) => (
                  <View key={idx} style={styles.attachmentItem}>
                    <View style={styles.attachmentInfo}>
                       <Text style={styles.attachmentName} numberOfLines={1}>{att.name}</Text>
                       <Text style={styles.attachmentSize}>{formatSize(att.size)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeAttachment(idx)} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Mentions List Overlay-like */}
            {showMentions && (
              <View style={styles.mentionsList}>
                {teamMembers.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).map(member => (
                  <TouchableOpacity key={member.id} style={styles.mentionItem} onPress={() => insertMention(member)}>
                    <Text style={styles.mentionName}>{member.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity 
              style={[styles.submitBtn, (!content.trim() || isPending) && styles.disabledBtn]} 
              onPress={handleSubmit}
              disabled={!content.trim() || isPending}
            >
              {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{t('saveQuickNote')}</Text>}
            </TouchableOpacity>
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f0fdf4',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 1,
  },
  closeButton: {
    fontSize: 20,
    color: '#94a3b8',
    padding: 8,
  },
  form: {
    padding: 24,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  visibilityBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  visibilityBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  visibilityText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  customerTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    marginRight: 8,
  },
  customerTagActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  customerTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  whiteText: {
    color: '#fff',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  typeBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  typeBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10b981',
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 16,
    height: 120,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  mentionsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 10,
  },
  mentionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  mentionName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  attachmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: '100%',
  },
  attachmentInfo: {
    marginRight: 8,
  },
  attachmentName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    maxWidth: 150,
  },
  attachmentSize: {
    fontSize: 9,
    color: '#94a3b8',
  },
  removeBtn: {
    backgroundColor: '#cbd5e1',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  }
});

export default QuickNoteModal;