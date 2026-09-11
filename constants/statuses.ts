import type { IconName } from "@/components/pulse-ui";

export interface StatusOption {
  id: string;
  icon: IconName;
  label: string;
}

export const statusOptions: StatusOption[] = [
  { id: "deep-work", icon: "book-outline", label: "Deep Work" },
  { id: "coffee-break", icon: "cafe-outline", label: "Coffee Break" },
  { id: "workout", icon: "barbell-outline", label: "Gym / Workout" },
  { id: "in-transit", icon: "car-outline", label: "In Transit" },
  { id: "locked-in", icon: "headset-outline", label: "Locked In" },
  { id: "thinking-of-you", icon: "heart-outline", label: "Thinking of You" },
  { id: "out-of-energy", icon: "battery-dead-outline", label: "Out of Energy" },
];
