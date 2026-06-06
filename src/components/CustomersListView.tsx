import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  FlatList,
  Dimensions,
  Modal  // Add this import
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Customer, Language } from '@/src/types/types';
import { TRANSLATIONS } from '@/src/constants/constants';
import PaginationComponent from './Pagination';
import { useCustomers } from '@/src/hooks/useCustomer';
import { useDebounce } from '@/src/hooks/useDebounce';
import { Picker } from '@react-native-picker/picker'; // Nhớ cài: npx expo install @react-native-picker/picker

interface CustomersListViewProps {
  onSelect: (id: string) => void;
  onAddCustomer: () => void;
  canManage: boolean;
  language: Language;
  onRestore?: (id: string) => void;
}

const CustomersListView: React.FC<CustomersListViewProps> = ({ 
  onSelect, 
  onAddCustomer, 
  canManage, 
  language, 
  onRestore 
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [currentCustomerPage, setCurrentCustomerPage] = useState(1);
  const [isModalVisible, setIsModalVisible] = useState(false);  // Add this state

  const { 
    data: customersData, 
    pagination: paginationCustomerData, 
    isLoading: isLoadingCustomers 
  } = useCustomers(
    debouncedSearch ? 1 : currentCustomerPage, 
    debouncedSearch, 
    statusFilter === 'all' ? undefined : statusFilter === 'active' ? false : true
  );

  const customers: Customer[] = customersData || [];
  const t = (key: string) => TRANSLATIONS[language][key] || key;

  const stats = useMemo(() => ({
    active: customers.filter(c => c.status === 'active').length,
    inactive: customers.filter(c => c.status === 'inactive').length
  }), [customers]);

  const renderCustomerItem = ({ item: c }: { item: Customer }) => {
    const isInactive = c.status === 'inactive';

    return (
      <TouchableOpacity 
        onPress={() => onSelect(c.id)}
        activeOpacity={0.7}
        style={[
          styles.card,
          isInactive ? styles.cardInactive : styles.cardShadow
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[
            styles.avatar,
            isInactive ? styles.avatarInactive : styles.avatarActive
          ]}>
            <Text style={[styles.avatarText, isInactive && { color: '#94a3b8' }]}>
              {c.name.charAt(0)}
            </Text>
          </View>
          
          <View style={[
            styles.badge,
            c.status === 'active' ? styles.badgeActive : 
            c.status === 'pending' ? styles.badgePending : styles.badgeInactive
          ]}>
            <Text style={[
              styles.badgeText,
              c.status === 'active' ? styles.badgeTextActive : 
              c.status === 'pending' ? styles.badgeTextPending : styles.badgeTextInactive
            ]}>
              {isInactive ? 'IN-ACTIVE' : c.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.customerName} numberOfLines={1}>{c.name}</Text>
        <Text style={styles.companyName}>{c.company.toUpperCase()}</Text>
        <Text style={styles.emailText}>{c.email}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.rolesContainer}>
            {c.allowedRoles?.slice(0, 3).map((role, idx) => (
              <View key={role} style={[styles.roleCircle, { zIndex: 10 - idx }]}>
                <Text style={styles.roleLetter}>{role.charAt(0).toUpperCase()}</Text>
              </View>
            ))}
          </View>

          {isInactive && onRestore ? (
            <TouchableOpacity 
              onPress={() => onRestore(c.id)}
              style={styles.restoreButton}
            >
              <Ionicons name="refresh" size={12} color="white" />
              <Text style={styles.restoreText}>RESTORE</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.footerLabel}>IDENTITY PROFILE</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={customers}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.headerSection}>
          <Text style={styles.title}>{t('customerDirectory')}</Text>
          <Text style={styles.subtitle}>MANAGE UNIFIED STRATEGIC ACCOUNTS</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ACTIVE</Text>
              <Text style={styles.statValue}>{stats.active}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>IN-ACTIVE</Text>
              <Text style={styles.statValue}>{stats.inactive}</Text>
            </View>
            {canManage && (
              <TouchableOpacity onPress={onAddCustomer} style={styles.addButton}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#cbd5e1" style={styles.searchIcon} />
            <TextInput
              placeholder="Search records..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.searchInput}
            />
          </View>

          <View style={styles.pickerWrapper}>
            <TouchableOpacity 
              onPress={() => setIsModalVisible(true)} 
              style={styles.showModalButton}
            >
              <Text style={styles.showModalText}>
                {statusFilter === 'all' ? t('allStatuses') : statusFilter === 'active' ? 'Active Accounts' : 'In-active Accounts'}
              </Text>
            </TouchableOpacity>
          </View>

          <Modal
            visible={isModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Picker
                  selectedValue={statusFilter}
                  onValueChange={(itemValue) => {
                    setStatusFilter(itemValue);
                    setIsModalVisible(false);
                  }}
                  style={styles.modalPicker}
                >
                  <Picker.Item label={t('allStatuses')} value="all" />
                  <Picker.Item label="Active Accounts" value="active" />
                  <Picker.Item label="In-active Accounts" value="inactive" />
                </Picker>
              </View>
            </View>
          </Modal>
        </View>
      }
      renderItem={renderCustomerItem}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#e2e8f0" />
          <Text style={styles.emptyText}>NO MATCHING SYSTEM RECORDS</Text>
        </View>
      }
      ListFooterComponent={
        paginationCustomerData && (
          <PaginationComponent 
            currentPage={paginationCustomerData.current_page} 
            totalItems={paginationCustomerData.total} 
            itemsPerPage={paginationCustomerData.per_page} 
            onPageChange={(page) => setCurrentCustomerPage(page)} 
          />
        )
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 2,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 39,
    fontWeight: '900',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 14,
    fontWeight: '600',
  },
  pickerWrapper: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardShadow: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardInactive: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarActive: {
    backgroundColor: '#f1f5f9',
  },
  avatarInactive: {
    backgroundColor: '#e2e8f0',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10b981',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeActive: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
  badgePending: { backgroundColor: '#fffbeb', borderColor: '#fef3c7' },
  badgeInactive: { backgroundColor: '#1e293b', borderColor: '#0f172a' },
  badgeText: { fontSize: 8, fontWeight: '900' },
  badgeTextActive: { color: '#16a34a' },
  badgeTextPending: { color: '#d97706' },
  badgeTextInactive: { color: '#fbbf24' },
  customerName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  companyName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 2,
  },
  emailText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  cardFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rolesContainer: {
    flexDirection: 'row',
  },
  roleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  roleLetter: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748b',
  },
  footerLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#cbd5e1',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  restoreText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#cbd5e1',
    marginTop: 16,
    letterSpacing: 1,
  },
  showModalButton: {
    padding: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    alignItems: 'center',
  },
  showModalText: {
    fontSize: 16,
    color: '#1e293b',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    padding: 10,
  },
  modalPicker: {
    width: '100%',
  },
});

export default CustomersListView;