import { Redirect } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null; // chờ load AsyncStorage

  if (!isAuthenticated) {
    return <Redirect href="tutorial" />;
  }

  return <Redirect href="(tab)/dashboard" />;
}