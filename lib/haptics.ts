import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import type { HapticIntensity } from "@/store/types";

export async function triggerHaptic(intensity: HapticIntensity): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    const style =
      intensity === "light"
        ? Haptics.ImpactFeedbackStyle.Light
        : intensity === "heavy"
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium;
    await Haptics.impactAsync(style);
  } catch {
    // Haptics can be unavailable in simulators and should never block the action.
  }
}
