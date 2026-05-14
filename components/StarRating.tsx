import React, { useCallback } from "react";
import { View, Text, StyleSheet, GestureResponderEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppPressable from "./AppPressable";
import { colors, spacing } from "@/lib/theme";

type Props = {
  /** Current rating value 0–10 (supports 0.5 increments). */
  value: number;
  /** Called when the user taps a star half. */
  onChange: (next: number) => void;
  /** Number of star icons to render. Default 5 (representing 0–10). */
  stars?: number;
  /** Size of each star icon. Default 32. */
  size?: number;
  /** If true, stars are not interactive (display only). */
  readOnly?: boolean;
};

/**
 * A half-star rating input.
 *
 * 5 stars map to 0–10 scale:
 *   ★ = 2 points  ·  left-half tap = 1 point  ·  right-half tap = 2 points
 *
 * Tapping the same value again resets to 0 (toggle off).
 */
export default function StarRating({
  value,
  onChange,
  stars = 5,
  size = 32,
  readOnly = false,
}: Props) {
  const handleTap = useCallback(
    (starIndex: number, half: "left" | "right") => {
      if (readOnly) return;
      const tapped = starIndex * 2 + (half === "left" ? 1 : 2);
      // Toggle off if tapping the same value
      onChange(tapped === value ? 0 : tapped);
    },
    [readOnly, value, onChange]
  );

  const starElements = [];

  for (let i = 0; i < stars; i++) {
    const fullThreshold = (i + 1) * 2; // e.g. star 0 → 2, star 1 → 4 …
    const halfThreshold = i * 2 + 1;   // e.g. star 0 → 1, star 1 → 3 …

    let iconName: keyof typeof Ionicons.glyphMap = "star-outline";
    let iconColor = colors.textFaint;

    if (value >= fullThreshold) {
      iconName = "star";
      iconColor = colors.accent;
    } else if (value >= halfThreshold) {
      iconName = "star-half";
      iconColor = colors.accent;
    }

    starElements.push(
      <View key={i} style={{ position: "relative", width: size, height: size }}>
        {/* Visual star */}
        <Ionicons name={iconName} size={size} color={iconColor} />

        {!readOnly && (
          <>
            {/* Left-half touch target */}
            <AppPressable
              onPress={() => handleTap(i, "left")}
              pressedScale={1}
              pressedOpacity={0.6}
              style={[styles.hitArea, { width: size / 2, left: 0, height: size }]}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${halfThreshold} out of 10`}
            />
            {/* Right-half touch target */}
            <AppPressable
              onPress={() => handleTap(i, "right")}
              pressedScale={1}
              pressedOpacity={0.6}
              style={[styles.hitArea, { width: size / 2, right: 0, height: size }]}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${fullThreshold} out of 10`}
            />
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.starRow}>{starElements}</View>
      <Text style={styles.label}>
        {value > 0 ? `${value}/10` : "Tap to rate"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.sm,
  },
  starRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  hitArea: {
    position: "absolute",
    top: 0,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
});
