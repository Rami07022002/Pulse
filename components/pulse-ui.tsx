import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radii, shadows } from "@/constants/theme";
import { Fonts } from "@/constants/Typography";

export type IconName = keyof typeof Ionicons.glyphMap;

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  online?: boolean;
}

export function Avatar({ name, color, size = 48, online = false }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "P";
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{initial}</Text>
      {online ? <View style={styles.onlineDot} /> : null}
    </View>
  );
}

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
}

export function IconButton({ icon, onPress, accessibilityLabel, color = colors.textSecondary, size = 20 }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

interface SectionLabelProps {
  children: string;
  action?: string;
  onAction?: () => void;
}

export function SectionLabel({ children, action, onAction }: SectionLabelProps) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{children}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.violet} />
        </Pressable>
      ) : null}
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.stateContainer}>
      <View style={styles.errorIcon}>
        <Ionicons name="alert-circle-outline" size={25} color={colors.danger} />
      </View>
      <Text selectable style={styles.stateTitle}>Something went off beat</Text>
      <Text selectable style={styles.stateMessage}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="small" color={colors.violet} />
      <Text style={styles.stateTitle}>Tuning your pulse</Text>
    </View>
  );
}

interface PulseButtonProps {
  onPress: () => void;
}

export function PulseButton({ onPress }: PulseButtonProps) {
  const breathe = useRef(new Animated.Value(1)).current;
  const ringOne = useRef(new Animated.Value(0)).current;
  const ringTwo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.04, duration: 1800, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]),
    );
    breathing.start();
    return () => breathing.stop();
  }, [breathe]);

  const handlePress = useCallback(() => {
    ringOne.setValue(0);
    ringTwo.setValue(0.15);
    Animated.parallel([
      Animated.timing(ringOne, { toValue: 1, duration: 720, useNativeDriver: true }),
      Animated.timing(ringTwo, { toValue: 1, duration: 900, delay: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  }, [onPress, ringOne, ringTwo]);

  const ringStyle = (value: Animated.Value, scale: number) => ({
    opacity: value.interpolate({ inputRange: [0, 0.16, 1], outputRange: [0, 0.62, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) }],
  });

  return (
    <View style={styles.pulseWrap}>
      <Animated.View pointerEvents="none" style={[styles.ripple, ringStyle(ringTwo, 1.72)]} />
      <Animated.View pointerEvents="none" style={[styles.ripple, ringStyle(ringOne, 1.45)]} />
      <Animated.View style={{ transform: [{ scale: breathe }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send a pulse to your partner"
          onPress={handlePress}
          style={({ pressed }) => [styles.pulseButton, pressed && styles.pulsePressed]}
        >
          <View style={styles.pulseInner}>
            <Ionicons name="heart" size={31} color={colors.white} />
            <Text style={styles.pulseText}>Tap to pulse</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarText: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
  },
  onlineDot: {
    position: "absolute",
    right: -1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.mint,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 44,
    borderRadius: radii.pill,
  },
  pressed: {
    opacity: 0.68,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: 3,
  },
  sectionActionText: {
    color: colors.violet,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
    backgroundColor: colors.background,
  },
  errorIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#271820",
  },
  stateTitle: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 17,
    textAlign: "center",
  },
  stateMessage: {
    maxWidth: 300,
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.violet,
  },
  retryText: {
    color: colors.background,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  pulseWrap: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    borderColor: colors.violet,
    backgroundColor: "rgba(167, 139, 250, 0.08)",
  },
  pulseButton: {
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 75,
    backgroundColor: colors.pink,
    ...shadows.violet,
  },
  pulsePressed: {
    transform: [{ scale: 0.96 }],
  },
  pulseInner: {
    width: 136,
    height: 136,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 68,
    backgroundColor: colors.violet,
  },
  pulseText: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
