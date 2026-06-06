import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Customer, UserRole, TeamMember, Language } from '@/src/types/types';
import { TRANSLATIONS } from '@/src/constants/constants';
import { useUpdateCustomer, useArchiveCustomer } from '@/src/hooks/useCustomer';
import { useUsers } from '@/src/hooks/useUser';
import { useDebounce } from '@/src/hooks/useDebounce';

const { width } = Dimensions.get('window');

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onUpdate: (updated: Customer) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  currentUserId: string;
  userRole: UserRole;
  language: Language;
}

const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen, onClose, customer, onUpdate, currentUserId, language
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(customer.name);
  const [company, setCompany] = useState(customer.company);
  const [email, setEmail] = useState(customer.email);
  const [isPublic, setIsPublic] = useState(customer.isPublic ?? true);
  const [allowedRoles, setAllowedRoles] = useState<UserRole[]>(customer.allowedRoles || [UserRole.SALE]);
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(customer.allowedUserIds || []);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebounce(search, 500);
  const { data: usersData } = useUsers(1, debouncedSearch);
  const teamMembers = usersData || [];

  const t = (key: string) => TRANSLATIONS[language]?.[key] || key;
  const isArchived = customer.isArchived;

  const updateCustomerMutation = useUpdateCustomer();
  const archiveCustomerMutation = useArchiveCustomer();

  useEffect(() => {
    if (isOpen) {
      setName(customer.name);
      setCompany(customer.company);
      setEmail(customer.email);
      setIsPublic(customer.isPublic ?? true);
      setAllowedRoles(customer.allowedRoles || [UserRole.SALE]);
      setAllowedUserIds(customer.allowedUserIds || []);
      setShowArchiveConfirm(false);
    }
  }, [isOpen, customer]);

  const toggleRole = (role: UserRole) => {
    setAllowedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
    const hasRoles = allowedRoles.includes(UserRole.SALE) ||
      allowedRoles.includes(UserRole.VIEWER) ||
      allowedRoles.includes(UserRole.LOGISTICS);
    if (hasRoles) {
      setAllowedUserIds([]);
    }
  };

  const toggleUser = (userId: string) => {
    setAllowedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const togglePublic = (value: boolean) => {
    setIsPublic(value);
    if (value) {
      setAllowedUserIds([]);
      setAllowedRoles([UserRole.SALE, UserRole.VIEWER, UserRole.LOGISTICS]);
    }
  };

  const handleSubmit = async () => {
    if (!email) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      const hasMainRoles = allowedRoles.includes(UserRole.SALE) ||
        allowedRoles.includes(UserRole.VIEWER) ||
        allowedRoles.includes(UserRole.LOGISTICS);
      if (isPublic || hasMainRoles) {
        setAllowedRoles([]);
      }
      const res = await updateCustomerMutation.mutateAsync({
        id: customer.id,
        payload: {
          name, company, email,
          is_public: isPublic,
          is_sale: allowedRoles.includes(UserRole.SALE),
          is_viewer: allowedRoles.includes(UserRole.VIEWER),
          is_logistics: allowedRoles.includes(UserRole.LOGISTICS),
          is_archived: isArchived,
          assign_users: allowedUserIds.map(id => Number(id.replace('id-', '')))
        }
      });
      if (res) {
        onUpdate({ ...customer, name, company, email, isPublic });
        onClose();
      }
    } catch (err) {
      Alert.alert('Error', 'Update failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTeamMembers = useMemo(() => {
    const base = teamMembers.filter(m => m.id !== currentUserId && m.role !== UserRole.SUPERVISOR);
    return search ? base.filter(m => m.name.toLowerCase().includes(search.toLowerCase())) : base;
  }, [teamMembers, currentUserId, search]);

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalContainer}>
          {showArchiveConfirm ? (
            <View style={styles.archiveContainer}>
              <View style={styles.warningIconCircle}>
                <Ionicons name="trash-outline" size={40} color="#f43f5e" />
              </View>
              <Text style={styles.archiveTitle}>Set to In-active?</Text>
              <Text style={styles.archiveSubText}>Moving {customer.company} to In-active will restrict access.</Text>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => { }}>
                <Text style={styles.confirmBtnText}>CONFIRM IN-ACTIVE</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowArchiveConfirm(false)}>
                <Text style={styles.cancelLink}>ABORT & RETURN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View>
                  <Text style={styles.headerTitle}>Customer Settings</Text>
                  <Text style={styles.headerSub}>MANAGE VISIBILITY</Text>
                </View>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#cbd5e1" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>FULL NAME</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} />

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>{t('organization').toUpperCase()}</Text>
                    <TextInput style={styles.input} value={company} onChangeText={setCompany} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.label}>EMAIL</Text>
                    <TextInput style={styles.input} value={email} onChangeText={setEmail} />
                  </View>
                </View>

                <View style={styles.accessSection}>
                  <View style={styles.accessRow}>
                    <Text style={styles.accessLabel}>ACCESS LEVEL</Text>
                    <TouchableOpacity style={styles.toggleRow} onPress={() => togglePublic(!isPublic)}>
                      <Text style={[styles.toggleText, { color: isPublic ? '#10b981' : '#f43f5e' }]}>
                        {isPublic ? 'PUBLIC' : 'RESTRICTED'}
                      </Text>
                      <View style={[styles.toggleTrack, { backgroundColor: isPublic ? '#10b981' : '#e2e8f0' }]}>
                        <View style={[styles.toggleThumb, { alignSelf: isPublic ? 'flex-end' : 'flex-start' }]} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {!isPublic && (
                    <View style={styles.restrictedBody}>
                      <Text style={styles.label}>ALLOWED ROLES</Text>
                      <View style={styles.row}>
                        {[UserRole.SALE, UserRole.VIEWER, UserRole.LOGISTICS].map(role => (
                          <TouchableOpacity
                            key={role}
                            onPress={() => toggleRole(role)}
                            style={[styles.roleBtn, allowedRoles.includes(role) && styles.roleBtnActive]}
                          >
                            <Text style={[styles.roleBtnText, allowedRoles.includes(role) && styles.roleBtnTextActive]}>{role}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {allowedRoles.length === 0 && (
                        <View style={styles.teamSection}>
                          <Text style={styles.label}>Permitted Team</Text>
                          <View style={styles.searchContainer}>
                            <Ionicons name="search" size={16} color="#cbd5e1" style={styles.searchIcon} />
                            <TextInput
                              style={styles.searchInput}
                              placeholder="Search users..."
                              value={search}
                              onChangeText={setSearch}
                            />
                          </View>

                          <View style={styles.userGrid}>
                            {filteredTeamMembers.map(member => (
                              <TouchableOpacity
                                key={member.id}
                                onPress={() => toggleUser(member.id)}
                                style={[
                                  styles.userCard,
                                  allowedUserIds.includes(member.id) && styles.userCardActive
                                ]}
                              >
                                <Image source={{ uri: member.avatar }} style={styles.avatar} />
                                <Text numberOfLines={1} style={styles.userName}>{member.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>UPDATE PROFILE</Text>}
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  modalContainer: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 32, overflow: 'hidden', maxHeight: '85%' },
  header: { padding: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  headerSub: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  body: { padding: 24 },
  label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 20, fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', marginBottom: 20 },
  accessSection: { marginTop: 8, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  accessRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accessLabel: { fontSize: 10, fontWeight: '900', color: '#1e293b' },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleText: { fontSize: 10, fontWeight: '900', marginRight: 8 },
  toggleTrack: { width: 36, height: 18, borderRadius: 10, padding: 2 },
  toggleThumb: { width: 14, height: 14, backgroundColor: '#fff', borderRadius: 7 },
  restrictedBody: { marginTop: 20 },
  roleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginHorizontal: 4 },
  roleBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  roleBtnText: { fontSize: 9, fontWeight: '900', color: '#94a3b8' },
  roleBtnTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#0f172a', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  submitBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  archiveContainer: { padding: 40, alignItems: 'center' },
  warningIconCircle: { width: 80, height: 80, backgroundColor: '#fff1f2', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  archiveTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b', marginBottom: 8 },
  archiveSubText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  confirmBtn: { width: '100%', backgroundColor: '#e11d48', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  cancelLink: { color: '#94a3b8', fontWeight: '900', fontSize: 11 },
  teamSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: '700',
  },
  userGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  userCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  userName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
});

export default EditCustomerModal;