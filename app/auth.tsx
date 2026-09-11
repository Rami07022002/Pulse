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
import { colors, radii, shadows } from "@/constants/theme";
import { Fonts } from "@/constants/Typography";
import { triggerHaptic } from "@/lib/haptics";
import { useAppStore } from "@/store/useAppStore";

function BrandMark() {
  return (
    <View style={styles.brandLockup}>
      <View style={styles.brandIcon}>
        <Ionicons name="pulse" size={25} color={colors.violetBright} />
      </View>
      <Text style={styles.brandText}>Pulse</Text>
    </View>
  );
}

function Radar() {
  const ringOne = useRef(new Animated.Value(0)).current;
  const ringTwo = useRef(new Animated.Value(0)).current;
  const ringThree = useRef(new Animated.Value(0)).current;
  const rings = useMemo(() => [ringOne, ringTwo, ringThree], [ringOne, ringThree, ringTwo]);
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations = rings.map((ring, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 560),
          Animated.timing(ring, { toValue: 1, duration: 1900, useNativeDriver: true }),
          Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    const sweepAnimation = Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 2600, useNativeDriver: true }),
    );
    animations.forEach((animation) => {
      animation.start();
    });
    sweepAnimation.start();
    return () => {
      animations.forEach((animation) => {
        animation.stop();
      });
      sweepAnimation.stop();
    };
  }, [rings, sweep]);

  return (
    <View style={styles.radar}>
      {rings.map((ring, index) => (
        <Animated.View
          key={`radar-${index}`}
          pointerEvents="none"
          style={[
            styles.radarRing,
            {
              opacity: ring.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.12, 0.6, 0] }),
              transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
            },
          ]}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.radarSweep,
          {
            transform: [{ rotate: sweep.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }],
          },
        ]}
      />
      <View style={styles.radarCore}>
        <Ionicons name="pulse" size={22} color={colors.violetBright} />
      </View>
    </View>
  );
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const hydrated = useAppStore((state) => state.hydrated);
  const isAuthenticated = useAppStore((state) => state.user.isAuthenticated);
  const isPaired = useAppStore((state) => state.user.isPaired);
  const pairingCode = useAppStore((state) => state.user.pairingCode);
  const error = useAppStore((state) => state.error);
  const completeAuth = useAppStore((state) => state.completeAuth);
  const resetAuth = useAppStore((state) => state.resetAuth);
  const pairWithPartner = useAppStore((state) => state.pairWithPartner);
  const clearError = useAppStore((state) => state.clearError);
  const hapticIntensity = useAppStore((state) => state.user.hapticIntensity);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const formattedPairingCode = useMemo(
    () => `${pairingCode.slice(0, 3)}-${pairingCode.slice(3)}`,
    [pairingCode],
  );

  const handleContinue = useCallback(() => {
    const normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.length < 7) {
      setLocalError("Enter a valid phone number to continue.");
      return;
    }
    setLocalError(null);
    completeAuth(normalizedPhone, name);
    void triggerHaptic(hapticIntensity);
  }, [completeAuth, hapticIntensity, name, phone]);

  const handleSocialSignIn = useCallback(() => {
    completeAuth("", "Jamie");
    setLocalError(null);
    void triggerHaptic(hapticIntensity);
  }, [completeAuth, hapticIntensity]);

  const handlePartnerCodeChange = useCallback((value: string) => {
    setPartnerCode(value.replace(/\D/g, ""));
    setLocalError(null);
  }, []);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      await Share.share({
        message: `Join me on Pulse with code ${formattedPairingCode}. pulse://pair/${pairingCode}`,
        title: "Join me on Pulse",
      });
    } catch {
      setLocalError("The invite could not be shared. You can use the code above instead.");
    } finally {
      setIsSharing(false);
    }
  }, [formattedPairingCode, pairingCode]);

  const handlePair = useCallback(() => {
    if (partnerCode.replace(/\D/g, "").length !== 6) {
      setLocalError("Enter all six digits from your partner's invite.");
      return;
    }
    const paired = pairWithPartner(partnerCode);
    if (paired) {
      setLocalError(null);
      void triggerHaptic("medium");
      router.replace("/(tabs)/dashboard");
    }
  }, [pairWithPartner, partnerCode]);

  const handleRetry = useCallback(() => {
    setLocalError(null);
    clearError();
    if (isAuthenticated) {
      resetAuth();
    }
  }, [clearError, isAuthenticated, resetAuth]);

  if (!hydrated) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={colors.violet} />
      </View>
    );
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
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
        >
          <BrandMark />
          {!isAuthenticated ? (
            <View style={styles.authContent}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>A little closer, every day</Text>
                <Text style={styles.title}>Stay in sync{`\n`}without the noise.</Text>
                <Text style={styles.subtitle}>Small signals for the people who matter most.</Text>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Create your local profile</Text>
                <Text style={styles.formHint}>Nothing leaves this device in demo mode.</Text>
                <TextInput
                  autoCapitalize="words"
                  autoCorrect={false}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.input}
                  value={name}
                />
                <TextInput
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.input}
                  value={phone}
                />
                {localError ? <Text style={styles.formError}>{localError}</Text> : null}
                {error ? <Text selectable style={styles.formError}>{error}</Text> : null}
                <Pressable accessibilityRole="button" onPress={handleContinue} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={17} color={colors.background} />
                </Pressable>
                <View style={styles.orRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>or continue with</Text>
                  <View style={styles.orLine} />
                </View>
                <View style={styles.socialRow}>
                  <Pressable accessibilityRole="button" onPress={handleSocialSignIn} style={({ pressed }) => [styles.socialButton, pressed && styles.buttonPressed]}>
                    <Ionicons name="logo-apple" size={18} color={colors.white} />
                    <Text style={styles.socialText}>Apple</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={handleSocialSignIn} style={({ pressed }) => [styles.socialButton, pressed && styles.buttonPressed]}>
                    <Ionicons name="logo-google" size={17} color={colors.white} />
                    <Text style={styles.socialText}>Google</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.pairingContent}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>One more tiny step</Text>
                <Text style={styles.title}>Find your person.</Text>
                <Text style={styles.subtitle}>Share your code, or enter theirs to create your private little space.</Text>
              </View>
              <View style={styles.pairCard}>
                <Text style={styles.formTitle}>Your pairing code</Text>
                <Text selectable style={styles.code}>{formattedPairingCode}</Text>
                <Text style={styles.formHint}>Use this code on another local session to simulate a match.</Text>
                <Radar />
                <Text style={styles.waitingText}>Waiting for your partner</Text>
                <Pressable accessibilityRole="button" onPress={handleShare} style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}>
                  {isSharing ? <ActivityIndicator color={colors.violetBright} size="small" /> : <Ionicons name="link-outline" size={18} color={colors.violetBright} />}
                  <Text style={styles.outlineButtonText}>{isSharing ? "Opening share sheet" : "Share invite link"}</Text>
                </Pressable>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={handlePartnerCodeChange}
                  placeholder="Enter partner's code"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.input}
                  value={partnerCode}
                />
                {localError ? <Text style={styles.formError}>{localError}</Text> : null}
                {error ? <Text selectable style={styles.formError}>{error}</Text> : null}
                <Pressable accessibilityRole="button" onPress={handlePair} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.primaryButtonText}>Connect partner</Text>
                  <Ionicons name="arrow-forward" size={17} color={colors.background} />
                </Pressable>
                <Pressable accessibilityRole="button" onPress={handleRetry} style={styles.secondaryAction}>
                  <Text style={styles.secondaryActionText}>Start over with another number</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  authContent: {
    flex: 1,
    justifyContent: "center",
    gap: 28,
  },
  pairingContent: {
    flex: 1,
    gap: 26,
  },
  heroCopy: {
    gap: 9,
  },
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
  formCard: {
    gap: 13,
    padding: 20,
    borderRadius: radii.large,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  pairCard: {
    alignItems: "center",
    gap: 13,
    padding: 20,
    borderRadius: radii.large,
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
  formHint: {
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  input: {
    width: "100%",
    minHeight: 50,
    paddingHorizontal: 15,
    borderRadius: 14,
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
    minHeight: 52,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 15,
    backgroundColor: colors.violet,
  },
  primaryButtonText: {
    color: colors.background,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginVertical: 2,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    color: colors.textTertiary,
    fontFamily: Fonts.regular,
    fontSize: 11,
  },
  socialRow: {
    flexDirection: "row",
    gap: 10,
  },
  socialButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialText: {
    color: colors.white,
    fontFamily: Fonts.medium,
    fontSize: 13,
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
    backgroundColor: "#181525",
    borderWidth: 1,
    borderColor: "#514276",
  },
  outlineButtonText: {
    color: colors.violetBright,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
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
