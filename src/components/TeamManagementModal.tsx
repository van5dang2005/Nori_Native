import React, { useState, useMemo, useEffect } from 'react';
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
} from 'react-native';
import { TeamMember, UserRole, Language } from '@/src/types/types';
import { TRANSLATIONS } from '@/src/constants/constants';
import { 
  useUsers, 
  useCreateUser, 
  useCreateManager, 
  useUpdateRole, 
  useUpdateRoleManager, 
  useUpdateArchivedStatus 
} from '@/src/hooks/useUser';
import { useDebounce } from '@/src/hooks/useDebounce';

const { width, height } = Dimensions.get('window');

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'add' | 'edit' | 'delete', member: TeamMember) => void;
  currentUserId: string;
  currentUserRole: UserRole;
  language: Language;
  onRestore: (id: string) => void;
}

const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen, onClose, onAction, currentUserId, currentUserRole, language, onRestore
}) => {
  // --- States ---
  const [isSummiting, setIsSummiting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.SALE);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // --- Hooks ---
  const debouncedSearch = useDebounce(search, 500);
  const { data: usersData, isLoading: isLoadingUsers } = useUsers(1, debouncedSearch);
  const teamMembers = usersData || [];

  const createUserMutation = useCreateUser();
  const createManagerMutation = useCreateManager();
  const updateRoleMutation = useUpdateRole();
  const updateRoleManagerMutation = useUpdateRoleManager();
  const updateArchivedStatusMutation = useUpdateArchivedStatus();

  const t = (key: string) => TRANSLATIONS[language][key] || key;
  const canManageRoles = currentUserRole === UserRole.SUPERVISOR || currentUserRole === UserRole.MANAGER;

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const archivedMembers = useMemo(() => teamMembers.filter(m => m.isArchived), [teamMembers]);
  const activeMembers = useMemo(() => teamMembers.filter(m => !m.isArchived), [teamMembers]);

  // --- Handlers ---
  const handleAdd = async () => {
    if (!newName.trim()) return Alert.alert('Error', 'Name is required');
    setIsSummiting(true);
    try {
      if (newRole === UserRole.MANAGER && currentUserRole !== UserRole.SUPERVISOR) {
        return Alert.alert('Error', 'Only supervisor can create manager');
      }

      let response;
      const payload = { name: newName, email: newEmail, role: newRole.toLowerCase() };
      
      response = newRole === UserRole.MANAGER 
        ? await createManagerMutation.mutateAsync(payload)
        : await createUserMutation.mutateAsync(payload);

      const newMember: TeamMember = {
        id: `id-${response.user.id}`,
        name: newName,
        email: newEmail,
        role: newRole,
        status: 'offline',
        avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
        isArchived: false
      };

      onAction('add', newMember);
      setNewName('');
      setNewEmail('');
      setIsAdding(false);
      setSuccessMessage(`Personnel Provisioned: ${newMember.name}`);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to provision user');
    } finally {
      setIsSummiting(false);
    }
  };

  const handleChangeRole = async (member: TeamMember, role: UserRole) => {
    setChangingRoleId(member.id);
    try {
      const payload = { email: member.email, role: role.toLowerCase() };
      if (currentUserRole === UserRole.SUPERVISOR) {
        await updateRoleManagerMutation.mutateAsync(payload);
      } else {
        await updateRoleMutation.mutateAsync(payload);
      }
      onAction('edit', { ...member, role });
      setEditingRoleId(null);
      setSuccessMessage(`Role Updated: ${member.name}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update role');
    } finally {
      setChangingRoleId(null);
    }
  };

  const handleExecuteArchive = async (member: TeamMember) => {
    setArchivingId(member.id);
    try {
      await updateArchivedStatusMutation.mutateAsync({
        id: parseInt(member.id.replace('id-', '')),
        isArchived: true
      });
      onAction('delete', member);
      setConfirmDeleteId(null);
      setSuccessMessage(`Personnel Archived: ${member.name}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to archive user');
    } finally {
      setArchivingId(null);
    }
  };

  const handleRestoreAction = async (member: TeamMember) => {
    setRestoringId(member.id);
    try {
      await updateArchivedStatusMutation.mutateAsync({
        id: parseInt(member.id.replace('id-', '')),
        isArchived: false
      });
      onRestore(member.id);
      setSuccessMessage(`Personnel Restored: ${member.name}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to restore user');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.modalContainer}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('personnelDirectory')}</Text>
              <Text style={styles.subtitle}>MANAGE ENTERPRISE ACCESS CONTROLS</Text>
            </View>
            <TouchableOpacity 
              onPress={() => { setIsAdding(!isAdding); setEditingRoleId(null); }}
              style={[styles.addButton, isAdding && styles.addButtonActive]}
            >
              <Text style={styles.addButtonText}>{isAdding ? t('closeForm') : t('provisionUser')}</Text>
            </TouchableOpacity>
          </View>

          {/* MAIN CONTENT */}
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            {successMessage && (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {/* ADD FORM */}
            {isAdding && (
              <View style={styles.addForm}>
                <Text style={styles.label}>{t('legalName')}</Text>
                <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Name" />
                <Text style={styles.label}>{t('enterpriseEmail')}</Text>
                <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
                
                <Text style={styles.label}>{t('privilegeLevel')}</Text>
                <View style={styles.roleGrid}>
                  {Object.values(UserRole)
                    .filter(r => currentUserRole === 'SUPERVISOR' ? r !== UserRole.SUPERVISOR : (r !== UserRole.SUPERVISOR && r !== UserRole.MANAGER))
                    .map(role => (
                      <TouchableOpacity key={role} onPress={() => setNewRole(role)} style={[styles.roleChip, newRole === role && styles.roleChipActive]}>
                        <Text style={[styles.roleChipText, newRole === role && styles.roleChipTextActive]}>{role}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={isSummiting}>
                  {isSummiting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{t('provisionUser')}</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* SEARCH */}
            <View style={styles.searchBox}>
              <TextInput style={styles.searchInput} placeholder={t('searchDirectory')} value={search} onChangeText={setSearch} />
            </View>

            <Text style={styles.sectionTitle}>ACTIVE PERSONNEL</Text>
            {activeMembers.length === 0 && !isLoadingUsers && (
              <View style={styles.emptyState}><Text style={styles.emptyText}>No matching personnel</Text></View>
            )}

            {activeMembers.map(member => (
              <View key={member.id} style={[styles.memberCard, member.id === currentUserId && styles.memberCardSelf]}>
                {confirmDeleteId === member.id ? (
                  <View style={styles.archiveConfirm}>
                    <Text style={styles.archiveTitle}>Archive {member.name}?</Text>
                    <View style={styles.archiveActions}>
                      <TouchableOpacity onPress={() => setConfirmDeleteId(null)} style={styles.cancelBtn}>
                        <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleExecuteArchive(member)} style={styles.confirmBtn}>
                        {archivingId === member.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmBtnText}>Archive</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.memberRow}>
                    <Image source={{ uri: member.avatar }} style={styles.avatar} />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name} {member.id === currentUserId && ' (You)'}</Text>
                      <Text style={styles.memberEmail}>{member.email}</Text>
                      
                      {editingRoleId === member.id ? (
                        <View style={styles.editRoleRow}>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {Object.values(UserRole)
                              .filter(r => currentUserRole === 'SUPERVISOR' ? r !== UserRole.SUPERVISOR : (r !== UserRole.SUPERVISOR && r !== UserRole.MANAGER))
                              .map(role => (
                                <TouchableOpacity 
                                  key={role} 
                                  onPress={() => handleChangeRole(member, role)} 
                                  style={[styles.miniRoleBtn, member.role === role && styles.miniRoleBtnActive]}
                                >
                                  {changingRoleId === member.id ? <ActivityIndicator size="small" color="#64748b" /> : <Text style={[styles.miniRoleText, member.role === role && {color: '#fff'}]}>{role}</Text>}
                                </TouchableOpacity>
                              ))}
                          </ScrollView>
                          <TouchableOpacity onPress={() => setEditingRoleId(null)}><Text style={styles.cancelLink}>Cancel</Text></TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => canManageRoles && setEditingRoleId(member.id)}>
                          <Text style={styles.memberRoleLabel}>{member.role} {canManageRoles && '• Edit'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {member.id !== currentUserId && (
                      <TouchableOpacity onPress={() => setConfirmDeleteId(member.id)} style={styles.iconBtn}>
                        <Text style={{fontSize: 16}}>📦</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}

            {/* ARCHIVED SECTION */}
            {archivedMembers.length > 0 && (
              <View style={{ marginTop: 30 }}>
                <Text style={[styles.sectionTitle, { color: '#f43f5e' }]}>DEEP ARCHIVE</Text>
                {archivedMembers.map(member => (
                  <View key={member.id} style={styles.archivedItem}>
                    <Image source={{ uri: member.avatar }} style={[styles.avatar, { width: 35, height: 35, opacity: 0.5 }]} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.archivedName}>{member.name}</Text>
                      <Text style={styles.archivedRole}>{member.role} • Archived</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRestoreAction(member)} style={styles.restoreBtn}>
                      {restoringId === member.id ? <ActivityIndicator size="small" /> : <Text style={styles.restoreBtnText}>Restore</Text>}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* FOOTER */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.exitButton}>
              <Text style={styles.exitButtonText}>{t('exitDirectory')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center' },
  dismissArea: { ...StyleSheet.absoluteFillObject },
  modalContainer: { width: width * 0.95, maxHeight: height * 0.85, backgroundColor: 'white', borderRadius: 35, overflow: 'hidden', elevation: 20 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  subtitle: { fontSize: 8, fontWeight: '900', color: '#10b981', letterSpacing: 1, marginTop: 2 },
  addButton: { backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  addButtonActive: { backgroundColor: '#94a3b8' },
  addButtonText: { color: 'white', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  scrollArea: { backgroundColor: '#f8fafc' },
  successBanner: { backgroundColor: '#10b981', padding: 12, borderRadius: 12, marginBottom: 15 },
  successText: { color: 'white', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  addForm: { backgroundColor: 'white', padding: 18, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#ecfdf5' },
  label: { fontSize: 9, fontWeight: '900', color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, fontSize: 14, marginBottom: 15 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 15 },
  roleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  roleChipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  roleChipText: { fontSize: 9, fontWeight: '900', color: '#94a3b8' },
  roleChipTextActive: { color: 'white' },
  submitBtn: { backgroundColor: '#10b981', padding: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' },
  searchBox: { marginBottom: 20 },
  searchInput: { backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 12 },
  sectionTitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  memberCard: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  memberCardSelf: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#f1f5f9' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 13, fontWeight: '900', color: '#1e293b' },
  memberEmail: { fontSize: 10, color: '#94a3b8' },
  memberRoleLabel: { fontSize: 9, fontWeight: '900', color: '#10b981', marginTop: 4 },
  iconBtn: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 10 },
  editRoleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 5 },
  miniRoleBtn: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 4 },
  miniRoleBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  miniRoleText: { fontSize: 8, fontWeight: '900', color: '#64748b' },
  cancelLink: { fontSize: 8, fontWeight: '900', color: '#f43f5e', marginLeft: 5 },
  archiveConfirm: { alignItems: 'center', padding: 5 },
  archiveTitle: { fontSize: 12, fontWeight: '900', color: '#e11d48', marginBottom: 10 },
  archiveActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecdd3' },
  confirmBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, backgroundColor: '#e11d48' },
  cancelBtnText: { color: '#e11d48', fontSize: 10, fontWeight: '900' },
  confirmBtnText: { color: 'white', fontSize: 10, fontWeight: '900' },
  archivedItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 10, borderRadius: 15, marginBottom: 8, opacity: 0.8 },
  archivedName: { fontSize: 11, fontWeight: '900', color: '#64748b' },
  archivedRole: { fontSize: 8, color: '#94a3b8', fontWeight: '900' },
  restoreBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  restoreBtnText: { fontSize: 8, fontWeight: '900', color: '#10b981' },
  emptyState: { padding: 30, alignItems: 'center' },
  emptyText: { fontSize: 10, fontWeight: '900', color: '#cbd5e1', textTransform: 'uppercase' },
  footer: { padding: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'flex-end', backgroundColor: 'white' },
  exitButton: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  exitButtonText: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }
});

export default TeamManagementModal;