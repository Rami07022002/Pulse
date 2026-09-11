import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@fastshot/auth";
import { colors, radii, shadows } from "@/constants/theme";
import { Fonts } from "@/constants/Typography";
import { triggerHaptic } from "@/lib/haptics";
import { usePairingListener } from "@/lib/use-realtime";
import { useAppStore } from "@/store/useAppStore";

// ── Radar animation ─────────────────────────────────────────────────
function Radar() {
  const ringOne = useRef(new Animated.Value(0)).current;
  const ringTwo = useRef(new Animated.Value(0)).current;
  const ringThree = useRef(new Animated.Value(0)).current;
  const rings = useMemo(
    () => [ringOne, ringTwo, ringThree],
    [ringOne, ringTwo, ringThree],
  );
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations = rings.map((ring, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 560),
          Animated.timing(ring, {
            toValue: 1,
            duration: 1900,
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    const sweepAnim = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 2600,
        useNativeDriver: true,
      }),
    );
    for (const a of animations) a.start();
    sweepAnim.start();
    return () => {
      for (const a of animations) a.stop();
      sweepAnim.stop();
    };
  }, [rings, sweep]);

  return (
    <View style={styles.radar}>
      {rings.map((ring, i) => (
        <Animated.View
          key={`ring-${i}`}
          pointerEvents="none"
          style={[
            styles.radarRing,
            {
              opacity: ring.interpolate({
                inputRange: [0, 0.15, 1],
                outputRange: [0.12, 0.6, 0],
              }),
              transform: [
                {
                  scale: ring.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 1],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.radarSweep,
          {
            transform: [
              {
                rotate: sweep.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          },
        ]}
      />
      <View style={styles.radarCore}>
        <Ionicons name="pulse" size={22} color={colors.violetBright} />
      </View>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────
export default function PairingScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, signOut } = useAuth();
  const isPaired = useAppStore((s) => s.user.isPaired);
  const pairingCode = useAppStore((s) => s.user.pairingCode);
  const userId = useAppStore((s) => s.user.userId);
  const error = useAppStore((s) => s.error);
  const pairWithPartner = useAppStore((s) => s.pairWithPartner);
  const initialize = useAppStore((s) => s.initialize);

  const [partnerCode, setPartnerCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isPairing, setIsPairing] = useState(false);

  const formattedCode = useMemo(
    () =>
      pairingCode
        ? `${pairingCode.slice(0, 3)}-${pairingCode.slice(3)}`
        : "---",
    [pairingCode],
  );

  // Listen for partner pairing via Realtime
  const handlePairingDetected = useCallback(async () => {
    if (userId) {
      await initialize(userId);
    }
    router.replace("/(tabs)/dashboard");
  }, [userId, initialize]);

  usePairingListener(handlePairingDetected);

  const handlePartnerCodeChange = useCallback((value: string) => {
    setPartnerCode(value.replace(/\D/g, ""));
    setLocalError(null);
  }, []);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      await Share.share({
        message: `Join me on Pulse with code ${formattedCode}. pulse://pair/${pairingCode}`,
        title: "Join me on Pulse",
      });
    } catch {
      setLocalError("The invite could not be shared.");
    } finally {
      setIsSharing(false);
    }
  }, [formattedCode, pairingCode]);

  const handlePair = useCallback(async () => {
    const cleaned = partnerCode.replace(/\D/g, "");
    if (cleaned.length !== 6) {
      setLocalError("Enter all six digits from your partner's invite.");
      return;
    }
    setLocalError(null);
    setIsPairing(true);
    try {
      const success = await pairWithPartner(cleaned);
      if (success) {
        void triggerHaptic("medium");
        router.replace("/(tabs)/dashboard");
      }
    } finally {
      setIsPairing(false);
    }
  }, [pairWithPartner, partnerCode]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      useAppStore.getState().reset();
      router.replace("/auth");
    } catch {
      setLocalError("Sign out failed.");
    }
  }, [signOut]);

  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  if (isPaired) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 28,
              paddingBottom: insets.bottom + 28,
            },
          ]}
        >
          <View style={styles.brandLockup}>
            <View style={styles.brandIcon}>
              <Ionicons name="pulse" size={25} color={colors.violetBright} />
            </View>
            <Text style={styles.brandText}>Pulse</Text>
          </View>

          <View style={styles.pairingContent}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>One more tiny step</Text>
              <Text style={styles.title}>Find your person.</Text>
              <Text style={styles.subtitle}>
                Share your code, or enter theirs to create your private little
                space.
              </Text>
            </View>

            <View style={styles.pairCard}>
              <Text style={styles.formTitle}>Your Pairing Code:</Text>
              <Text selectable style={styles.code}>
                {formattedCode}
              </Text>

              <Radar />
              <Text style={styles.waitingText}>Waiting for partner...</Text>

              <Pressable
                accessibilityRole="button"
                onPress={handleShare}
                style={({ pressed }) => [
                  styles.outlineButton,
                  pressed && styles.btnPressed,
                ]}
              >
                {isSharing ? (
                  <ActivityIndicator
                    color={colors.violetBright}
                    size="small"
                  />
                ) : (
                  <Ionicons
                    name="link-outline"
                    size={18}
                    color={colors.violetBright}
                  />
                )}
                <Text style={styles.outlineButtonText}>
                  {isSharing ? "Opening share sheet" : "Share Invite Link"}
                </Text>
              </Pressable>

              <TextInput
                autoCapitalize="none"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={handlePartnerCodeChange}
                placeholder="Enter Partner's Code"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
                value={partnerCode}
              />

              {localError ? (
                <Text style={styles.formError}>{localError}</Text>
              ) : null}
              {error ? (
                <Text selectable style={styles.formError}>
                  {error}
                </Text>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={isPairing}
                onPress={handlePair}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.btnPressed,
                  isPairing && styles.btnDisabled,
                ]}
              >
                {isPairing ? (
                  <ActivityIndicator
                    color={colors.background}
                    size="small"
                  />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>
                      Connect partner
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color={colors.background}
                    />
                  </>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleSignOut}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>
                  Sign out and start over
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 22,
    gap: 30,
  },
  brandLockup: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 9,
  },
  brandIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    borderCurve: "continuous",
    backgroundColor: "#201A32",
    borderWidth: 1,
    borderColor: "#493B70",
    ...shadows.violet,
  },
  brandText: {
    color: colors.violetBright,
    fontFamily: Fonts.bold,
    fontSize: 27,
    letterSpacing: -0.8,
  },
  pairingContent: { flex: 1, gap: 26 },
  heroCopy: { gap: 9 },
  eyebrow: {
    color: colors.pink,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: colors.white,
    fontFamily: Fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.2,
  },
  subtitle: {
    maxWidth: 360,
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 23,
  },
  pairCard: {
    alignItems: "center",
    gap: 13,
    padding: 20,
    borderRadius: radii.large,
    borderCurve: "continuous",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  formTitle: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 16,
  },
  code: {
    color: colors.violetBright,
    fontFamily: Fonts.bold,
    fontSize: 38,
    letterSpacing: 4,
    lineHeight: 46,
    textShadowColor: "rgba(167, 139, 250, 0.55)",
    textShadowRadius: 12,
  },
  radar: {
    width: 205,
    height: 205,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 3,
  },
  radarRing: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: colors.violet,
  },
  radarSweep: {
    position: "absolute",
    width: 94,
    height: 1,
    left: 103,
    top: 102,
    transformOrigin: "left center",
    backgroundColor: colors.violet,
    opacity: 0.72,
  },
  radarCore: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    backgroundColor: "#282040",
    borderWidth: 1,
    borderColor: colors.violet,
  },
  waitingText: {
    color: colors.white,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
  outlineButton: {
    width: "100%",
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "#181525",
    borderWidth: 1,
    borderColor: "#514276",
  },
  outlineButtonText: {
    color: colors.violetBright,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  input: {
    width: "100%",
    minHeight: 50,
    paddingHorizontal: 15,
    borderRadius: 14,
    borderCurve: "continuous",
    color: colors.white,
    fontFamily: Fonts.regular,
    fontSize: 14,
    backgroundColor: colors.backgroundRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formError: {
    color: colors.danger,
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  primaryButton: {
    width: "100%",
    minHeight: 52,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 15,
    borderCurve: "continuous",
    backgroundColor: colors.violet,
  },
  primaryButtonText: {
    color: colors.background,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  btnPressed: { opacity: 0.72 },
  btnDisabled: { opacity: 0.6 },
  secondaryAction: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
});
