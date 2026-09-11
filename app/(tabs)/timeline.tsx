import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadows } from "@/constants/theme";
import { Fonts } from "@/constants/Typography";
import { clockTime, hourLabel } from "@/lib/time";
import { ErrorState, LoadingState, SectionLabel, type IconName } from "@/components/pulse-ui";
import { useAppStore } from "@/store/useAppStore";
import type { TimelineEvent } from "@/store/types";

interface TimelineGroup {
  id: string;
  label: string;
  events: TimelineEvent[];
}

function eventIcon(event: TimelineEvent): IconName {
  if (event.icon) {
    return event.icon as IconName;
  }
  return event.type === "pulse_received" ? "heart" : "pulse-outline";
}

function TimelineEventRow({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const isMine = event.actor === "me";
  const accent = isMine ? colors.violetBright : colors.pink;
  return (
    <View style={styles.eventRow}>
      <View style={styles.eventTime}>
        <Text style={styles.eventTimeText}>{clockTime(event.timestamp)}</Text>
      </View>
      <View style={styles.eventRail}>
        <View style={[styles.eventDot, { backgroundColor: accent, shadowColor: accent }]}>
          <View style={styles.eventDotCenter} />
        </View>
        {!isLast ? <View style={styles.eventLine} /> : null}
      </View>
      <View style={[styles.eventCard, { borderColor: isMine ? "#3A3159" : "#4A2D42" }]}>
        <View style={[styles.eventIcon, { backgroundColor: isMine ? "#251E3D" : "#35202D" }]}>
          <Ionicons name={eventIcon(event)} size={16} color={accent} />
        </View>
        <View style={styles.eventCopy}>
          <Text style={styles.eventActor}>{isMine ? "You" : "Alex"}</Text>
          <Text style={styles.eventContent}>{event.content.replace(/^(You|Alex) /, "")}</Text>
        </View>
      </View>
    </View>
  );
}

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const hydrated = useAppStore((state) => state.hydrated);
  const error = useAppStore((state) => state.error);
  const events = useAppStore((state) => state.events);
  const clearError = useAppStore((state) => state.clearError);
  const pruneTimeline = useAppStore((state) => state.pruneTimeline);

  const groups = useMemo<TimelineGroup[]>(() => {
    const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
    const grouped = new Map<string, TimelineEvent[]>();
    sorted.forEach((event) => {
      const key = `${new Date(event.timestamp).getFullYear()}-${new Date(event.timestamp).getMonth()}-${new Date(event.timestamp).getDate()}-${new Date(event.timestamp).getHours()}`;
      const existing = grouped.get(key) ?? [];
      existing.push(event);
      grouped.set(key, existing);
    });
    return Array.from(grouped.entries()).map(([id, groupEvents]) => ({
      id,
      label: hourLabel(groupEvents[0]?.timestamp ?? Date.now()),
      events: groupEvents,
    }));
  }, [events]);

  const handleRetry = useCallback(() => {
    clearError();
    pruneTimeline();
  }, [clearError, pruneTimeline]);

  if (!hydrated) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: "Timeline", headerShown: false }} />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 88 }]}
        data={groups}
        keyExtractor={(group) => group.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="sparkles-outline" size={24} color={colors.violetBright} />
            </View>
            <Text style={styles.emptyTitle}>Your story starts today</Text>
            <Text style={styles.emptyMessage}>Send a pulse or set a status to leave the first little mark.</Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Today</Text>
              <Text style={styles.subtitle}>The small moments that keep you close.</Text>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        }
        renderItem={({ item: group }) => (
          <View style={styles.group}>
            <SectionLabel>{group.label}</SectionLabel>
            <View style={styles.groupEvents}>
              {group.events.map((event, index) => (
                <TimelineEventRow key={event.id} event={event} isLast={index === group.events.length - 1} />
              ))}
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 580,
    alignSelf: "center",
    paddingHorizontal: 18,
    gap: 26,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  title: {
    color: colors.white,
    fontFamily: Fonts.bold,
    fontSize: 32,
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 6,
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
  livePill: {
    minHeight: 30,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radii.pill,
    backgroundColor: "#14281F",
    borderWidth: 1,
    borderColor: "#27513D",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.mint,
  },
  liveText: {
    color: colors.mintSoft,
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  group: {
    gap: 12,
  },
  groupEvents: {
    gap: 10,
  },
  eventRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "stretch",
  },
  eventTime: {
    width: 58,
    paddingTop: 15,
    paddingRight: 8,
    alignItems: "flex-end",
  },
  eventTimeText: {
    color: colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: 11,
    textAlign: "right",
  },
  eventRail: {
    width: 22,
    alignItems: "center",
  },
  eventDot: {
    width: 13,
    height: 13,
    marginTop: 15,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    shadowOpacity: 0.7,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  eventDotCenter: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  eventLine: {
    flex: 1,
    width: 1,
    marginTop: 4,
    backgroundColor: colors.border,
  },
  eventCard: {
    flex: 1,
    minHeight: 67,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    ...shadows.card,
  },
  eventIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  eventCopy: {
    flex: 1,
    gap: 3,
  },
  eventActor: {
    color: colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
  eventContent: {
    color: colors.white,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyState: {
    flex: 1,
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#201A34",
    borderWidth: 1,
    borderColor: "#493B70",
  },
  emptyTitle: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 17,
  },
  emptyMessage: {
    maxWidth: 270,
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
});
