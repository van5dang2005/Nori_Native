import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { TRANSLATIONS } from '@/src/constants/constants';
import { useAuth } from '@/src/hooks/useAuth';
import Spinner from '@/src/components/Spinner';
import { useRouter } from 'expo-router';

const LoginScreen: React.FC = () => {
  const { language, update_language } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');          // ← email state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const t = (key: string) => TRANSLATIONS[language][key] || key;
  const { loginUser } = useAuth();

  const handleLoginSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await loginUser(email, password);
      router.replace("(tab)/dashboard");
    } catch(error) {
      console.error('Login failed:', error);
      Alert.alert('Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text style={styles.title}>{t('loginTitle')}</Text>
          <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('identityAccess')}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@nori.group"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Text style={styles.label}>{t('securityToken')}</Text>
                <TouchableOpacity
                  onPress={() => router.push('/forgot')}
                >
                  <Text style={styles.forgotText}>
                    {language === 'vi' ? 'Quên?' : 'Forgot?'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.passwordWrapper}>
                <TextInput
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  style={styles.eyeButton}
                >
                  <Text>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLoginSubmit}
              disabled={isSubmitting || !email}
              style={[
                styles.submitButton,
                (isSubmitting || !email) && styles.disabledButton,
              ]}
            >
              {isSubmitting ? (
                <Spinner />
              ) : (
                <Text style={styles.submitButtonText}>
                  {t('initializeSession')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {router.push('/register');}}
              style={styles.switchModeButton}
            >
              <Text style={styles.switchModeText}>
                {language === 'vi'
                  ? 'Yêu cầu quyền truy cập mới'
                  : 'Request new access'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.languageToggle}>
          <TouchableOpacity
            onPress={() => update_language('en')}
            style={[styles.langBtn, language === 'en' && styles.activeLangBtn]}
          >
            <Text
              style={[styles.langBtnText, language === 'en' && styles.activeLangBtnText]}
            >
              EN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => update_language('vi')}
            style={[styles.langBtn, language === 'vi' && styles.activeLangBtn]}
          >
            <Text
              style={[styles.langBtnText, language === 'vi' && styles.activeLangBtnText]}
            >
              VI
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Nori Group Strategic • v4.5.9</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 30, paddingTop: 60, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#10b981',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 40,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 10,
  },
  form: { gap: 20 },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  inputGroup: { gap: 8 },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#10b981',
    textTransform: 'uppercase',
  },
  passwordWrapper: { position: 'relative' },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 15,
    padding: 15,
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#0f172a',
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: { opacity: 0.3 },
  submitButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  switchModeButton: {
    alignItems: 'center',
    padding: 10,
  },
  switchModeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 10,
  },
  forgotContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 15,
  },
  forgotIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  forgotDescription: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 15,
    marginTop: 10,
  },
  backButtonText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  languageToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 15,
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  langBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
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
  versionText: {
    marginTop: 20,
    fontSize: 9,
    fontWeight: '900',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
});

export default LoginScreen;
