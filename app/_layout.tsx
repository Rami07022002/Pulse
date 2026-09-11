import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { FontMap } from "@/constants/Typography";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppStore } from "@/store/useAppStore";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(FontMap);
  const completeHydration = useAppStore((state) => state.completeHydration);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    useAppStore.persist.setOptions({
      onRehydrateStorage: () => (_state, hydrationError) => {
        if (hydrationError) {
          useAppStore.setState({
            hydrated: true,
            error: "Your local Pulse data could not be loaded.",
          });
          return;
        }
        completeHydration();
      },
    });

    const rehydrate = async () => {
      try {
        await useAppStore.persist.rehydrate();
      } catch {
        useAppStore.setState({
          hydrated: true,
          error: "Your local Pulse data could not be loaded.",
        });
      }
    };
    void rehydrate();
  }, [completeHydration]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0A0A0F" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
