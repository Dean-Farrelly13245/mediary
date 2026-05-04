import React, { useCallback, useRef } from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from "react-native";
import { ANDROID_RIPPLE } from "@/lib/theme";

type Props = PressableProps & {
  /** Scale on press. Default 0.97. Set to 1 to disable. */
  pressedScale?: number;
  /** Opacity on press. Default 0.7. */
  pressedOpacity?: number;
  /** Disable the ripple on Android. */
  disableRipple?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Reusable pressable with consistent feedback across the app:
 *   - subtle scale-down on press
 *   - opacity fade
 *   - android_ripple
 *
 * Drop-in replacement for TouchableOpacity.
 */
function AppPressableInner(
  {
    pressedScale = 0.97,
    pressedOpacity = 0.7,
    disableRipple = false,
    style,
    children,
    onPressIn,
    onPressOut,
    android_ripple,
    disabled,
    ...rest
  }: Props,
  ref: React.Ref<any>
) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (disabled) {
        onPressIn?.(e);
        return;
      }

      Animated.parallel([
        Animated.spring(scale, {
          toValue: pressedScale,
          useNativeDriver: true,
          speed: 50,
          bounciness: 0,
        }),
        Animated.timing(opacity, {
          toValue: pressedOpacity,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
      onPressIn?.(e);
    },
    [disabled, scale, opacity, pressedScale, pressedOpacity, onPressIn]
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      if (disabled) {
        onPressOut?.(e);
        return;
      }

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 4,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
      onPressOut?.(e);
    },
    [disabled, scale, opacity, onPressOut]
  );

  return (
    <AnimatedPressable
      ref={ref}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={disableRipple ? undefined : android_ripple ?? ANDROID_RIPPLE}
      disabled={disabled}
      style={[style, { transform: [{ scale }], opacity }]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

const AppPressable = React.forwardRef(AppPressableInner);
export default AppPressable;
