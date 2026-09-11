import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { Fonts } from "@/constants/Typography";
import { ErrorState } from "@/components/pulse-ui";
import { useAppStore } from "@/store/useAppStore";

export default function Index() {
  const hydrated = useAppStore((state) => state.hydrated);
  const isAuthenticated = useAppStore((state) => state.user.isAuthenticated);
  const isPaired = useAppStore((state) => state.user.isPaired);
  const error = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);

  if (!hydrated) {
    return (
      <View style={styles.container}>
        <Text style={styles.brand}>Pulse</Text>
        <ActivityIndicator color={colors.violet} />
      </View>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={clearError} />;
  }

  if (!isAuthenticated || !isPaired) {
    return <Redirect href="/auth" />;
  }

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
});
