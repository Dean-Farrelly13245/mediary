// app/_layout.tsx
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { Stack } from "expo-router";
import "./globals.css";

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="create-watchlist" options={{ headerShown: false }} />
        <Stack.Screen name="watchlists" options={{ headerShown: false }} />
          <Stack.Screen name="watchlist-detail/[id]" options={{ headerShown: false }} />
        </Stack>
      </ToastProvider>
    </AuthProvider>
  );
}
