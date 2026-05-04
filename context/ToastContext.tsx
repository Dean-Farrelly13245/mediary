import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View, Easing, Platform } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

export type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
};

type ToastContextValue = {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 2000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info", duration = DEFAULT_DURATION) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
    },
    []
  );

  const value: ToastContextValue = {
    show,
    success: (m, d) => show(m, "success", d),
    error: (m, d) => show(m, "error", d),
    info: (m, d) => show(m, "info", d),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft in dev — logs instead of throwing so a missing provider doesn't
    // crash the whole tree. Callers should still mount <ToastProvider>.
    if (__DEV__) console.warn("useToast used outside ToastProvider");
    const noop = () => {};
    return { show: noop, success: noop, error: noop, info: noop };
  }
  return ctx;
}

// -- Viewport ---------------------------------------------------------------

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <View pointerEvents="box-none" style={styles.viewport}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -20,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss(toast.id));
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, translateY, opacity, onDismiss]);

  const bg =
    toast.variant === "success"
      ? colors.success
      : toast.variant === "error"
      ? colors.error
      : colors.info;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bg, transform: [{ translateY }], opacity },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={styles.text} numberOfLines={3}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 32,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
  },
  toast: {
    minWidth: 200,
    maxWidth: "100%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
