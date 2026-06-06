import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SectionList, 
  StyleSheet, 
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Customer, CustomerLog, ChatMessage, Language } from '@/src/types/types';
import { TRANSLATIONS } from '@/src/constants/constants';
import { useCustomers } from '@/src/hooks/useCustomer';
import { useNotes } from '@/src/hooks/useNote';
import { useDebounce } from '@/src/hooks/useDebounce';

interface SearchResultsViewProps {
  term: string;
  activeFilter?: 'none' | 'urgent' | 'deadlines' | 'all-logs' | 'pinned' | 'health';
  onClearFilter?: () => void;
  messages: ChatMessage[];
  onSelectCustomer: (id: string) => void;
  onSelectLog: (customerId: string, logId: string) => void;
  onSelectChat: (id: string) => void;
  language: Language;
}

const { width } = Dimensions.get('window');

const SearchResultsView: React.FC<SearchResultsViewProps> = ({ 
  term, activeFilter = 'none', onClearFilter, messages, onSelectCustomer, onSelectLog, onSelectChat, language
}) => {
  const query = term.toLowerCase();
  const debouncedSearch = useDebounce(term, 500);
  
  const { data: customersData } = useCustomers(1, debouncedSearch);
  const customers: Customer[] = customersData || [];
  
  const { data: notesData } = useNotes({ search: debouncedSearch, page: 1 });
  const logs: CustomerLog[] = notesData || [];

  const t = (key: string) => TRANSLATIONS[language][key] || key;

  const results = useMemo(() => {
    if (activeFilter !== 'none') {
      let filteredLogs = logs.filter(l => customers.some(c => c.id === l.customerId));
      
      if (activeFilter === 'urgent') filteredLogs = filteredLogs.filter(l => l.priority === 'urgent');
      else if (activeFilter === 'deadlines') filteredLogs = filteredLogs.filter(l => l.dueDate && l.dueDate > Date.now());
      else if (activeFilter === 'pinned') filteredLogs = filteredLogs.filter(l => l.isPinned);
      
      return { 
        customers: [], 
        logs: [...filteredLogs].sort((a, b) => b.timestamp - a.timestamp), 
        messages: [] 
      };
    }

    if (!query) return { customers: [], logs: [], messages: [] };

    return {
      customers: customers,
      logs: logs,
      messages: messages.filter(m => m.text.toLowerCase().includes(query))
    };
  }, [query, activeFilter, logs, customers, messages]);

  // Cấu trúc lại dữ liệu cho SectionList
  const sections = useMemo(() => [
    { title: `CUSTOMER MATCHES (${results.customers.length})`, data: results.customers, type: 'customer' },
    { title: `RELEVANT LOGS (${results.logs.length})`, data: results.logs, type: 'log' },
    { title: `MESSAGE HISTORY (${results.messages.length})`, data: results.messages, type: 'message' },
  ].filter(section => section.data.length > 0), [results]);

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    return `${date.toLocaleDateString()} • ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getHeaderTitle = () => {
    if (activeFilter === 'urgent') return t('urgentAlerts');
    if (activeFilter === 'deadlines') return t('criticalDeadlines');
    if (activeFilter === 'pinned') return "Pinned Strategic Intel";
    return "System Search";
  };

  const renderItem = ({ item, section }: { item: any, section: any }) => {
    if (section.type === 'customer') {
      const c = item as Customer;
      return (
        <TouchableOpacity style={styles.customerCard} onPress={() => onSelectCustomer(c.id)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{c.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{c.name}</Text>
            <Text style={styles.cardSub}>{c.company.toUpperCase()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
        </TouchableOpacity>
      );
    }

    if (section.type === 'log') {
      const l = item as CustomerLog;
      const cust = customers.find(c => c.id === l.customerId);
      const isUrgent = activeFilter === 'urgent' || l.priority === 'urgent';
      return (
        <TouchableOpacity 
          style={[styles.logCard, isUrgent && styles.urgentBorder]} 
          onPress={() => onSelectLog(l.customerId, l.id)}
        >
          <View style={styles.logHeader}>
            <Text style={styles.logCompany}>{cust?.company || 'UNKNOWN'}</Text>
            <Text style={styles.logDate}>{formatDate(l.timestamp)}</Text>
          </View>
          <Text style={styles.logContent} numberOfLines={3}>{l.content}</Text>
          {l.dueDate && (
            <View style={styles.deadlineRow}>
              <Ionicons name="time-outline" size={12} color="#f43f5e" />
              <Text style={styles.deadlineText}>DUE: {new Date(l.dueDate).toLocaleDateString()}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    const m = item as ChatMessage;
    return (
      <TouchableOpacity style={styles.messageItem} onPress={() => onSelectChat(m.channelId || m.authorId)}>
        <View style={styles.messageAvatar}>
          <Text style={styles.messageAvatarText}>{m.authorName?.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.logHeader}>
            <Text style={styles.messageAuthor}>{m.authorName}</Text>
            <Text style={styles.logDate}>{formatDate(m.timestamp)}</Text>
          </View>
          <Text style={styles.messageText} numberOfLines={2}>"{m.text}"</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      contentContainerStyle={styles.container}
      stickySectionHeadersEnabled={false}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={Platform.OS === 'android'}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{getHeaderTitle()}</Text>
            {activeFilter !== 'none' && (
              <TouchableOpacity style={styles.clearBadge} onPress={onClearFilter}>
                <Ionicons name="close-circle" size={12} color="#64748b" />
                <Text style={styles.clearText}>CLEAR</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.subtitle}>
            {activeFilter !== 'none' ? `FILTERING SYSTEM RECORDS` : `RESULTS FOR: "${term}"`}
          </Text>
        </View>
      }
      renderSectionHeader={({ section: { title } }) => (
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      )}
      renderItem={renderItem}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color="#e2e8f0" />
          <Text style={styles.emptyText}>NO MATCHING RECORDS FOUND</Text>
          {activeFilter !== 'none' && (
            <TouchableOpacity onPress={onClearFilter} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Return to Dashboard</Text>
            </TouchableOpacity>
          )}
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  subtitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginTop: 4, textTransform: 'uppercase' },
  clearBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 },
  clearText: { fontSize: 9, fontWeight: '900', color: '#64748b' },
  sectionHeaderContainer: { backgroundColor: '#fff', paddingTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5 },
  customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  avatar: { width: 48, height: 48, backgroundColor: '#f0fdf4', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#10b981', fontWeight: '900', fontSize: 20 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#1e293b' },
  cardSub: { fontSize: 9, fontWeight: '700', color: '#94a3b8', marginTop: 2 },
  logCard: { backgroundColor: 'white', padding: 20, borderRadius: 28, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  urgentBorder: { borderColor: '#fee2e2', backgroundColor: '#fffafb' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  logCompany: { fontSize: 10, fontWeight: '900', color: '#10b981', letterSpacing: 0.5 },
  logDate: { fontSize: 9, fontWeight: '700', color: '#cbd5e1' },
  logContent: { fontSize: 14, color: '#475569', lineHeight: 20, fontWeight: '500' },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#fff1f2', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  deadlineText: { fontSize: 9, fontWeight: '900', color: '#f43f5e' },
  messageItem: { flexDirection: 'row', padding: 16, backgroundColor: '#f8fafc', borderRadius: 24, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  messageAvatar: { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  messageAvatarText: { fontSize: 14, fontWeight: '900', color: '#64748b' },
  messageAuthor: { fontSize: 13, fontWeight: '900', color: '#1e293b' },
  messageText: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 2 },
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 11, fontWeight: '900', color: '#cbd5e1', marginTop: 16, textAlign: 'center', letterSpacing: 1 },
  backBtn: { marginTop: 20 },
  backBtnText: { fontSize: 12, fontWeight: '900', color: '#10b981', textDecorationLine: 'underline' }
});

export default SearchResultsView;