import { Ionicons } from "@expo/vector-icons";
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@fastshot/auth";
import { colors, radii, shadows } from "@/constants/theme";
import { Fonts } from "@/constants/Typography";
import { triggerHaptic } from "@/lib/haptics";
import {
  Avatar,
  ErrorState,
  LoadingState,
  SectionLabel,
} from "@/components/pulse-ui";
import { useAppStore } from "@/store/useAppStore";
import type { HapticIntensity } from "@/store/types";

const avatarColors = [
  colors.pink,
  colors.violet,
  colors.mint,
  colors.orange,
  "#60A5FA",
];
const hapticOptions: HapticIntensity[] = ["light", "medium", "heavy"];
const hexColorPattern = /^#[0-9A-F]{6}$/i;

function WidgetPreview({ type }: { type: "home" | "lock" }) {
  return (
    <View style={[styles.widgetPreview, type === "lock" && styles.lockPreview]}>
      <View style={styles.previewNotch} />
      {type === "home" ? (
        <View style={styles.homeWidgets}>
          <View style={styles.miniPulseWidget}>
            <Ionicons name="pulse" size={16} color={colors.violetBright} />
            <Text style={styles.miniWidgetText}>Pulse</Text>
          </View>
          <View style={styles.miniAppGrid}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={`app-${index}`} style={styles.miniApp} />
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.lockWidget}>
          <Ionicons name="heart" size={15} color={colors.pink} />
          <View style={styles.lockLines}>
            <View style={styles.lockLineShort} />
            <View style={styles.lockLine} />
          </View>
        </View>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const hydrated = useAppStore((s) => s.hydrated);
  const error = useAppStore((s) => s.error);
  const user = useAppStore((s) => s.user);
  const clearError = useAppStore((s) => s.clearError);
  const updateDisplayName = useAppStore((s) => s.updateDisplayName);
  const updateAvatarColor = useAppStore((s) => s.updateAvatarColor);
  const updateHapticIntensity = useAppStore((s) => s.updateHapticIntensity);
  const unpair = useAppStore((s) => s.unpair);
  const reset = useAppStore((s) => s.reset);

  const [displayName, setDisplayName] = useState(user.displayName);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showUnpairModal, setShowUnpairModal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [colorHex, setColorHex] = useState(user.avatarColor);
  const [colorError, setColorError] = useState<string | null>(null);

  const paletteColors = useMemo(
    () => [...new Set([...avatarColors, ...customColors])],
    [customColors],
  );

  const handleNameChange = useCallback((value: string) => {
    setDisplayName(value);
  }, []);

  const handleSaveProfile = useCallback(() => {
    updateDisplayName(displayName);
    void triggerHaptic("light");
    setNotice("Profile saved");
  }, [displayName, updateDisplayName]);

  const handleAvatarColor = useCallback(
    (color: string) => {
      updateAvatarColor(color);
      setColorHex(color);
      setColorError(null);
      void triggerHaptic("light");
    },
    [updateAvatarColor],
  );

  const handleColorHexChange = useCallback((value: string) => {
    const normalized = value.startsWith("#") ? value : `#${value}`;
    setColorHex(normalized.slice(0, 7).toUpperCase());
    setColorError(null);
  }, []);

  const handleAddColor = useCallback(() => {
    const normalized = colorHex.trim().toUpperCase();
    if (!hexColorPattern.test(normalized)) {
      setColorError("Use a six-digit hex color, like #A78BFA.");
      return;
    }
    setCustomColors((existing) =>
      existing.includes(normalized) ? existing : [...existing, normalized],
    );
    updateAvatarColor(normalized);
    setColorHex(normalized);
    setColorError(null);
    setNotice("Custom color added");
    void triggerHaptic("light");
  }, [colorHex, updateAvatarColor]);

  const handleResetColors = useCallback(() => {
    const fallbackColor = avatarColors[0];
    setCustomColors([]);
    setColorHex(fallbackColor);
    setColorError(null);
    updateAvatarColor(fallbackColor);
    setNotice("Custom colors cleared");
    void triggerHaptic("light");
  }, [updateAvatarColor]);

  const handleHapticIntensity = useCallback(
    (intensity: HapticIntensity) => {
      updateHapticIntensity(intensity);
      void triggerHaptic(intensity);
      setNotice(
        `${intensity[0].toUpperCase()}${intensity.slice(1)} haptics selected`,
      );
    },
    [updateHapticIntensity],
  );

  const handleNotifications = useCallback(() => {
    setNotificationsEnabled((enabled) => !enabled);
    setNotice(
      notificationsEnabled
        ? "Notifications paused"
        : "Notifications enabled for this demo",
    );
    void triggerHaptic("light");
  }, [notificationsEnabled]);

  const handleUnpair = useCallback(() => {
    setShowUnpairModal(true);
  }, []);

  const handleCancelUnpair = useCallback(() => {
    setShowUnpairModal(false);
  }, []);

  const handleConfirmUnpair = useCallback(() => {
    unpair();
    setShowUnpairModal(false);
    router.replace("/pairing");
  }, [unpair]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      reset();
      router.replace("/auth");
    } catch {
      setNotice("Sign out failed. Please try again.");
    }
  }, [signOut, reset]);

  const handleDiscord = useCallback(async () => {
    const url = "https://discord.com";
    try {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.click();
      } else {
        await Linking.openURL(url);
      }
    } catch {
      setNotice("Discord could not be opened right now");
    }
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
    <>
      <Stack.Screen options={{ title: "Settings", headerShown: false }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 88,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Make the little details feel like yours.
          </Text>
        </View>

        {/* Widget Guide */}
        <View style={styles.sectionBlock}>
          <SectionLabel>Widget guide</SectionLabel>
          <View style={styles.widgetRow}>
            <View style={styles.widgetCard}>
              <WidgetPreview type="home" />
              <View style={styles.widgetCardFooter}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepText}>01</Text>
                </View>
                <View style={styles.widgetCopy}>
                  <Text style={styles.widgetTitle}>Home screen</Text>
                  <Text style={styles.widgetDescription}>
                    Long press your home screen, then add Pulse.
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.widgetCard}>
              <WidgetPreview type="lock" />
              <View style={styles.widgetCardFooter}>
                <View style={[styles.stepBadge, styles.stepBadgePink]}>
                  <Text style={styles.stepText}>02</Text>
                </View>
                <View style={styles.widgetCopy}>
                  <Text style={styles.widgetTitle}>Lock screen</Text>
                  <Text style={styles.widgetDescription}>
                    Add a quiet pulse beside your clock.
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleNotifications}
            style={({ pressed }) => [
              styles.notificationButton,
              notificationsEnabled && styles.notificationButtonActive,
              pressed && styles.buttonPressed,
            ]}
          >
            <View style={styles.notificationIcon}>
              <Ionicons
                name={
                  notificationsEnabled
                    ? "notifications"
                    : "notifications-outline"
                }
                size={18}
                color={colors.violetBright}
              />
            </View>
            <View style={styles.notificationCopy}>
              <Text style={styles.notificationTitle}>
                {notificationsEnabled
                  ? "Notifications are on"
                  : "Enable notifications"}
              </Text>
              <Text style={styles.notificationSubtitle}>
                Get a gentle nudge when your person checks in.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={17}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Profile Settings */}
        <View style={styles.sectionBlock}>
          <SectionLabel>Profile</SectionLabel>
          <View testID="color-picker-screen" style={styles.card}>
            <View style={styles.profileTop}>
              <Avatar
                color={user.avatarColor}
                name={displayName}
                size={52}
              />
              <View style={styles.profileCopy}>
                <Text style={styles.profileLabel}>Your display name</Text>
                <Text style={styles.profileSubtext}>
                  This is how {user.partnerName} sees you.
                </Text>
              </View>
            </View>
            <View style={styles.profileEditRow}>
              <TextInput
                autoCapitalize="words"
                onChangeText={handleNameChange}
                placeholder="Display name"
                placeholderTextColor={colors.textTertiary}
                style={styles.nameInput}
                value={displayName}
              />
              <Pressable
                accessibilityRole="button"
                onPress={handleSaveProfile}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
            <View style={styles.paletteBlock}>
              <View style={styles.colorRow}>
                <Text style={styles.colorLabel}>Avatar color</Text>
                <View style={styles.colorOptions}>
                  <View style={styles.colorOptionsInner}>
                    {paletteColors.map((color) => (
                      <Pressable
                        key={color}
                        accessibilityRole="button"
                        accessibilityLabel={`Choose ${color} avatar color`}
                        onPress={() => handleAvatarColor(color)}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          user.avatarColor === color &&
                            styles.colorOptionActive,
                        ]}
                      >
                        {user.avatarColor === color ? (
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color={colors.background}
                          />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              <View style={styles.customColorRow}>
                <TextInput
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={7}
                  onChangeText={handleColorHexChange}
                  placeholder="#A78BFA"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.colorHexInput}
                  value={colorHex}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={handleAddColor}
                  style={({ pressed }) => [
                    styles.addColorButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons name="add" size={17} color={colors.background} />
                  <Text style={styles.addColorText}>Add</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset custom colors"
                  onPress={handleResetColors}
                  style={({ pressed }) => [
                    styles.deletePaletteButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.pinkSoft}
                  />
                </Pressable>
              </View>
              {colorError ? (
                <Text selectable style={styles.colorError}>
                  {colorError}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Haptic Intensity */}
        <View style={styles.sectionBlock}>
          <SectionLabel>Haptic intensity</SectionLabel>
          <View style={styles.segmentedControl}>
            {hapticOptions.map((intensity) => (
              <Pressable
                key={intensity}
                accessibilityRole="button"
                onPress={() => handleHapticIntensity(intensity)}
                style={[
                  styles.segment,
                  user.hapticIntensity === intensity && styles.segmentActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    user.hapticIntensity === intensity &&
                      styles.segmentTextActive,
                  ]}
                >
                  {intensity[0].toUpperCase()}
                  {intensity.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Pairing */}
        <View style={styles.sectionBlock}>
          <SectionLabel>Pairing</SectionLabel>
          <View style={styles.pairingCard}>
            <Avatar
              color={user.partnerAvatarColor}
              name={user.partnerName}
              size={45}
              online
            />
            <View style={styles.pairingCopy}>
              <Text style={styles.pairingLabel}>Currently paired with</Text>
              <Text style={styles.pairingName}>{user.partnerName}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={handleUnpair}
              style={({ pressed }) => [
                styles.unpairButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.unpairText}>Unpair</Text>
            </Pressable>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={styles.version}>Pulse v1.0.0</Text>
          <Pressable
            accessibilityRole="link"
            onPress={handleDiscord}
            style={styles.discordButton}
          >
            <Ionicons
              name="logo-discord"
              size={16}
              color={colors.violetBright}
            />
            <Text style={styles.discordText}>Join the Discord</Text>
          </Pressable>
        </View>

        {/* Sign Out */}
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </ScrollView>

      {/* Unpair Confirmation Modal */}
      <Modal
        animationType="fade"
        onRequestClose={handleCancelUnpair}
        transparent
        visible={showUnpairModal}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.modalIcon}>
              <Ionicons name="link-outline" size={24} color={colors.pink} />
            </View>
            <Text style={styles.modalTitle}>
              Unpair from {user.partnerName}?
            </Text>
            <Text style={styles.modalMessage}>
              Your timeline and partner connection will be cleared. You can pair
              again anytime.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleCancelUnpair}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Keep connection</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleConfirmUnpair}
                style={styles.modalConfirm}
              >
                <Text style={styles.modalConfirmText}>Unpair</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  header: { gap: 6 },
  title: {
    color: colors.white,
    fontFamily: Fonts.bold,
    fontSize: 32,
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
  sectionBlock: { gap: 12 },
  widgetRow: { flexDirection: "row", gap: 10 },
  widgetCard: {
    flex: 1,
    overflow: "hidden",
    borderRadius: radii.medium,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  widgetPreview: {
    height: 126,
    margin: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "#211B38",
    borderWidth: 1,
    borderColor: "#54467B",
  },
  lockPreview: { backgroundColor: "#30252D", borderColor: "#644257" },
  previewNotch: {
    position: "absolute",
    top: 7,
    width: 31,
    height: 6,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  homeWidgets: { width: "75%", gap: 10 },
  miniPulseWidget: {
    height: 43,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 9,
    borderCurve: "continuous",
    backgroundColor: "#0F0E1A",
  },
  miniWidgetText: {
    color: colors.violetBright,
    fontFamily: Fonts.semiBold,
    fontSize: 10,
  },
  miniAppGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  miniApp: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: "#8F7EC6",
    opacity: 0.8,
  },
  lockWidget: {
    width: "72%",
    minHeight: 46,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 9,
    borderCurve: "continuous",
    backgroundColor: "#141116",
  },
  lockLines: { flex: 1, gap: 5 },
  lockLineShort: {
    width: "60%",
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.pink,
  },
  lockLine: {
    width: "88%",
    height: 4,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
  },
  widgetCardFooter: {
    minHeight: 79,
    padding: 11,
    flexDirection: "row",
    gap: 8,
  },
  stepBadge: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "#33285A",
  },
  stepBadgePink: { backgroundColor: "#4A263B" },
  stepText: {
    color: colors.violetBright,
    fontFamily: Fonts.bold,
    fontSize: 9,
  },
  widgetCopy: { flex: 1, gap: 4 },
  widgetTitle: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  widgetDescription: {
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 10,
    lineHeight: 14,
  },
  notificationButton: {
    minHeight: 65,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radii.medium,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationButtonActive: {
    backgroundColor: "#1B2025",
    borderColor: "#315445",
  },
  notificationIcon: {
    width: 37,
    height: 37,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: "#241C3C",
  },
  notificationCopy: { flex: 1, gap: 3 },
  notificationTitle: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  notificationSubtitle: {
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 11,
  },
  card: {
    gap: 16,
    padding: 16,
    borderRadius: radii.medium,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  paletteBlock: { gap: 12 },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileCopy: { gap: 4 },
  profileLabel: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  profileSubtext: {
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 11,
  },
  profileEditRow: { flexDirection: "row", gap: 8 },
  nameInput: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderCurve: "continuous",
    color: colors.white,
    fontFamily: Fonts.regular,
    fontSize: 13,
    backgroundColor: colors.backgroundRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    minWidth: 63,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: colors.violet,
  },
  saveText: {
    color: colors.background,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colorLabel: {
    color: colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  colorOptions: { flexDirection: "row", gap: 10 },
  colorOptionsInner: { flexDirection: "row", gap: 10 },
  customColorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  colorHexInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderCurve: "continuous",
    color: colors.white,
    fontFamily: Fonts.medium,
    fontSize: 12,
    backgroundColor: colors.backgroundRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addColorButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: colors.violet,
  },
  addColorText: {
    color: colors.background,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  deletePaletteButton: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: "#40232D",
  },
  colorError: {
    color: colors.danger,
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
  colorOption: {
    width: 27,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  colorOptionActive: { borderWidth: 2, borderColor: colors.white },
  segmentedControl: {
    padding: 4,
    flexDirection: "row",
    gap: 4,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderCurve: "continuous",
  },
  segmentActive: {
    backgroundColor: colors.surfaceElevated,
    shadowColor: colors.violet,
    shadowOpacity: 0.14,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  segmentText: {
    color: colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  segmentTextActive: { color: colors.violetBright },
  pairingCard: {
    minHeight: 80,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: radii.medium,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pairingCopy: { flex: 1, gap: 4 },
  pairingLabel: {
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 11,
  },
  pairingName: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
  unpairButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: "#40232D",
  },
  unpairText: {
    color: colors.pinkSoft,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  footer: { alignItems: "center", gap: 9, paddingTop: 3 },
  version: {
    color: colors.textTertiary,
    fontFamily: Fonts.regular,
    fontSize: 11,
  },
  discordButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  discordText: {
    color: colors.violetBright,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  signOutButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    borderCurve: "continuous",
    backgroundColor: "#3D1C1C",
    borderWidth: 1,
    borderColor: "#6B2E2E",
  },
  signOutText: {
    color: colors.danger,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  notice: {
    alignSelf: "center",
    color: colors.mintSoft,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  buttonPressed: { opacity: 0.72 },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalCard: {
    width: "100%",
    paddingTop: 25,
    paddingHorizontal: 22,
    alignItems: "center",
    gap: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: "#3D2030",
  },
  modalTitle: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 18,
  },
  modalMessage: {
    maxWidth: 330,
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  modalActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
  },
  modalCancel: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    color: colors.white,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  modalConfirm: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    borderCurve: "continuous",
    backgroundColor: colors.pink,
  },
  modalConfirmText: {
    color: colors.background,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
});
