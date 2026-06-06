import React, { useMemo, useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Image, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Customer, UserRole } from '../types/types';
import { useCreateCustomer } from '@/src/hooks/useCustomer';
import { useUsers } from '@/src/hooks/useUser';
import { useDebounce } from '@/src/hooks/useDebounce';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newCustomer: Omit<Customer, 'id' | 'lastActivity' | 'status'>) => void;
  currentUserId: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onSubmit, currentUserId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [allowedRoles, setAllowedRoles] = useState<UserRole[]>([UserRole.SALE]);
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebounce(search, 500);
  const { data: usersData, isLoading: isLoadingUsers } = useUsers(1, debouncedSearch);
  const teamMembers = usersData || [];
  const createCustomerMutation = useCreateCustomer();

  const filteredTeamMembers = useMemo(() => {
    const base = teamMembers.filter(m =>
      m.id !== currentUserId &&
      m.role !== UserRole.SUPERVISOR &&
      m.role !== UserRole.MANAGER
    );
    const q = search.trim().toLowerCase();
    return q ? base.filter(m => m.name.toLowerCase().includes(q)) : base;
  }, [teamMembers, currentUserId, search]);

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
      Alert.alert("Error", "Please fill in the email field.");
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

      const res = await createCustomerMutation.mutateAsync({
        name,
        company,
        email,
        status: 'active',
        is_public: isPublic,
        is_sale: allowedRoles.includes(UserRole.SALE),
        is_viewer: allowedRoles.includes(UserRole.VIEWER),
        is_logistics: allowedRoles.includes(UserRole.LOGISTICS),
        assign_users: allowedUserIds.map(id => Number(id.replace('id-', ''))) || null
      });

      if (!res) throw new Error('Failed to create');

      onSubmit({
        name,
        company,
        email,
        allowedRoles: isPublic ? [UserRole.SALE, UserRole.VIEWER] : allowedRoles,
        allowedUserIds: isPublic ? [] : allowedUserIds,
        isPublic
      });

      // Reset form
      setName(''); setCompany(''); setEmail(''); setIsPublic(true);
      setAllowedRoles([UserRole.SALE]); setAllowedUserIds([]);
      onClose();
    } catch (err) {
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Register New Customer</Text>
            <Text style={styles.headerSubtitle}>SETUP PROFILE AND ACCESS PERIMETERS</Text>
          </View>

          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            {/* Input Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Customer Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Jane Doe"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Grid-like inputs */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Organization</Text>
                <TextInput
                  style={styles.input}
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Acme Corp"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="jane@acme.com"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Access Perimeter Toggle */}
            <View style={styles.accessSection}>
              <View style={styles.accessHeader}>
                <Text style={styles.sectionLabel}>Access Perimeter</Text>
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => togglePublic(!isPublic)}
                >
                  <Text style={[styles.statusText, { color: isPublic ? '#059669' : '#e11d48' }]}>
                    {isPublic ? 'PUBLIC' : 'RESTRICTED'}
                  </Text>
                  <View style={[styles.toggleBg, isPublic ? styles.toggleOn : styles.toggleOff]}>
                    <View style={[styles.toggleCircle, isPublic ? { right: 2 } : { left: 2 }]} />
                  </View>
                </TouchableOpacity>
              </View>

              {!isPublic && (
                <View style={styles.restrictedContainer}>
                  <Text style={styles.label}>Allowed Roles</Text>
                  <View style={styles.roleGrid}>
                    {[UserRole.SALE, UserRole.VIEWER, UserRole.LOGISTICS].map(role => (
                      <TouchableOpacity
                        key={role}
                        onPress={() => toggleRole(role)}
                        style={[
                          styles.roleButton,
                          allowedRoles.includes(role) && styles.roleButtonActive
                        ]}
                      >
                        <Text style={[
                          styles.roleButtonText,
                          allowedRoles.includes(role) && styles.whiteText
                        ]}>{role}</Text>
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
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>SAVE CUSTOMER</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: '#fff',
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  header: {
    padding: 24,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
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
    paddingHorizontal: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  row: {
    flexDirection: 'row',
  },
  accessSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  accessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    marginRight: 8,
  },
  toggleBg: {
    width: 40,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: '#10b981' },
  toggleOff: { backgroundColor: '#e2e8f0' },
  toggleCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    position: 'absolute',
  },
  restrictedContainer: {
    marginTop: 8,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  roleButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
  },
  whiteText: { color: '#fff' },
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
  footer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
  },
});

export default AddCustomerModal;