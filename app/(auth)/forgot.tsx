import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "@/src/hooks/useAuth";
import { TRANSLATIONS } from "@/src/constants/constants";
import { useRouter } from "expo-router";

const ForgotView: React.FC = () => {
    const router = useRouter();
    const { language } = useAuth();
    const t = (key: string) => TRANSLATIONS[language][key] || key;

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                {/* simply show the “N” letter */}
                <Text style={styles.iconLetter}>N</Text>
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>
                    {language === 'vi' ? 'Yêu Cầu Hỗ Trợ' : 'Identity Recovery'}
                </Text>
                <Text style={styles.subtitle}>
                    Direct interaction with your System Administrator is required to reset high-security credentials.
                </Text>
            </View>
            <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace("/login")}
            >
                <Text style={styles.buttonText}>Back to Dashboard</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#fff" },
    iconContainer: {
        width: 80, height: 80, backgroundColor: "#d1fae5", borderRadius: 40,
        justifyContent: "center", alignItems: "center", marginBottom: 24,
        shadowColor: "#fff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
    },
    iconLetter: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#10b981", // or whatever color you prefer
    },
    textContainer: { alignItems: "center", marginBottom: 32, paddingHorizontal: 16 },
    title: { fontSize: 24, fontWeight: "bold", color: "#334155", marginBottom: 8 },
    subtitle: { fontSize: 14, color: "#64748b", fontWeight: "500", textAlign: "center" },
    button: {
        width: "100%", paddingVertical: 16, backgroundColor: "#f1f5f9",
        borderRadius: 16, alignItems: "center",
    },
    buttonText: {
        color: "#475569", fontSize: 11, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 2,
    },
});

export default ForgotView;