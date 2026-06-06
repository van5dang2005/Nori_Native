import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { TeamMember, Language, SidebarPrefs, Theme } from '@/src/types/types';
import { TRANSLATIONS } from '@/src/constants/constants';
import LoadingOverlay from './LoadingOverlay';
import { useConfig } from '@/src/hooks/useUser';
import { useAuth } from '@/src/hooks/useAuth';

const { width, height } = Dimensions.get('window');

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen, onClose, member, language, onLanguageChange
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'layout'>('profile');
  const [name, setName] = useState(member.name);
  const [avatar, setAvatar] = useState(member.avatar);
  const [sidebarPrefs, setSidebarPrefs] = useState<SidebarPrefs>(member.sidebarPrefs || {
    showShortcuts: true,
    showChannels: true,
    showDMs: true,
    order: ['shortcuts', 'channels', 'dms'],
    theme: 'emerald',
    dashboardPrefs: {
      showStats: true,
      showPinnedSection: true,
      showRecentActivity: true,
      showActivePersonnel: true,
      showDeadlines: true,
      order: ['stats', 'pinned', 'activity', 'personnel', 'deadlines']
    }
  });

  const { update_currentUser } = useAuth();
  const { mutate: updateConfig, isPending: isUpdatingConfig } = useConfig();

  // Helper translate function
  const t = (key: string) => TRANSLATIONS[language][key] || key;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        t('permission_denied'),
        t('camera_permission_msg')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    updateConfig({
      userID: member.id.replace('id-', ''),
      name,
      // Logic gửi ảnh: Nếu avatar thay đổi thì gửi object file, nếu không thì undefined
      img: avatar !== member.avatar ? {
        uri: avatar,
        name: `avatar_${member.id}.jpg`,
        type: 'image/jpeg'
      } as any : undefined,
    }, {
      onSuccess: (updatedUser) => {
        member.name = updatedUser?.user?.name || name;
        member.avatar = updatedUser?.user?.img || avatar;
        member.sidebarPrefs = sidebarPrefs;
        update_currentUser(member);
        Alert.alert(t('success'), t('update_success'));
      },
      onError: (error) => {
        console.error("Update failed:", error);
        Alert.alert(t('error'), t('update_failed'));
      }
    });
  };

  const moveArrayItem = (arr: string[], index: number, direction: 'up' | 'down') => {
    const newArr = [...arr];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= arr.length) return arr;
    [newArr[index], newArr[newIndex]] = [newArr[newIndex], newArr[index]];
    return newArr;
  };

  const reorderSidebar = (index: number, direction: 'up' | 'down') => {
    setSidebarPrefs(prev => ({ ...prev, order: moveArrayItem(prev.order, index, direction) }));
  };

  const toggleSidebarVisibility = (gid: string) => {
    setSidebarPrefs(prev => {
      const key = gid === 'shortcuts' ? 'showShortcuts' : gid === 'channels' ? 'showChannels' : 'showDMs';
      return { ...prev, [key]: !prev[key as keyof SidebarPrefs] };
    });
  };

  const getThemeColor = (theme: Theme) => {
    const colors = {
      emerald: '#059669', sapphire: '#2563eb', midnight: '#1e293b', ruby: '#e11d48',
      'pink-pastel': '#f472b6', 'panda-soft': '#fb923c', 'cyber-circuit': '#06b6d4', 'sakura-dream': '#f9a8d4'
    };
    return colors[theme] || '#059669';
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.content}>

          {/* Header: Avatar & Tabs */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: avatar }} style={styles.avatar} />
              <TouchableOpacity style={styles.editBadge} onPress={pickImage} activeOpacity={0.8}>
                <Ionicons name="camera" size={16} color="white" />
              </TouchableOpacity>
            </View>

            <Text style={styles.userName}>{name}</Text>

            <View style={styles.tabBar}>
              {(['profile', 'appearance', 'layout'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {t(tab).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Body: Scrollable Content */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

            {activeTab === 'profile' && (
              <View style={styles.section}>
                <Text style={styles.label}>{t('full_name').toUpperCase()}</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholder={t('enter_name')}
                />

                <Text style={[styles.label, { marginTop: 20 }]}>{t('language').toUpperCase()}</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    onPress={() => onLanguageChange('en')}
                    style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
                  >
                    <Text style={[styles.langBtnText, language === 'en' && styles.textWhite]}>{t('english').toUpperCase()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onLanguageChange('vi')}
                    style={[styles.langBtn, language === 'vi' && styles.langBtnActive]}
                  >
                    <Text style={[styles.langBtnText, language === 'vi' && styles.textWhite]}>{t('vietnamese').toUpperCase()}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeTab === 'appearance' && (
              <View style={styles.section}>
                <Text style={styles.label}>{t('theme').toUpperCase()}</Text>
                <View style={styles.themeGrid}>
                  {(['emerald', 'sapphire', 'midnight', 'ruby', 'pink-pastel', 'panda-soft', 'cyber-circuit', 'sakura-dream'] as Theme[]).map(theme => (
                    <TouchableOpacity
                      key={theme}
                      onPress={() => setSidebarPrefs(prev => ({ ...prev, theme }))}
                      style={[styles.themeCard, sidebarPrefs.theme === theme && styles.themeCardActive]}
                    >
                      <View style={[styles.themeCircle, { backgroundColor: getThemeColor(theme) }]} />
                      <Text style={styles.themeName}>{theme.replace('-', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'layout' && (
              <View style={styles.section}>
                <Text style={styles.label}>{t('sidebar_priority').toUpperCase()}</Text>
                {sidebarPrefs.order.map((gid, idx) => {
                  const isVisible = gid === 'shortcuts' ? sidebarPrefs.showShortcuts : gid === 'channels' ? sidebarPrefs.showChannels : sidebarPrefs.showDMs;
                  return (
                    <View key={gid} style={[styles.reorderItem, !isVisible && { opacity: 0.4 }]}>
                      <View style={styles.rowAlignCenter}>
                        <TouchableOpacity
                          onPress={() => toggleSidebarVisibility(gid)}
                          style={[styles.toggle, isVisible ? styles.toggleOn : styles.toggleOff]}
                        >
                          <View style={[styles.toggleDot, isVisible ? { right: 2 } : { left: 2 }]} />
                        </TouchableOpacity>
                        <Text style={styles.reorderText}>{t(gid).toUpperCase()}</Text>
                      </View>
                      <View style={styles.row}>
                        <TouchableOpacity disabled={idx === 0} onPress={() => reorderSidebar(idx, 'up')} style={styles.reorderBtn}>
                          <Ionicons name="chevron-up" size={16} color={idx === 0 ? "#cbd5e1" : "#1e293b"} />
                        </TouchableOpacity>
                        <TouchableOpacity disabled={idx === sidebarPrefs.order.length - 1} onPress={() => reorderSidebar(idx, 'down')} style={styles.reorderBtn}>
                          <Ionicons name="chevron-down" size={16} color={idx === sidebarPrefs.order.length - 1 ? "#cbd5e1" : "#1e293b"} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

          </ScrollView>

          {/* Footer: Actions */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.discardBtn}>
              <Text style={styles.discardText}>{t('discard').toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={isUpdatingConfig}>
              <Text style={styles.saveText}>{t('save_config').toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
      {isUpdatingConfig && <LoadingOverlay visible />}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  content: { height: height * 0.85, backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' },
  header: { alignItems: 'center', padding: 30, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 32, borderWidth: 4, borderColor: 'white', backgroundColor: '#e2e8f0' },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#059669',
    width: 32,
    height: 32,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  userName: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  tabBar: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 16, padding: 4, marginTop: 20 },
  tabItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  tabItemActive: { backgroundColor: 'white' },
  tabText: { fontSize: 10, fontWeight: '900', color: '#94a3b8' },
  tabTextActive: { color: '#059669' },
  body: { flex: 1 },
  scrollContent: { padding: 25 },
  section: { marginBottom: 10 },
  label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 10 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 14, fontWeight: '700', color: '#1e293b' },
  row: { flexDirection: 'row', gap: 10 },
  rowAlignCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langBtn: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
  langBtnActive: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
  langBtnText: { fontSize: 10, fontWeight: '900', color: '#94a3b8' },
  textWhite: { color: 'white' },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: { width: (width - 70) / 2, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', backgroundColor: '#f8fafc', flexDirection: 'row', alignItems: 'center', gap: 10 },
  themeCardActive: { borderColor: '#10b981', backgroundColor: 'white', borderWidth: 2 },
  themeCircle: { width: 24, height: 24, borderRadius: 8 },
  themeName: { fontSize: 9, fontWeight: '900', color: '#475569', textTransform: 'uppercase' },
  reorderItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#f8fafc', borderRadius: 20, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  reorderText: { fontSize: 11, fontWeight: '900', color: '#475569' },
  reorderBtn: { padding: 8, backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginLeft: 4 },
  toggle: { width: 36, height: 20, borderRadius: 10, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: '#10b981' },
  toggleOff: { backgroundColor: '#cbd5e1' },
  toggleDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'white', position: 'absolute' },
  footer: { padding: 25, flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  discardBtn: { flex: 1, padding: 18, alignItems: 'center' },
  discardText: { fontSize: 11, fontWeight: '900', color: '#94a3b8' },
  saveBtn: { flex: 2, backgroundColor: '#1e293b', padding: 18, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  saveText: { fontSize: 11, fontWeight: '900', color: 'white' },
});

export default UserProfileModal;