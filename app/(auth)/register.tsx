import React from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { TRANSLATIONS } from "@/src/constants/constants";
import { useAuth } from '@/src/hooks/useAuth';
import Spinner from "@/src/components/Spinner";
import { useRouter } from "expo-router";

const RegisterView: React.FC = () => {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [regName, setRegName] = React.useState('');
    const [regEmail, setRegEmail] = React.useState('');
    const [regPass, setRegPass] = React.useState('');
    const {language} = useAuth();
    const t = (key: string) => TRANSLATIONS[language][key] || key;
    const { registerUser } = useAuth();

    const handleRegisterSubmit = async () => {
        if (regName.trim() && regEmail.trim() && regPass.trim()) {
            if (isSubmitting) return;
            try { 
                setIsSubmitting(true)
                await registerUser(regName, regEmail, regPass);
                alert('Registration successful');
                router.replace("(tab)/dashboard");
            } catch {
                alert('Registration failed');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

   return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{language === 'vi' ? 'Đăng Ký Nhân Sự' : 'Personnel Registry'}</Text>
                <Text style={styles.subtitle}>Identity establishment protocol</Text>
            </View>
            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('legalName')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. John Wick"
                        value={regName}
                        onChangeText={setRegName}
                    />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('enterpriseEmail')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="john@nori.group"
                        value={regEmail}
                        onChangeText={setRegEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('securityToken')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Create complex password"
                        value={regPass}
                        onChangeText={setRegPass}
                        secureTextEntry
                    />
                </View>
            </View>
            
            <View style={styles.buttonGroup}>
                <TouchableOpacity
                    disabled={isSubmitting}
                    style={styles.submitButton}
                    onPress={() => handleRegisterSubmit()}
                >
                    {isSubmitting ? <Spinner /> : <Text style={styles.submitText}>Submit Application</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                    disabled={isSubmitting}
                    style={styles.returnButton}
                    onPress={() => router.replace("(auth)/login") }
                >
                    <Text style={styles.returnText}>Return to Terminal</Text>
                </TouchableOpacity>
            </View>
            
        </View>
    );
}
const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, backgroundColor: "#fff", paddingTop: 80 },
    header: { alignItems: "center", marginBottom: 32 },
    title: { fontSize: 24, fontWeight: "bold", color: "#334155" },
    subtitle: { fontSize: 11, color: "#94a3b8", fontWeight: "bold", textTransform: "uppercase", marginTop: 8 },
    form: { marginBottom: 24 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 10, fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 },
    input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, padding: 12, fontSize: 14, fontWeight: "bold", backgroundColor: "#fff" },
    buttonGroup: { marginTop: 24 },
    submitButton: { backgroundColor: "#059669", borderRadius: 28, paddingVertical: 16, alignItems: "center", marginBottom: 12 },
    submitText: { color: "#fff", fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 2 },
    returnButton: { alignItems: "center" },
    returnText: { color: "#94a3b8", fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 2 },
});
export default RegisterView;