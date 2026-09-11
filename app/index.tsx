import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@fastshot/auth";
import { colors } from "@/constants/theme";
import { Fonts } from "@/constants/Typography";
import { ErrorState } from "@/components/pulse-ui";
import { useAppStore } from "@/store/useAppStore";

export default function Index() {
  const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
  const hydrated = useAppStore((s) => s.hydrated);
  const isPaired = useAppStore((s) => s.user.isPaired);
  const error = useAppStore((s) => s.error);
  const clearError = useAppStore((s) => s.clearError);
  const initialize = useAppStore((s) => s.initialize);

  useEffect(() => {
    if (isAuthenticated && authUser?.id && !hydrated) {
      void initialize(authUser.id, authUser.email ?? undefined);
    }
  }, [isAuthenticated, authUser?.id, authUser?.email, hydrated, initialize]);

  // Still loading auth
  if (authLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.brand}>Pulse</Text>
        <ActivityIndicator color={colors.violet} />
      </View>
    );
  }

  // Not signed in → go to auth
  if (!isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  // Signed in but profile not loaded yet
  if (!hydrated) {
    return (
      <View style={styles.container}>
        <Text style={styles.brand}>Pulse</Text>
        <ActivityIndicator color={colors.violet} />
        <Text style={styles.hint}>Loading your profile...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return <ErrorState message={error} onRetry={clearError} />;
  }

  // Not paired yet → go to pairing
  if (!isPaired) {
    return <Redirect href="/pairing" />;
  }

  // All good → dashboard
  return <Redirect href="/(tabs)/dashboard" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    backgroundColor: colors.background,
  },
  brand: {
    color: colors.violetBright,
    fontFamily: Fonts.bold,
    fontSize: 40,
    letterSpacing: -1.4,
  },
  hint: {
    color: colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
});
