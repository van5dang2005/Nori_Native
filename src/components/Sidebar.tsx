import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image, TextInput } from 'react-native';
import { UserRole, Customer, TeamMember, ChatChannel, Language } from '../types/types';
import { ROLE_CONFIG, TRANSLATIONS } from '../constants/constants';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  currentRole: UserRole;
  currentUserId: string;
  onRoleChange: (role: UserRole) => void;
  customers: Customer[];
  selectedId: string;
  onSelect: (id: string) => void;
  activeView: 'home' | 'customers' | 'team-chat' | 'all-customers' | 'search' | 'personal-notes' | 'pipeline';
  onViewChange: (view: 'home' | 'customers' | 'team-chat' | 'all-customers' | 'search' | 'personal-notes' | 'pipeline') => void;
  teamMembers: TeamMember[];
  channels: ChatChannel[];
  activeChatTargetId: string;
  onSelectChat: (id: string) => void;
  onAddCustomer: () => void;
  onManageTeam: () => void;
  onOpenProfile: () => void;
  onAddChannel: () => void;
  onEditChannel: (channel: ChatChannel) => void;
  onLogout: () => void;
  currentUser: TeamMember;
  language: Language;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, currentRole, onRoleChange, customers, selectedId, onSelect, activeView, onViewChange, teamMembers, channels, activeChatTargetId, onSelectChat, onAddCustomer, onManageTeam, onAddChannel, onEditChannel, currentUserId, onLogout, onOpenProfile, currentUser, language
}) => {
  const { current_user } = useAuth();
  const [customerSearch, setCustomerSearch] = useState('');
  const canManage = currentRole === UserRole.SUPERVISOR || currentRole === UserRole.MANAGER;
  const isPending = currentRole === UserRole.ONBOARD;
  
  const prefs = currentUser.sidebarPrefs || { showShortcuts: true, showChannels: true, showDMs: true, order: ['shortcuts', 'channels', 'dms'] };

  const t = (key: string) => TRANSLATIONS[language][key] || key;

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q)).slice(0, 10);
  }, [customers, customerSearch]);

  const otherTeamMembers = useMemo(() => {
    return teamMembers.filter(m => m.id !== currentUserId);
  }, [teamMembers, currentUserId]);

  const renderGroup = (groupId: string) => {
    switch(groupId) {
      case 'shortcuts':
        return prefs.showShortcuts && (
          <View key="shortcuts" style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('customers')}</Text>
              {canManage && (
                <TouchableOpacity onPress={onAddCustomer} style={styles.addButton}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput 
              placeholder="Quick find..." 
              value={customerSearch} 
              onChangeText={setCustomerSearch} 
              style={styles.searchInput} 
            />
            <View style={styles.customerList}>
              {filteredCustomers.map(c => (
                <TouchableOpacity 
                  key={c.id} 
                  onPress={() => onSelect(c.id)} 
                  style={[
                    styles.customerItem, 
                    selectedId === c.id && activeView === 'customers' && styles.activeCustomerItem
                  ]}
                >
                  <View style={styles.customerHeader}>
                    <Text style={[
                      styles.customerName,
                      selectedId === c.id && activeView === 'customers' && styles.activeText
                    ]}>{c.name}</Text>
                    <View style={[styles.statusDot, { backgroundColor: c.status === 'active' ? '#10b981' : '#fbbf24' }]} />
                  </View>
                  <Text style={[
                    styles.customerCompany,
                    selectedId === c.id && activeView === 'customers' && styles.activeSubtext
                  ]}>{c.company}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 'channels':
        return prefs.showChannels && (
          <View key="channels" style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('channels')}</Text>
              {canManage && (
                <TouchableOpacity onPress={onAddChannel} style={styles.addButton}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.channelList}>
              {channels.map(channel => {
                const isActive = activeView === 'team-chat' && activeChatTargetId === channel.id;
                return (
                  <TouchableOpacity 
                    key={channel.id} 
                    onPress={() => { onSelectChat(channel.id); onViewChange('team-chat'); }} 
                    style={[styles.channelItem, isActive && styles.activeChannelItem]}
                  >
                    <Text style={[styles.channelHash, isActive && styles.activeText]}>#</Text>
                    <Text style={[styles.channelName, isActive && styles.activeText]}>{channel.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      case 'dms':
        return prefs.showDMs && (
          <View key="dms" style={styles.section}>
            <Text style={styles.sectionTitle}>{t('directMessages')}</Text>
            <View style={styles.dmList}>
              {otherTeamMembers.map(member => (
                <TouchableOpacity 
                  key={member.id} 
                  onPress={() => { onSelectChat(member.id); onViewChange('team-chat'); }} 
                  style={[
                    styles.dmItem, 
                    activeView === 'team-chat' && activeChatTargetId === member.id && styles.activeDmItem
                  ]}
                >
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: member.avatar }} style={styles.avatar} />
                    <View style={[
                      styles.presenceDot, 
                      { backgroundColor: member.status === 'online' ? '#10b981' : member.status === 'away' ? '#fbbf24' : '#cbd5e1' }
                    ]} />
                  </View>
                  <Text style={[
                    styles.dmName,
                    activeView === 'team-chat' && activeChatTargetId === member.id && styles.activeDmText
                  ]}>{member.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.logoContainer} onPress={() => onViewChange('home')}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.brandName}>Nori.</Text>
        </TouchableOpacity>
        <View style={styles.statusContainer}>
          <View style={[styles.statusPulse, { backgroundColor: isPending ? '#f43f5e' : '#10b981' }]} />
          <Text style={[styles.statusText, { color: isPending ? '#e11d48' : '#10b981' }]}>
            {isPending ? 'Pending' : t('systemLive')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.roleSelectorContainer}>
          <Text style={styles.roleLabel}>{t('accessLevel')}</Text>
          <View style={styles.roleSelector}>
            <Text style={styles.roleValue}>{currentRole}</Text>
          </View>
          {canManage && (
            <TouchableOpacity onPress={onManageTeam} style={styles.directoryButton}>
              <Text style={styles.directoryButtonText}>{t('personnelDirectory')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {isPending ? (
          <View style={styles.pendingContainer}>
            <Text style={styles.pendingIcon}>🔒</Text>
            <Text style={styles.pendingText}>Navigation locked until identity activation</Text>
          </View>
        ) : (
          <View style={styles.navContainer}>
            <TouchableOpacity 
              onPress={() => onViewChange('home')} 
              style={[styles.navItem, activeView === 'home' && styles.activeNavItem]}
            >
              <Text style={[styles.navText, activeView === 'home' && styles.activeNavText]}>{t('dashboard')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => onViewChange('all-customers')} 
              style={[styles.navItem, activeView === 'all-customers' && styles.activeNavItem]}
            >
              <Text style={[styles.navText, activeView === 'all-customers' && styles.activeNavText]}>{t('customers')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => onViewChange('personal-notes')} 
              style={[styles.navItem, activeView === 'personal-notes' && styles.activeNavItem]}
            >
              <Text style={[styles.navText, activeView === 'personal-notes' && styles.activeNavText]}>{t('personalNotes')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => onViewChange('pipeline')} 
              style={[styles.navItem, activeView === 'pipeline' && styles.activeNavItem]}
            >
              <Text style={[styles.navText, activeView === 'pipeline' && styles.activeNavText]}>
                Pipeline
              </Text>
            </TouchableOpacity>
            {prefs.order.map(groupId => renderGroup(groupId))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={onOpenProfile} style={styles.profileCard}>
          <Image source={{ uri: current_user.avatar }} style={styles.profileAvatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{current_user.name}</Text>
            <Text style={[styles.profileRole, { color: ROLE_CONFIG[current_user.role as UserRole]?.textColor || '#10b981' }]}>{currentUser.role}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 36,
    height: 36,
    backgroundColor: '#10b981',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  statusContainer: {
    marginTop: 35,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 15,
  },
  roleSelectorContainer: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  roleLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  roleSelector: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  directoryButton: {
    marginTop: 10,
    padding: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 10,
    alignItems: 'center',
  },
  directoryButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10b981',
    textTransform: 'uppercase',
  },
  navContainer: {
    gap: 5,
  },
  navItem: {
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeNavItem: {
    backgroundColor: '#10b981',
  },
  navText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#475569',
  },
  activeNavText: {
    color: 'white',
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addButton: {
    padding: 5,
  },
  addButtonText: {
    fontSize: 18,
    color: '#10b981',
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 10,
    padding: 10,
    fontSize: 11,
    marginBottom: 10,
  },
  customerList: {
    gap: 5,
  },
  customerItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeCustomerItem: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1e293b',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  customerCompany: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginTop: 2,
  },
  activeText: {
    color: 'white',
  },
  activeSubtext: {
    color: '#10b981',
  },
  channelList: {
    gap: 5,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  activeChannelItem: {
    backgroundColor: '#10b981',
  },
  channelHash: {
    fontSize: 16,
    color: '#94a3b8',
  },
  channelName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#475569',
  },
  dmList: {
    gap: 5,
  },
  dmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  activeDmItem: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  presenceDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  dmName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  activeDmText: {
    color: '#10b981',
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 15,
    gap: 10,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1e293b',
  },
  profileRole: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  logoutButton: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pendingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIcon: {
    fontSize: 40,
    marginBottom: 20,
    opacity: 0.2,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 18,
  }
});

export default Sidebar;
