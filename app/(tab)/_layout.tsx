import { Redirect, Slot } from "expo-router";
import { useAuth } from "@/src/hooks/useAuth";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProtectedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Slot />
    </SafeAreaView>
  );
}