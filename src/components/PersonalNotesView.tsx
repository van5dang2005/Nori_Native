import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SectionList,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator, // Thêm cái này
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomerLog, Customer, Attachment, Language, Pagination } from '@/src/types/types';
import { TRANSLATIONS } from '@/src/constants/constants';
import PaginationComponent from './Pagination';

interface PersonalNotesViewProps {
  logs: CustomerLog[];
  pagination: Pagination;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  currentUserId: string;
  onSelectLog: (customerId: string, logId: string) => void;
  language: Language;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isLoading: boolean; // Đã có trong props
  priority: string;
  setPriority: (priority: string) => void;
}

const PersonalNotesView: React.FC<PersonalNotesViewProps> = ({
  logs,
  pagination,
  currentPage,
  setCurrentPage,
  currentUserId,
  onSelectLog,
  language,
  searchTerm,
  setSearchTerm,
  isLoading,
  priority,
  setPriority,
}) => {
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');

  const t = (key: string) => TRANSLATIONS[language][key] || key;

  // ... (Giữ nguyên logic useMemo lọc logs và sections)
  const privateLogs = useMemo(() => logs.filter((l) => l.authorId === currentUserId), [logs, currentUserId]);
  
  const filteredLogs = useMemo(() => {
    let result = [...privateLogs];
    if (searchTerm.trim()) result = result.filter((l) => l.content?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (customerFilter !== 'all') result = result.filter((l) => l.customerId === customerFilter);
    if (priority !== 'all') result = result.filter((l) => l.priority === priority);
    result.sort((a, b) => dateSort === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    return result;
  }, [privateLogs, searchTerm, customerFilter, dateSort, priority]);

  const sections = useMemo(() => {
    const groups: { [key: string]: { title: string; data: CustomerLog[] } } = {};
    filteredLogs.forEach((log) => {
      const customerName = log.customer?.company || 'Unknown Account';
      if (!groups[log.customerId]) groups[log.customerId] = { title: customerName, data: [] };
      groups[log.customerId].data.push(log);
    });
    return Object.values(groups);
  }, [filteredLogs]);

  const renderLogItem = ({ item }: { item: CustomerLog }) => (
    <View style={styles.logCard}>
      {item.isPrivate && (
          <View style={styles.privateBadge}>
            <Text style={styles.privateBadgeText}>{t('privateNote')}</Text>
          </View>
      )}
      <View style={styles.logHeader}>
        <Text style={styles.logDate}>{new Date(item.timestamp).toLocaleString()}</Text>
        <View style={[styles.priorityBadge, item.priority === 'urgent' && styles.urgentBadge]}>
          <Text style={[styles.priorityText, item.priority === 'urgent' && styles.urgentText]}>
            {(item.priority || 'low').toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.logContent}>{item.content}</Text>
      <TouchableOpacity style={styles.locateBtn} onPress={() => onSelectLog(item.customerId, item.id)}>
        <Text style={styles.locateBtnText}>LOCATE IN FEED</Text>
        <Ionicons name="arrow-forward" size={12} color="#1e293b" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.mainWrapper}>
      {/* LOADING OVERLAY: Hiển thị khi đang fetch dữ liệu */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#0f172a" />
            <Text style={styles.loadingText}>SYNCING RECORDS...</Text>
          </View>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id + index}
        contentContainerStyle={[styles.scrollContainer, isLoading && { opacity: 0.5 }]} // Làm mờ danh sách khi đang load
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <View style={styles.topRow}>
              <View style={styles.brandBox}><Ionicons name="book" size={24} color="white" /></View>
              <View style={styles.titleInfo}>
                <Text style={styles.mainTitle}>{t('personalNotes')}</Text>
                <Text style={styles.subTitle}>SITUATIONAL INTELLIGENCE</Text>
              </View>
            </View>
            {/* ... (Phần Search Bar và Filter giữ nguyên) */}
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.statusDot} />
            <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
            <View style={styles.horizontalLine} />
          </View>
        )}
        renderItem={renderLogItem}
        ListEmptyComponent={
          !isLoading ? ( // Chỉ hiện EmptyState khi không còn load
            <View style={styles.emptyBox}>
              <Ionicons name="file-tray-outline" size={60} color="#f1f5f9" />
              <Text style={styles.emptyLabel}>NO RECORDS FOUND</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          pagination && (
            <View style={styles.footer}>
              <PaginationComponent
                currentPage={currentPage}
                totalItems={pagination.total}
                itemsPerPage={pagination.per_page}
                onPageChange={setCurrentPage}
              />
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#fff' },
  // CSS mới cho Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 99,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    // Shadow cho iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    // Shadow cho Android
    elevation: 5,
  },
  loadingText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
  },
  // Các styles cũ
  scrollContainer: { padding: 20, paddingBottom: 60 },
  headerArea: { marginBottom: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  brandBox: { width: 52, height: 52, backgroundColor: '#0f172a', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleInfo: { marginLeft: 15 },
  mainTitle: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
  subTitle: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 15 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981', marginRight: 10 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: '#1e293b', letterSpacing: 1 },
  horizontalLine: { flex: 1, height: 1, backgroundColor: '#f1f5f9', marginLeft: 10 },
  logCard: { backgroundColor: 'white', padding: 20, borderRadius: 28, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  logDate: { fontSize: 9, fontWeight: '700', color: '#cbd5e1' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#f8fafc' },
  priorityText: { fontSize: 8, fontWeight: '900', color: '#94a3b8' },
  logContent: { fontSize: 14, color: '#475569', lineHeight: 22 },
  locateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  locateBtnText: { fontSize: 10, fontWeight: '900', color: '#1e293b' },
  emptyBox: { alignItems: 'center', marginTop: 80, opacity: 0.6 },
  emptyLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', marginTop: 15 },
  footer: { marginTop: 20, paddingBottom: 40 },
  urgentBadge: { backgroundColor: '#fff1f2' },
  urgentText: { color: '#e11d48' },
  privateBadge: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  privateBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#4338ca',
    letterSpacing: 0.5,
  },
});

export default PersonalNotesView;