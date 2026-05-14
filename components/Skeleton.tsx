import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, View, ViewStyle, Easing } from "react-native";
import { radius, spacing } from "@/lib/theme";

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Animated opacity-pulse skeleton block.
 * Uses useNativeDriver, so no JS-thread cost.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: "#2A2A40",
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Pre-built skeletons that match common layout shapes in the app. */

export function SkeletonPosterCard() {
  return (
    <View style={{ width: 120, marginRight: spacing.md }}>
      <Skeleton height={180} borderRadius={radius.lg} />
      <Skeleton height={12} width="80%" style={{ marginTop: spacing.sm }} />
      <Skeleton height={10} width="50%" style={{ marginTop: spacing.xs }} />
    </View>
  );
}

export function SkeletonListRow() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: spacing.md,
        gap: spacing.md,
      }}
    >
      <Skeleton width={56} height={56} borderRadius={radius.md} />
      <View style={{ flex: 1 }}>
        <Skeleton height={14} width="70%" />
        <Skeleton height={10} width="40%" style={{ marginTop: spacing.sm }} />
      </View>
    </View>
  );
}

export function SkeletonWatchlistCard() {
  return (
    <View
      style={{
        padding: spacing.lg,
        borderRadius: radius.xxl,
        backgroundColor: "#1A1A2E",
        marginBottom: spacing.md,
      }}
    >
      <Skeleton height={18} width="60%" />
      <Skeleton height={12} width="40%" style={{ marginTop: spacing.sm }} />
      <View style={{ flexDirection: "row", marginTop: spacing.md, gap: spacing.sm }}>
        <Skeleton width={48} height={64} borderRadius={radius.md} />
        <Skeleton width={48} height={64} borderRadius={radius.md} />
        <Skeleton width={48} height={64} borderRadius={radius.md} />
      </View>
    </View>
  );
}

export function SkeletonProfileHeader() {
  return (
    <View style={{ alignItems: "center", padding: spacing.xl }}>
      <Skeleton width={96} height={96} borderRadius={radius.full} />
      <Skeleton height={16} width={140} style={{ marginTop: spacing.md }} />
      <Skeleton height={12} width={200} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

/**
 * Hero detail skeleton for movie/TV/game detail screens.
 * Mimics: full backdrop → overlapping poster + title lines.
 */
export function SkeletonHeroDetail() {
  return (
    <View>
      {/* Backdrop area */}
      <Skeleton width="100%" height={280} borderRadius={0} />

      {/* Poster + title area (overlapping the backdrop) */}
      <View style={{ flexDirection: "row", paddingHorizontal: spacing.xl, marginTop: -64 }}>
        <Skeleton width={100} height={150} borderRadius={radius.lg} />
        <View style={{ flex: 1, marginLeft: spacing.lg, justifyContent: "flex-end" }}>
          <Skeleton height={22} width="80%" />
          <Skeleton height={14} width="50%" style={{ marginTop: spacing.sm }} />
          <Skeleton height={12} width="40%" style={{ marginTop: spacing.sm }} />
        </View>
      </View>

      {/* Tab bar placeholder */}
      <View style={{ flexDirection: "row", paddingHorizontal: spacing.xl, marginTop: spacing.xl, gap: spacing.xl }}>
        <Skeleton width={60} height={14} />
        <Skeleton width={40} height={14} />
        <Skeleton width={40} height={14} />
      </View>

      {/* Content lines */}
      <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
        <Skeleton height={14} width="100%" style={{ marginTop: spacing.sm }} />
        <Skeleton height={14} width="90%" style={{ marginTop: spacing.sm }} />
        <Skeleton height={14} width="70%" style={{ marginTop: spacing.sm }} />

        {/* Genre pills */}
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
          <Skeleton width={64} height={24} borderRadius={radius.full} />
          <Skeleton width={56} height={24} borderRadius={radius.full} />
          <Skeleton width={72} height={24} borderRadius={radius.full} />
        </View>
      </View>
    </View>
  );
}

export default Skeleton;
