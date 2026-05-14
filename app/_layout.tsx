// app/_layout.tsx
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { Stack } from "expo-router";
import { View, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import "./globals.css";

function WebShell({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== "web") return <>{children}</>;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050510",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 430,
          flex: 1,
          backgroundColor: "#0E0E1C",
          // @ts-ignore – web-only boxShadow
          boxShadow: "0 0 60px rgba(123, 63, 242, 0.08)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <StatusBar style="light" backgroundColor="#0E0E1C" />
        <WebShell>
          <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="create-watchlist" options={{ headerShown: false }} />
          <Stack.Screen name="watchlists" options={{ headerShown: false }} />
            <Stack.Screen name="watchlist-detail/[id]" options={{ headerShown: false }} />
          </Stack>
        </WebShell>
      </ToastProvider>
    </AuthProvider>
  );
}
