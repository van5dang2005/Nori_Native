import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Switch
} from 'react-native';
import { ChatChannel, UserRole } from  '@/src/types/types';
import { useCreateChannel, useUpdateChannel, useDeleteChannel } from '@/src/hooks/useChannel';
import { useUsers } from '@/src/hooks/useUser';
import { useDebounce } from '@/src/hooks/useDebounce';

const { width, height } = Dimensions.get('window');

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: ChatChannel | null;
  onSubmit: (action: 'add' | 'edit' | 'delete', channel: Partial<ChatChannel>) => void;
  userRole: UserRole;
  currentUserId: string;
}

const ChannelModal: React.FC<ChannelModalProps> = ({ isOpen, onClose, channel, onSubmit, userRole, currentUserId }) => {
  const [loading, setLoading] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [type, setType] = useState<'general' | 'support' | 'urgent'>('general');
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebounce(search, 500);
  const { data: usersData, isLoading: isLoadingUsers } = useUsers(1, debouncedSearch);
  const teamMembers = usersData || [];

  const createChannelMutation = useCreateChannel();
  const updateChannelMutation = useUpdateChannel();
  const deleteChannelMutation = useDeleteChannel();

  useEffect(() => {
    if (isOpen) {
      setName(channel?.name || '');
      setDescription(channel?.description || '');
      setType(channel?.type || 'general');
      setIsPrivate(channel?.is_private || false);
      setAllowedUserIds(channel?.user_ids?.map(id => 'id-' + id) || []);
      setIsConfirmingDelete(false);
    }
  }, [channel, isOpen]);

  const filteredTeamMembers = useMemo(() => {
    const base = teamMembers.filter(m => 
      m.id !== currentUserId && 
      m.role !== UserRole.SUPERVISOR && 
      m.role !== UserRole.MANAGER
    );
    const q = search.trim().toLowerCase();
    return q ? base.filter(m => m.name.toLowerCase().includes(q)) : base;
  }, [teamMembers, currentUserId, search]);

  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Channel label is required.');
    
    try {
      setLoading(true);
      const payload = {
        name,
        description,
        type,
        is_private: isPrivate,
        user_ids: allowedUserIds.map(id => id.replace('id-', ''))
      };

      if (!channel) {
        const res = await createChannelMutation.mutateAsync(payload);
        onSubmit('add', { id: res.id, name, description, type });
      } else {
        const cleanId = channel.id.toString().startsWith("ch-") ? channel.id.slice(3) : channel.id;
        await updateChannelMutation.mutateAsync({ id: cleanId, payload });
        onSubmit('edit', { id: channel.id, name, description, type });
      }
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to save channel configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      setLoadingDelete(true);
      const cleanId = channel!.id.toString().startsWith("ch-") ? channel!.id.slice(3) : channel!.id;
      await deleteChannelMutation.mutateAsync(cleanId);
      onSubmit('delete', { id: channel!.id });
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete channel.');
    } finally {
      setLoading(false);
      setLoadingDelete(false);
    }
  };

  const toggleUser = (userId: string) => {
    setAllowedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.dismissArea} 
          activeOpacity={1} 
          onPress={() => !loading && onClose()} 
        />
        
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {channel ? 'Modify Strategic Hub' : 'New Coordination Channel'}
            </Text>
            <Text style={styles.subtitle}>DEFINE PLATFORM COMMUNICATION PERIMETERS</Text>
          </View>

          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            {/* Input Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Channel Label</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Audit Support"
                placeholderTextColor="#cbd5e1"
              />
            </View>

            {/* Input Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Intel Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Hub purpose and coordination scope..."
                placeholderTextColor="#cbd5e1"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Priority Classification */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority Classification</Text>
              <View style={styles.typeGrid}>
                {[
                  { id: 'general', label: 'General', color: '#059669' },
                  { id: 'support', label: 'Support', color: '#4f46e5' },
                  { id: 'urgent', label: 'Urgent', color: '#e11d48' }
                ].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setType(t.id as any)}
                    style={[
                      styles.typeBtn,
                      type === t.id ? { backgroundColor: t.color, borderColor: t.color } : styles.typeBtnInactive
                    ]}
                  >
                    <Text style={[styles.typeBtnText, type === t.id && { color: '#fff' }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Private Toggle */}
            <View style={styles.privacySection}>
              <View style={styles.privacyHeader}>
                <Text style={styles.labelBlack}>Access Perimeter</Text>
                <View style={styles.switchWrapper}>
                  <Text style={[styles.privacyStatus, { color: isPrivate ? '#e11d48' : '#059669' }]}>
                    {isPrivate ? 'Restricted' : 'Public'}
                  </Text>
                  <Switch
                    value={isPrivate}
                    onValueChange={(val) => {
                      setIsPrivate(val);
                      if (val) setAllowedUserIds([]);
                    }}
                    trackColor={{ false: '#e2e8f0', true: '#10b981' }}
                  />
                </View>
              </View>

              {isPrivate && (
                <View style={styles.userSelection}>
                  <Text style={styles.label}>Permitted Team</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    value={search}
                    onChangeText={setSearch}
                  />
                  <View style={styles.userGrid}>
                    {filteredTeamMembers.map(member => (
                      <TouchableOpacity
                        key={member.id}
                        onPress={() => toggleUser(member.id)}
                        style={[
                          styles.userChip,
                          allowedUserIds.includes(member.id) && styles.userChipActive
                        ]}
                      >
                        <Image source={{ uri: member.avatar }} style={styles.miniAvatar} />
                        <Text style={styles.userChipText} numberOfLines={1}>{member.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Delete Section */}
            {channel && (
              <View style={styles.deleteSection}>
                {!isConfirmingDelete ? (
                  <TouchableOpacity 
                    style={styles.deleteInitBtn} 
                    onPress={() => setIsConfirmingDelete(true)}
                  >
                    <Text style={styles.deleteInitText}>Delete Strategic Hub</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmText}>ARE YOU ABSOLUTELY SURE?</Text>
                    <View style={styles.confirmActions}>
                      <TouchableOpacity 
                        style={styles.abortBtn} 
                        onPress={() => setIsConfirmingDelete(false)}
                      >
                        <Text style={styles.abortText}>Abort</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.confirmDeleteBtn} 
                        onPress={handleDelete}
                      >
                        {loadingDelete ? <ActivityIndicator size="small" color="#e11d48" /> : <Text style={styles.confirmDeleteText}>Confirm Delete</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.discardBtn} onPress={onClose}>
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading && !loadingDelete ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {channel ? 'Update Configuration' : 'Establish Hub'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.85,
    backgroundColor: 'white',
    borderRadius: 32,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 10 }
    })
  },
  header: {
    padding: 24,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    marginTop: 4,
    letterSpacing: 1,
  },
  formContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
  },
  labelBlack: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeBtnInactive: {
    backgroundColor: 'white',
    borderColor: '#f1f5f9',
  },
  typeBtnText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#94a3b8',
  },
  privacySection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 20,
  },
  privacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyStatus: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  userSelection: {
    marginTop: 16,
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  userGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: 'white',
    width: '48%',
  },
  userChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  userChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  deleteSection: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  deleteInitBtn: {
    padding: 12,
    backgroundColor: '#fff1f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    alignItems: 'center',
  },
  deleteInitText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#e11d48',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  confirmBox: {
    backgroundColor: '#e11d48',
    padding: 16,
    borderRadius: 20,
  },
  confirmText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  abortBtn: {
    flex: 1,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    alignItems: 'center',
  },
  abortText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  confirmDeleteBtn: {
    flex: 1,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#e11d48',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  discardBtn: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  discardText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});

export default ChannelModal;