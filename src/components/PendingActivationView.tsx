import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Image
} from 'react-native';
import { TeamMember, Language } from '../types/types';
import { TRANSLATIONS } from '../constants/constants';

interface PendingActivationViewProps {
  member: TeamMember;
  onLogout: () => void;
  language: Language;
}

const PendingActivationView: React.FC<PendingActivationViewProps> = ({ member, onLogout, language }) => {
  const t = (key: string) => TRANSLATIONS[language][key] || key;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: member?.avatar }} style={styles.avatar} />
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>⏳</Text>
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>
            {language === 'vi' ? `Chào ${member?.name?.split(' ')[0]}!` : `Welcome, ${member?.name?.split(' ')[0]}!`}
          </Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Activation Pending</Text>
          </View>
          <Text style={styles.description}>
            {language === 'vi' 
              ? 'Tài khoản của bạn đã được đăng ký thành công. Vui lòng chờ Người quản lý (Supervisor) kích hoạt quyền truy cập của bạn vào hệ thống Nori.' 
              : 'Your identity has been registered. Please wait for a System Supervisor to authorize your access level before the dashboard becomes available.'}
          </Text>
        </View>

        <View style={styles.protocolCard}>
          <View style={styles.protocolIconBox}>
            <Text style={styles.protocolIcon}>🛡️</Text>
          </View>
          <View style={styles.protocolInfo}>
            <Text style={styles.protocolLabel}>Protocol Status</Text>
            <Text style={styles.protocolValue}>Waiting for supervisor handshake...</Text>
          </View>
        </View>

        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>
            {language === 'vi' ? 'Đăng xuất' : 'Return to Login'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.footerText}>Secure Intelligence Perimeter • Node 042</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 40,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 10,
    gap: 25,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: 'white',
  },
  badge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#f59e0b',
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  badgeIcon: {
    fontSize: 14,
  },
  info: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fef3c7',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#b45309',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  protocolCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  protocolIconBox: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  protocolIcon: {
    fontSize: 20,
  },
  protocolInfo: {
    flex: 1,
  },
  protocolLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  protocolValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  logoutButton: {
    width: '100%',
    backgroundColor: '#0f172a',
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  footerText: {
    position: 'absolute',
    bottom: 40,
    fontSize: 9,
    fontWeight: '900',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 4,
  }
});

export default PendingActivationView;
