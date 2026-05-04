import React from "react";
import { Text, View, StyleSheet, Platform, StatusBar } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppPressable from "./AppPressable";
import { colors, iconSize, spacing, HIT_SLOP_44 } from "@/lib/theme";

type Props = {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  /** Optional subtitle rendered below the title. */
  subtitle?: string;
};

/**
 * Standard screen header used across the app.
 * - Safe-area aware top padding
 * - 44x44 hit target back button
 * - Consistent title typography
 */
export default function ScreenHeader({
  title,
  showBack = true,
  onBack,
  rightAction,
  subtitle,
}: Props) {
  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.side}>
          {showBack ? (
            <AppPressable
              onPress={handleBack}
              hitSlop={HIT_SLOP_44}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={iconSize.lg} color={colors.text} />
            </AppPressable>
          ) : null}
        </View>

        <View style={styles.center}>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={[styles.side, { alignItems: "flex-end" }]}>
          {rightAction ?? null}
        </View>
      </View>
    </View>
  );
}

const TOP_PAD = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) + spacing.sm : 52;

const styles = StyleSheet.create({
  container: {
    paddingTop: TOP_PAD,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    zIndex: 10,
    elevation: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  side: {
    width: 44,
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 11,
    elevation: 11,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
