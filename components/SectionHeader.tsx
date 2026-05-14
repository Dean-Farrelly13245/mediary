import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AppPressable from "./AppPressable";
import { colors, fontSize, spacing } from "@/lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Consistent section header used across Home, Profile, and Search.
 *
 *   ┌─────────────────────────────────────┐
 *   │  Title                     See All →│
 *   │  subtitle (optional)                │
 *   └─────────────────────────────────────┘
 */
export default function SectionHeader({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <AppPressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel} →</Text>
        </AppPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  textCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  action: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
