import React, { useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Dimensions 
} from 'react-native';
import { CustomerLog, Customer, TeamMember, ChatMessage, Language, SidebarPrefs, UserRole } from '../types/types';
import { TRANSLATIONS, LOG_TYPE_STYLES, ROLE_CONFIG } from '../constants/constants';
import { useGetReport } from '@/src/hooks/useUser';
const { width } = Dimensions.get('window');

interface HomeViewProps {
  logs: CustomerLog[];
  customers: Customer[];
  teamMembers: TeamMember[];
  messages: ChatMessage[];
  currentUserId: string;
  currentUserRole: UserRole;
  onQuickNote: () => void;
  onSelectCustomer: (id: string) => void;
  onSelectLog: (customerId: string, logId: string) => void;
  onSelectTeammate: (id: string) => void;
  onFilterClick: (type: 'urgent' | 'deadlines' | 'all-logs' | 'pinned' | 'health') => void;
  language: Language;
  userPrefs: SidebarPrefs;
}

const HomeView: React.FC<HomeViewProps> = ({ logs, customers, teamMembers, onQuickNote, onSelectLog, onFilterClick, onSelectTeammate, currentUserId, currentUserRole, language, userPrefs }) => {
  const { data: reportData, isLoading } = useGetReport(currentUserId.replace('id-', ''));
  const visibleCustomerIds = useMemo(() => new Set(customers.map(c => c.id)), [customers]);
  const dashboardPrefs = userPrefs.dashboardPrefs || { showStats: true, showPinnedSection: true, showRecentActivity: true, showActivePersonnel: true, showDeadlines: true, order: ['stats', 'pinned', 'activity', 'personnel', 'deadlines'] };
  
  const t = (key: string) => TRANSLATIONS[language][key] || key;
  
  const pinnedLogs = reportData?.data.total_notes_pinned?.details.data || [];

  const recentLogs = reportData?.data.total_notes_activity.data || [];
  const priorityItems = reportData?.data.notes_with_deadline?.details.data || [];

  const stats = {
    totalLogs: reportData?.data.total_notes,
    activeTasks: reportData?.data.notes_with_deadline?.count,
    urgentAlerts: reportData?.data.total_notes_urgent,
    pinnedNotes: reportData?.data.total_notes_pinned?.count,
    customerCount: customers.length
  };
  const formatLogTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' • ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStats = () => (
    <View key="stats" style={styles.statsGrid}>
      {[
        { id: 'all-logs', label: t('intelligenceLogs'), value: stats.totalLogs, icon: '📄', color: '#10b981' },
        { id: 'deadlines', label: t('criticalDeadlines'), value: stats.activeTasks, icon: '📅', color: '#2563eb' },
        { id: 'urgent', label: t('urgentAlerts'), value: stats.urgentAlerts, icon: '⚠️', color: '#f43f5e' },
        { id: 'pinned', label: 'Pinned Intel', value: stats.pinnedNotes, icon: '📌', color: '#f59e0b' }
      ].map((stat) => (
        <TouchableOpacity 
          key={stat.id} 
          onPress={() => onFilterClick(stat.id as any)}
          style={styles.statCard}
        >
          <View style={[styles.statIconContainer, { backgroundColor: '#f8fafc' }]}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
          </View>
          <View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPinned = () => (
    <View key="pinned" style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>📌</Text>
        <Text style={styles.sectionTitle}>Pinned Strategic Intel</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {pinnedLogs?.map(log => {
          return (
            <TouchableOpacity 
              key={log.id} 
              onPress={() => onSelectLog(log.customer_id, log.id)} 
              style={styles.pinnedCard}
            >
              <Text style={styles.pinnedCompany}>{log.customer?.company}</Text>
              <Text style={styles.pinnedContent} numberOfLines={3}>{log.content}</Text>
              <View style={styles.pinnedFooter}>
                <Text style={styles.pinnedTime}>{formatLogTimestamp(log.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
 
  const renderActivity = () => (
    <View key="activity" style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('recentActivity')}</Text>
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>{t('liveStream')}</Text>
        </View>
      </View>
      <View style={styles.activityList}>
        {recentLogs?.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t('noActivity')}</Text>
          </View>
        ) : recentLogs?.map(log => {
          return (
            <TouchableOpacity 
              key={log.id} 
              onPress={() => onSelectLog(log.customer.id, log.id)} 
              style={styles.activityCard}
            >
              <View style={styles.activityAvatar}>
                <Text style={styles.activityAvatarText}>{log.customer?.name.charAt(0)}</Text>
              </View>
              <View style={styles.activityInfo}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityAuthor}>{log.user.name}</Text>
                  <Text style={styles.activityCustomer}>@ {log.customer?.name}</Text>
                </View>
                <View style={styles.badgeRow}>
                    <View style={[styles.typeBadge, { borderColor: LOG_TYPE_STYLES[log.log_type]?.bg, }]}>
                        <Text style={[styles.typeBadgeText, { color: LOG_TYPE_STYLES[log.log_type]?.border }]}>
                          {log.log_type}
                        </Text>
                    </View>
                  <View style={[
                    styles.priorityBadge, 
                    log.priority === 'urgent' && log.status === 'open' ? styles.urgentBadge : styles.normalBadge
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      log.priority === 'urgent' && log.status === 'open' ? styles.urgentBadgeText : styles.normalBadgeText
                    ]}>{t(log.priority || 'low')}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: log.status === 'open' ? '#10b981' : '#475569' }]}>
                    <Text style={styles.statusBadgeText}>{t(log.status)}</Text>
                  </View>
                </View>
                <Text style={styles.activityContent} numberOfLines={2}>{log.content}</Text>
                <Text style={styles.activityTime}>{formatLogTimestamp(log.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderPersonnel = () => (
    <View key="personnel" style={styles.personnelCard}>
      <View style={styles.personnelHeader}>
        <Text style={styles.personnelTitle}>{t('activePersonnel')}</Text>
      </View>
      <View style={styles.personnelList}>
        {teamMembers.filter(m => m.id !== currentUserId).slice(0, 5).map(member => (
          <TouchableOpacity 
            key={member.id} 
            onPress={() => onSelectTeammate(member.id)} 
            style={styles.personnelItem}
          >
            <View style={styles.personnelAvatarContainer}>
              <Image source={{ uri: member.avatar }} style={styles.personnelAvatar} />
              <View style={[styles.personnelStatus, { backgroundColor: member.status === 'online' ? '#10b981' : '#64748b' }]} />
            </View>
            <View style={styles.personnelInfo}>
              <Text style={styles.personnelName}>{member.name}</Text>
              <Text style={[styles.personnelRole, { color: ROLE_CONFIG[member.role as UserRole]?.textColor || '#64748b' }]}>{member.role}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDeadlines = () => (
    <View key="deadlines" style={styles.section}>
      <Text style={styles.sectionTitle}>{t('criticalDeadlines')}</Text>
      <View style={styles.deadlineList}>
        {priorityItems?.length > 0 ? priorityItems?.map(item => (
          <TouchableOpacity 
            key={item.id} 
            onPress={() => onSelectLog(item.customer_id, item.id)} 
            style={styles.deadlineItem}
          >
            <Text style={styles.deadlineDate}>
              {new Date(item.deadline!).toLocaleDateString()}
            </Text>
            <Text style={styles.deadlineContent} numberOfLines={2}>{item.content}</Text>
          </TouchableOpacity>
        )) : (
          <Text style={styles.emptyStateText}>{t('noDeadlines')}</Text>
        )}
      </View>
    </View>
  );

  const sectionMap: Record<string, () => React.ReactNode> = {
    stats: renderStats,
    pinned: renderPinned,
    activity: renderActivity,
    personnel: renderPersonnel,
    deadlines: renderDeadlines
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{t('dashboard')}</Text>
          <Text style={styles.heroSubtitle}>
            Enterprise intelligence at your fingertips. Monitoring {stats.customerCount} strategic accounts.
          </Text>
        </View>
        {currentUserRole !== UserRole.ONBOARD && currentUserRole !== UserRole.VIEWER &&
        <TouchableOpacity onPress={onQuickNote} style={styles.quickNoteButton}>
          <Text style={styles.quickNoteIcon}>📝</Text>
          <Text style={styles.quickNoteText}>{t('quickNote')}</Text>
        </TouchableOpacity>}
      </View>

      {dashboardPrefs.order.map(sid => sectionMap[sid] && sectionMap[sid]())}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 25,
  },
  hero: {
    backgroundColor: '#10b981',
    borderRadius: 30,
    padding: 25,
    gap: 20,
  },
  heroContent: {
    flex: 1,
    gap: 5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 'bold',
    lineHeight: 20,
  },
  quickNoteButton: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  quickNoteIcon: {
    fontSize: 18,
  },
  quickNoteText: {
    color: '#10b981',
    fontWeight: '900',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    backgroundColor: 'white',
    width: (width - 50) / 2,
    padding: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 15,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  section: {
    gap: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  pinnedCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    padding: 20,
    borderRadius: 25,
    width: 200,
    marginRight: 10,
    gap: 10,
  },
  pinnedCompany: {
    fontSize: 8,
    fontWeight: '900',
    color: '#d97706',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pinnedContent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    lineHeight: 18,
  },
  pinnedFooter: {
    borderTopWidth: 1,
    borderTopColor: '#fef3c7',
    paddingTop: 10,
  },
  pinnedTime: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  liveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10b981',
    textTransform: 'uppercase',
  },
  activityList: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    gap: 15,
  },
  activityAvatar: {
    width: 48,
    height: 48,
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#94a3b8',
  },
  activityInfo: {
    flex: 1,
    gap: 5,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activityAuthor: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e293b',
  },
  activityCustomer: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 5,
    marginVertical: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  normalBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  urgentBadge: {
    backgroundColor: '#fff1f2',
    borderColor: '#ffe4e6',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  normalBadgeText: {
    color: '#10b981',
  },
  urgentBadgeText: {
    color: '#e11d48',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: 'white',
    textTransform: 'uppercase',
  },
  activityContent: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginTop: 5,
  },
  personnelCard: {
    backgroundColor: '#0f172a',
    borderRadius: 30,
    padding: 25,
    gap: 20,
  },
  personnelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 15,
  },
  personnelTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
  },
  personnelList: {
    gap: 15,
  },
  personnelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  personnelAvatarContainer: {
    position: 'relative',
  },
  personnelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  personnelStatus: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  personnelInfo: {
    flex: 1,
  },
  personnelName: {
    fontSize: 12,
    fontWeight: '900',
    color: 'white',
  },
  personnelRole: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deadlineList: {
    gap: 15,
  },
  deadlineItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 5,
  },
  deadlineDate: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f43f5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deadlineContent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    lineHeight: 18,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  typeBadge: {
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    opacity: 2,
    textTransform: 'uppercase',
    letterSpacing: 1, // Thay thế cho tracking-widest
  },
});

export default HomeView;
