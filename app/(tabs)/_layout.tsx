import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { triggerHaptic } from "@/lib/haptics";

function TabButton({ children, onPress, accessibilityState, accessibilityLabel }: BottomTabBarButtonProps) {
  const focused = accessibilityState?.selected ?? false;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      onPress={(event: GestureResponderEvent) => {
        void triggerHaptic("medium");
        onPress?.(event);
      }}
      style={styles.tabButton}
    >
      <View style={[styles.tabIcon, focused && styles.tabIconActive]}>{children}</View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: (props) => <TabButton {...props} />,
        tabBarStyle: [
          styles.tabBar,
          { height: 66 + insets.bottom, paddingBottom: insets.bottom + 6 },
        ],
        tabBarActiveTintColor: colors.violetBright,
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarAccessibilityLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          tabBarAccessibilityLabel: "Timeline",
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarAccessibilityLabel: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "rgba(10, 10, 15, 0.98)",
    borderTopColor: colors.borderSoft,
    borderTopWidth: 1,
    elevation: 0,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    width: 44,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  tabIconActive: {
    backgroundColor: "#211A35",
    shadowColor: colors.violet,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});
