import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { statusOptions, type StatusOption } from "@/constants/statuses";
import { colors, radii, shadows } from "@/constants/theme";
import { Fonts } from "@/constants/Typography";
import { triggerHaptic } from "@/lib/haptics";
import { relativeTime } from "@/lib/time";
import { Avatar, ErrorState, IconButton, LoadingState, PulseButton, SectionLabel, type IconName } from "@/components/pulse-ui";
import { useAppStore } from "@/store/useAppStore";

interface StatusChipProps {
  option: StatusOption;
  active: boolean;
  onPress: (option: StatusOption) => void;
}

function StatusChip({ option, active, onPress }: StatusChipProps) {
  const handlePress = useCallback(() => onPress(option), [onPress, option]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Set status to ${option.label}`}
      onPress={handlePress}
      style={({ pressed }) => [styles.statusChip, active && styles.statusChipActive, pressed && styles.chipPressed]}
    >
      <Ionicons name={option.icon} size={18} color={active ? colors.violetBright : colors.textSecondary} />
      <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{option.label}</Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const hydrated = useAppStore((state) => state.hydrated);
  const error = useAppStore((state) => state.error);
  const user = useAppStore((state) => state.user);
  const status = useAppStore((state) => state.status);
  const streak = useAppStore((state) => state.streak);
  const sendPulse = useAppStore((state) => state.sendPulse);
  const setMyStatus = useAppStore((state) => state.setMyStatus);
  const clearError = useAppStore((state) => state.clearError);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeout = setTimeout(() => setNotice(null), 2800);
    return () => clearTimeout(timeout);
  }, [notice]);

  const activeStatus = useMemo(() => {
    if (!status.myStatus || status.myStatus.expiresAt <= now) {
      return null;
    }
    return status.myStatus;
  }, [now, status.myStatus]);

  const partnerStatusText = useMemo(() => {
    if (!status.partnerStatus) {
      return "No status yet";
    }
    return `${status.partnerStatus.label} · ${relativeTime(status.partnerStatus.setAt, now)}`;
  }, [now, status.partnerStatus]);

  const handlePulse = useCallback(() => {
    sendPulse();
    void triggerHaptic(user.hapticIntensity === "light" ? "medium" : "heavy");
    setNotice(`Pulse sent to ${user.partnerName}`);
  }, [sendPulse, user.hapticIntensity, user.partnerName]);

  const handleStatus = useCallback(
    (option: StatusOption) => {
      setMyStatus(option.icon, option.label);
      void triggerHaptic("light");
      setNotice(`Status set to ${option.label}`);
    },
    [setMyStatus],
  );

  const handleBell = useCallback(() => {
    void triggerHaptic("light");
    setNotice("You're all caught up");
  }, []);

  const handleRetry = useCallback(() => {
    clearError();
  }, [clearError]);

  if (!hydrated) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />;
  }

  return (
    <View testID="home-screen" style={styles.screen}>
      <Stack.Screen options={{ title: "Dashboard", headerShown: false }} />
      <ScrollView
        testID="home-screen-content"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 88 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Good evening, {user.displayName}</Text>
            <Text style={styles.topHint}>Your little corner of calm.</Text>
          </View>
          <IconButton icon="notifications-outline" accessibilityLabel="View notifications" onPress={handleBell} color={colors.violetBright} />
        </View>

        <View style={styles.partnerCard}>
          <View style={styles.partnerIdentity}>
            <Avatar color={user.partnerAvatarColor} name={user.partnerName} size={52} online />
            <View style={styles.partnerCopy}>
              <View style={styles.partnerNameRow}>
                <Text style={styles.partnerName}>{user.partnerName}</Text>
                <View style={styles.onlineLabel}>
                  <View style={styles.onlineLabelDot} />
                  <Text style={styles.onlineLabelText}>Online</Text>
                </View>
              </View>
              <View style={styles.statusLine}>
                <Ionicons name={(status.partnerStatus?.icon as IconName | undefined) ?? "sparkles-outline"} size={15} color={colors.orange} />
                <Text style={styles.partnerStatus}>{partnerStatusText}</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
        </View>

        <View style={styles.pulseSection}>
          <PulseButton onPress={handlePulse} />
          <Text style={styles.pulseCaption}>A tiny signal goes a long way.</Text>
        </View>

        <View style={styles.sectionBlock}>
          <SectionLabel>Quick status</SectionLabel>
          {activeStatus ? (
            <View style={styles.activeStatusBanner}>
              <Ionicons name={activeStatus.icon as IconName} size={16} color={colors.violetBright} />
              <Text style={styles.activeStatusText}>You are in {activeStatus.label.toLowerCase()}</Text>
              <Text style={styles.activeStatusTime}>2h window</Text>
            </View>
          ) : null}
          <View style={styles.statusGrid}>
            {statusOptions.map((option) => (
              <StatusChip key={option.id} active={activeStatus?.label === option.label} onPress={handleStatus} option={option} />
            ))}
          </View>
        </View>

        <View style={styles.streakCard}>
          <View style={styles.streakIcon}>
            <Ionicons name="flame" size={25} color={colors.mint} />
          </View>
          <View style={styles.streakMetric}>
            <Text style={styles.metricValue}>{streak.currentStreak}</Text>
            <Text style={styles.metricLabel}>day streak</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.streakMetric}>
            <Text style={styles.metricValue}>{streak.momentCount}</Text>
            <Text style={styles.metricLabel}>moments this week</Text>
          </View>
          <Ionicons name="trending-up" size={18} color={colors.mint} style={styles.streakArrow} />
        </View>

        {notice ? (
          <View style={styles.notice}>
            <Ionicons name="checkmark-circle" size={17} color={colors.mint} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 580,
    alignSelf: "center",
    paddingHorizontal: 18,
    gap: 21,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  topHint: {
    marginTop: 4,
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  partnerCard: {
    minHeight: 91,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  partnerIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  partnerCopy: {
    flex: 1,
    gap: 7,
  },
  partnerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  partnerName: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 18,
  },
  onlineLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  onlineLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mint,
  },
  onlineLabelText: {
    color: colors.mint,
    fontFamily: Fonts.medium,
    fontSize: 10,
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  partnerStatus: {
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  pulseSection: {
    alignItems: "center",
    gap: 2,
    paddingTop: 4,
  },
  pulseCaption: {
    color: colors.textTertiary,
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  sectionBlock: {
    gap: 12,
  },
  activeStatusBanner: {
    minHeight: 34,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 10,
    backgroundColor: "#19152A",
    borderWidth: 1,
    borderColor: "#453667",
  },
  activeStatusText: {
    flex: 1,
    color: colors.violetBright,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  activeStatusTime: {
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 10,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  statusChip: {
    width: "48.2%",
    minHeight: 49,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  statusChipActive: {
    backgroundColor: "#201A36",
    borderColor: colors.violet,
    shadowColor: colors.violet,
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  chipPressed: {
    opacity: 0.7,
  },
  statusChipText: {
    flex: 1,
    color: colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  statusChipTextActive: {
    color: colors.white,
  },
  streakCard: {
    minHeight: 80,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.medium,
    backgroundColor: "#172723",
    borderWidth: 1,
    borderColor: "#285345",
    ...shadows.card,
  },
  streakIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#1C4538",
  },
  streakMetric: {
    paddingHorizontal: 13,
    gap: 1,
  },
  metricValue: {
    color: colors.white,
    fontFamily: Fonts.bold,
    fontSize: 22,
    fontVariant: ["tabular-nums"],
  },
  metricLabel: {
    color: colors.mintSoft,
    fontFamily: Fonts.regular,
    fontSize: 10,
  },
  metricDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#316557",
  },
  streakArrow: {
    marginLeft: "auto",
    marginRight: 4,
  },
  notice: {
    alignSelf: "center",
    minHeight: 42,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  noticeText: {
    color: colors.white,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
});
