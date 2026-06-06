import { Stack } from "expo-router";
import { AuthProvider } from "@/src/context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ✅ Khởi tạo bên ngoài để tránh re-create khi component re-render
const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider> 
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
           <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}