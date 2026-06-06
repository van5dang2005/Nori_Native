import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Language } from '@/src/types/types';
import { TRANSLATIONS } from '@/src/constants/constants'
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from "expo-router";

const TutorialScreen: React.FC = () => {
    const { language, update_language } = useAuth();
    const router = useRouter();
    
    const t = (key: string) => TRANSLATIONS[language][key] || key;
    const handleGoToLogin = () => {
        router.push('/login');
    }
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.languageToggle}>
                <TouchableOpacity
                    onPress={() => update_language('en')}
                    style={[styles.langBtn, language === 'en' && styles.activeLangBtn]}
                >
                    <Text style={[styles.langBtnText, language === 'en' && styles.activeLangBtnText]}>EN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => update_language('vi')}
                    style={[styles.langBtn, language === 'vi' && styles.activeLangBtn]}
                >
                    <Text style={[styles.langBtnText, language === 'vi' && styles.activeLangBtnText]}>VI</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.logoBox}>
                        <Text style={styles.logoText}>N</Text>
                    </View>
                    <Text style={styles.title}>{t('onboardingTitle')}</Text>
                    <Text style={styles.subtitle}>{t('onboardingDesc')}</Text>
                </View>

                <View style={styles.features}>
                    <View style={styles.featureCard}>
                        <View style={[styles.featureIconBox, { backgroundColor: '#10b981' }]}>
                            <Text style={styles.featureIcon}>🛡️</Text>
                        </View>
                        <View style={styles.featureInfo}>
                            <Text style={styles.featureLabel}>{t('whatAppHas')}</Text>
                            <Text style={styles.featureDesc}>Secure Multi-tier Roles, Isolated Personal Vaults, and Unified Team Coordination.</Text>
                        </View>
                    </View>

                    <View style={styles.featureCard}>
                        <View style={[styles.featureIconBox, { backgroundColor: '#6366f1' }]}>
                            <Text style={styles.featureIcon}>⚡</Text>
                        </View>
                        <View style={styles.featureInfo}>
                            <Text style={styles.featureLabel}>{t('evalRoadmap')}</Text>
                            <Text style={styles.featureDesc}>Capture situational dynamics, tag personnel for immediate alerts, and manage client archives.</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={handleGoToLogin} style={styles.completeButton}>
                        <Text style={styles.completeButtonText}>{t('acknowledgeBtn')}</Text>
                    </TouchableOpacity>
                    <View style={styles.statusRow}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Intelligence Node 042 Online</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  languageToggle: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 10,
  },
  langBtn: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 10,
  },
  activeLangBtn: {
    backgroundColor: '#0f172a',
  },
  langBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
  },
  activeLangBtnText: {
    color: 'white',
  },
  scrollContent: {
    padding: 30,
    paddingTop: 100,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 90,
    height: 90,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#10b981',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 24,
    fontWeight: '500',
  },
  features: {
    width: '100%',
    gap: 15,
    marginBottom: 40,
  },
  featureCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  featureIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 24,
  },
  featureInfo: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 5,
  },
  featureDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    lineHeight: 20,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    gap: 30,
  },
  completeButton: {
    width: '100%',
    backgroundColor: '#0f172a',
    padding: 22,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 5,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 4,
  }
});
export default TutorialScreen;