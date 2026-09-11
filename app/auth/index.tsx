import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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

type AuthMode = "login" | "signup";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const {
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    isLoading,
    error: authError,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setLocalError(null);
    clearError();
  }, [clearError]);

  const handleEmailAuth = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setLocalError("Enter your email and password to continue.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    setLocalError(null);
    void triggerHaptic("light");
    try {
      if (mode === "login") {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }
    } catch {
      setLocalError("Authentication failed. Please try again.");
    }
  }, [email, password, mode, signInWithEmail, signUpWithEmail]);

  const handleGoogle = useCallback(async () => {
    setLocalError(null);
    void triggerHaptic("light");
    try {
      await signInWithGoogle();
    } catch {
      setLocalError("Google sign-in could not be completed.");
    }
  }, [signInWithGoogle]);

  const handleApple = useCallback(async () => {
    setLocalError(null);
    void triggerHaptic("light");
    try {
      await signInWithApple();
    } catch {
      setLocalError("Apple sign-in could not be completed.");
    }
  }, [signInWithApple]);

  const displayError = localError || (authError?.message ?? null);

  return (
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
        <BrandMark />

        <View style={styles.authContent}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>A little closer, every day</Text>
            <Text style={styles.title}>
              Stay in sync{"\n"}without the noise.
            </Text>
            <Text style={styles.subtitle}>
              Small signals for the people who matter most.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </Text>
            <Text style={styles.formHint}>
              {mode === "login"
                ? "Sign in to reconnect with your person."
                : "Sign up to start your private little space."}
            </Text>

            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              value={email}
            />
            <TextInput
              autoCapitalize="none"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              style={styles.input}
              value={password}
            />

            {displayError ? (
              <Text selectable style={styles.formError}>
                {displayError}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isLoading}
              onPress={handleEmailAuth}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {mode === "login" ? "Sign In" : "Create Account"}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color={colors.background}
                  />
                </>
              )}
            </Pressable>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or continue with</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.socialRow}>
              <Pressable
                accessibilityRole="button"
                disabled={isLoading}
                onPress={handleApple}
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons name="logo-apple" size={18} color={colors.white} />
                <Text style={styles.socialText}>Apple</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isLoading}
                onPress={handleGoogle}
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons name="logo-google" size={17} color={colors.white} />
                <Text style={styles.socialText}>Google</Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={toggleMode}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>
                {mode === "login"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  authContent: {
    flex: 1,
    justifyContent: "center",
    gap: 28,
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
  formHint: {
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
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
  buttonPressed: {
    opacity: 0.72,
  },
  buttonDisabled: {
    opacity: 0.6,
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
    borderCurve: "continuous",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialText: {
    color: colors.white,
    fontFamily: Fonts.medium,
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
