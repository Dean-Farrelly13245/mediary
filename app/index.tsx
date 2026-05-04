// app/index.tsx
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user) {
      router.replace("/(tabs)");
    } else {
      router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <View className="flex-1 items-center justify-center bg-background" style={{ flex: 1, backgroundColor: '#0E0E1C', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#7B3FF2" />
    </View>
  );
}
